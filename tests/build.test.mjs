import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { loadContent } from '../src/content/load-content.mjs';
import { REQUIRED_ROUTES, SVEDEN_REQUIRED_ROUTES } from '../src/content/required-routes.mjs';
import { collectPublicRoutes } from '../src/content/validate.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const distRoot = join(projectRoot, 'dist');
const content = await loadContent({ env: { CONTENT_ADAPTER: 'local' }, cwd: projectRoot });
const publicRoutes = collectPublicRoutes(content);
const { svedenSections } = content;
const forbiddenLoaderMarkers = [
  'raw.githubusercontent.com',
  '<div id="app"></div>',
  'Загружаем интерфейс',
  'data-boot="loading"'
];

function routeFile(route) {
  if (route === '/') return join(distRoot, 'index.html');
  return join(distRoot, route.replace(/^\/+|\/+$/g, ''), 'index.html');
}

function readRoute(route) {
  const file = routeFile(route);
  assert.ok(existsSync(file), `${route}: generated HTML is missing at ${file}`);
  return readFileSync(file, 'utf8');
}

function stripMarkup(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:[a-z]+|#\d+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(file);
    return entry.isFile() && entry.name.endsWith('.html') ? [file] : [];
  });
}

function filesRecursively(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? filesRecursively(file) : [file];
  });
}

function builtTarget(url) {
  const pathname = decodeURIComponent(new URL(url, 'https://local.invalid').pathname);
  if (pathname === '/') return join(distRoot, 'index.html');
  const direct = join(distRoot, pathname.replace(/^\/+/, ''));
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  return join(direct, 'index.html');
}

test('build emits every unique filled route supplied by the content adapter', () => {
  assert.equal(new Set(publicRoutes).size, publicRoutes.length);
  assert.ok(existsSync(distRoot), 'dist/ is missing; run npm run build first');

  const generatedRouteFiles = htmlFiles(distRoot).filter((file) => !file.endsWith('404.html'));
  assert.equal(generatedRouteFiles.length, publicRoutes.length, 'unexpected number of generated route documents');

  const titles = new Set();
  for (const route of publicRoutes) {
    const html = readRoute(route);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]?.trim();
    const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';

    assert.ok(html.startsWith('<!doctype html>'), `${route}: missing HTML doctype`);
    assert.ok(title, `${route}: missing title`);
    assert.ok(description, `${route}: missing meta description`);
    assert.ok(canonical?.endsWith(route), `${route}: canonical does not match route`);
    assert.equal(h1Count, 1, `${route}: expected exactly one h1`);
    assert.ok(stripMarkup(main).length >= 100, `${route}: main content is not filled in server HTML`);
    assert.ok(!titles.has(title), `${route}: duplicate title: ${title}`);
    titles.add(title);

    for (const marker of forbiddenLoaderMarkers) {
      assert.ok(!html.includes(marker), `${route}: forbidden runtime-loader marker: ${marker}`);
    }
  }

  for (const route of REQUIRED_ROUTES) assert.ok(publicRoutes.includes(route), `${route}: required route absent`);
});

test('404 is a filled standalone noindex document', () => {
  const file = join(distRoot, '404.html');
  assert.ok(existsSync(file), 'dist/404.html is missing');
  const html = readFileSync(file, 'utf8');
  assert.match(html, /<h1[^>]*>Страница не найдена<\/h1>/i);
  assert.match(html, /<meta\s+name="robots"\s+content="noindex, nofollow"/i);
  assert.ok(stripMarkup(html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '').length >= 80);
  for (const marker of forbiddenLoaderMarkers) assert.ok(!html.includes(marker));
});

test('no generated text asset contains the raw GitHub runtime loader', () => {
  const textExtensions = new Set(['.css', '.html', '.js', '.json', '.txt', '.webmanifest', '.xml']);
  const textFiles = filesRecursively(distRoot).filter((file) => {
    const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
    return textExtensions.has(extension);
  });
  assert.ok(textFiles.length > 36);
  for (const file of textFiles) {
    const content = readFileSync(file, 'utf8');
    for (const marker of forbiddenLoaderMarkers) {
      assert.ok(!content.includes(marker), `${file}: forbidden runtime-loader marker: ${marker}`);
    }
  }
});

test('mandatory sveden routes and education hierarchy are preserved', () => {
  assert.equal(svedenSections.filter((section) => section.group === 'mandatory').length, 14);
  assert.ok(svedenSections.length >= SVEDEN_REQUIRED_ROUTES.length);
  const indexHtml = readRoute('/sveden/');
  for (const route of SVEDEN_REQUIRED_ROUTES) {
    const section = svedenSections.find((item) => item.href === route);
    assert.ok(section, `${route}: mandatory section data is missing`);
    assert.equal(section.group, 'mandatory', `${route}: wrong disclosure group`);
    assert.ok(existsSync(routeFile(route)), `${route}: mandatory route is missing`);
  }
  for (const section of svedenSections) {
    assert.ok(indexHtml.includes(`href="${section.href}"`), `${section.href}: missing from /sveden/ index`);
  }

  const education = readRoute('/education/');
  assert.match(education, /Школа креативных индустрий/);
  assert.match(education, /ШКИ/);
  assert.match(education, /Балет для всех/);
  assert.match(education, /class="education-program-list education-program-list-additional"/);
  assert.ok(education.includes('href="/creative-industries/"'));
  assert.ok(education.includes('href="/ballet-for-all/"'));

  for (const route of publicRoutes) {
    assert.ok(!readRoute(route).includes('Новые проекты'), `${route}: removed block title returned`);
  }
});

test('hierarchical navigation and service pages are present in server HTML', () => {
  const home = readRoute('/');
  assert.match(home, /<details class="nav-disclosure[^>]*" data-nav-disclosure>/);
  assert.match(home, /<summary data-nav-summary><span>Сведения<\/span>/);
  assert.ok(home.includes('href="/students/psychological-service/"'));
  assert.ok(home.includes('href="/documents/sout/"'));
  assert.ok(home.includes('href="/culture-for-schoolchildren/"'));
  assert.ok(home.includes('href="/resources/ballet-buryatia-dictionary/"'));

  const sveden = readRoute('/sveden/');
  assert.match(sveden, /Обязательные подразделы/);
  assert.match(sveden, /Сервисы и открытость/);
  assert.ok(sveden.includes('href="/sveden/managers/"'));
  assert.ok(sveden.includes('href="/sveden/ovz/"'));

  const detail = readRoute('/students/psychological-service/');
  assert.match(detail, /aria-label="Разделы сведений"/);
  assert.match(detail, /Утверждённые материалы не переданы для публикации/);
  assert.doesNotMatch(detail, /Яковлева Оксана Борисовна/);

  const siteMap = readRoute('/sitemap/');
  for (const route of REQUIRED_ROUTES) {
    if (route === '/') continue;
    assert.ok(siteMap.includes(`href="${route}"`) || route.startsWith('/news/'), `${route}: missing from HTML site map`);
  }
});

test('global useful resources and footer social links are server-rendered', () => {
  const html = readRoute('/');
  const usefulStart = html.indexOf('<section class="useful-links"');
  const quickStart = html.indexOf('<section class="quick-links"');
  const footerStart = html.indexOf('<footer class="site-footer"');
  assert.ok(usefulStart >= 0, 'useful links section is missing');
  assert.ok(usefulStart < quickStart && quickStart < footerStart, 'global lower-page sections are out of order');

  const usefulMarkup = html.slice(usefulStart, quickStart);
  const usefulLinks = [
    ['https://bus.gov.ru/qrcode/rate/231927?agencyId=232834', 'Оцените условия оказания услуг'],
    ['https://minkultrb.ru/', 'Министерство культуры Республики Бурятия'],
    ['https://edu.gov.ru/', 'Министерство просвещения Российской Федерации'],
    ['https://egov-buryatia.ru/minobr/', 'Министерство образования и науки Республики Бурятия'],
    ['https://culture.gov.ru/', 'Министерство культуры Российской Федерации']
  ];
  assert.equal((usefulMarkup.match(/class="useful-link-card(?:\s|"|$)/g) || []).length, usefulLinks.length);
  for (const [href, label] of usefulLinks) {
    assert.ok(usefulMarkup.includes(`href="${href}" rel="external"`), `${href}: useful link is missing`);
    assert.ok(usefulMarkup.includes(`>${label}</strong>`), `${href}: useful link label is missing`);
  }

  const footerMarkup = html.slice(footerStart);
  assert.match(html, /href="https:\/\/edu\.gov\.ru\/" rel="external">Минпросвещения России<\/a>/);
  assert.match(html, /href="https:\/\/minobrnauki\.gov\.ru\/" rel="external">Минобрнауки России<\/a>/);
  assert.match(footerMarkup, /<strong class="footer-social-title">Социальные сети<\/strong>/);
  assert.match(footerMarkup, /href="https:\/\/vk\.ru\/uubrhk03" rel="external">БРХК во ВКонтакте<\/a>/);
  assert.match(footerMarkup, /href="https:\/\/max\.ru\/id323070083_gos" rel="external">БРХК в MAX<\/a>/);
});

test('official logo, favicon and hashed first-party assets are emitted', () => {
  const html = readRoute('/');
  assert.match(html, /<link\s+rel="icon"[^>]+href="\/assets\/icons\/favicon-32\.png"/i);
  assert.match(html, /<header[\s\S]*?<img[^>]+class="brand-logo"[^>]+src="\/assets\/images\/brhk-monogram\.png"[^>]+width="756"[^>]+height="410"/i);
  assert.match(html, /<footer[\s\S]*?<img[^>]+class="footer-logo"[^>]+src="\/assets\/images\/brhk-monogram\.png"[^>]+width="756"[^>]+height="410"/i);
  assert.doesNotMatch(html.match(/<header[\s\S]*?<\/header>/i)?.[0] || '', /brand-text/);

  const stylesheet = html.match(/<link\s+rel="stylesheet"\s+href="([^"]+)"/i)?.[1];
  const script = html.match(/<script\s+defer\s+src="([^"]+)"/i)?.[1];
  assert.match(stylesheet || '', /^\/assets\/site\.[a-f0-9]{12}\.css$/);
  assert.match(script || '', /^\/assets\/site\.[a-f0-9]{12}\.js$/);

  const requiredAssets = [
    stylesheet,
    script,
    '/assets/images/brhk-monogram.png',
    '/assets/icons/favicon-32.png',
    '/manifest.webmanifest',
    '/sitemap.xml',
    '/rss.xml',
    '/robots.txt'
  ];
  for (const asset of requiredAssets) {
    assert.ok(asset, 'required asset URL was not found');
    const file = join(distRoot, asset.slice(1));
    assert.ok(existsSync(file), `${asset}: asset is missing`);
    assert.ok(statSync(file).size > 0, `${asset}: asset is empty`);
  }
});

test('sitemap contains every public route once', () => {
  const sitemap = readFileSync(join(distRoot, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locations.length, publicRoutes.length);
  assert.equal(new Set(locations).size, publicRoutes.length);
  for (const route of publicRoutes) {
    assert.ok(locations.some((location) => new URL(location).pathname === route), `${route}: absent from sitemap`);
  }
});

test('handoff route map documents every public route exactly once', () => {
  const routeMap = readFileSync(join(projectRoot, 'docs', 'ROUTE-MAP.csv'), 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => line.match(/^"([^"]+)"/)?.[1]);

  assert.ok(routeMap.every(Boolean), 'ROUTE-MAP.csv contains a row without a quoted route');
  assert.equal(new Set(routeMap).size, routeMap.length, 'ROUTE-MAP.csv contains duplicate routes');
  assert.deepEqual([...routeMap].sort(), [...publicRoutes].sort());
});

test('content media is fingerprinted and the public manifest exposes safe provenance metadata', () => {
  const manifest = JSON.parse(readFileSync(join(distRoot, 'content-manifest.json'), 'utf8'));
  assert.equal(manifest.routeCount, publicRoutes.length);
  assert.equal(manifest.collections.news, content.newsItems.length);
  assert.equal(manifest.collections.media, content.media.length);
  assert.ok(manifest.media.every((asset) => /^\/assets\/media\/[a-z0-9-]+\.[a-f0-9]{12}\.(?:avif|gif|jpe?g|png|webp)$/.test(asset.src)));
  assert.ok(manifest.media.every((asset) => ['repository', 'external'].includes(asset.provenance) && asset.originalName && asset.rightsStatus));
  assert.ok(manifest.media.every((asset) => !Object.hasOwn(asset, 'source')));

  const news = readRoute('/news/');
  assert.match(news, /data-media-id="initiation014Portrait"/);
  assert.match(news, /class="editorial-card is-square is-no-media"/);
  assert.ok(!news.includes('/assets/images/studio-tutu'));
});

test('every internal link, image and generated asset resolves in dist', () => {
  const failures = [];
  for (const file of htmlFiles(distRoot)) {
    const html = readFileSync(file, 'utf8');
    const urls = [
      ...[...html.matchAll(/\b(?:href|src)="([^"]+)"/gi)].map((match) => match[1]),
      ...[...html.matchAll(/\bsrcset="([^"]+)"/gi)].flatMap((match) =>
        match[1].split(',').map((candidate) => candidate.trim().split(/\s+/)[0])
      )
    ];

    for (const url of urls) {
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      const target = builtTarget(url);
      if (!existsSync(target)) failures.push(`${file}: ${url}`);
    }
  }
  assert.deepEqual(failures, [], `broken internal references:\n${failures.join('\n')}`);
});

test('json adapter drives the complete build and renders CMS collections into server HTML', { concurrency: false }, () => {
  const fixtureFile = join(projectRoot, `.tmp-content-adapter-json-${process.pid}.json`);
  const event = {
    id: 'json-build-event',
    slug: 'json-build-event',
    href: '/events/json-build-event/',
    title: 'JSON CMS: открытый показ',
    description: 'Интеграционная запись афиши из JSON-экспорта.',
    category: 'Показ',
    publishedAt: '2026-08-27',
    startsAt: '2026-09-01T18:00:00+08:00',
    date: '1 сентября 2026',
    status: 'published',
    body: [
      { type: 'heading', level: 2, text: 'Программа из CMS' },
      { type: 'paragraph', text: 'Эта фраза должна попасть в готовый HTML без клиентского рендера.' }
    ]
  };
  const employee = {
    id: 'json-build-employee',
    name: 'Тестовый сотрудник JSON CMS',
    position: 'Интеграционная должность',
    department: 'Проверка передачи данных',
    status: 'published'
  };
  const document = {
    id: 'json-build-document',
    title: 'Тестовый документ JSON CMS',
    href: 'https://cms.invalid/documents/integration-order.pdf',
    fileType: 'PDF',
    updatedAt: '2026-08-27',
    status: 'live'
  };
  const jsonContent = structuredClone(content);
  jsonContent.newsItems[0].gallery = [{
    image: 'initiation043Landscape',
    alt: 'Интеграционная фотография из media registry',
    caption: 'Галерея из JSON CMS'
  }];
  jsonContent.events = [...jsonContent.events, event];
  jsonContent.employees = [...jsonContent.employees, employee];
  jsonContent.documents = [...jsonContent.documents, document];
  jsonContent.svedenSections = jsonContent.svedenSections.map((section) => section.href === '/sveden/common/'
    ? {
        ...section,
        status: 'published',
        body: [
          { type: 'heading', level: 2, text: 'Сведения из JSON CMS' },
          { type: 'paragraph', text: 'Проверенное содержимое обязательного раздела отдано серверным HTML.' },
          { type: 'list', items: ['Значение из CMS', 'Дата актуализации из CMS'] }
        ]
      }
    : section);

  const runBuild = (env) => spawnSync(process.execPath, ['build.mjs'], {
    cwd: projectRoot,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  const buildFailure = (result) => [result.stdout, result.stderr].filter(Boolean).join('\n');

  try {
    writeFileSync(fixtureFile, `${JSON.stringify(jsonContent, null, 2)}\n`, 'utf8');
    const result = runBuild({
      ...process.env,
      CONTENT_ADAPTER: 'json',
      CMS_CONTENT_FILE: fixtureFile,
      SITE_URL: 'https://json-build.invalid',
      ALLOW_INDEXING: 'false'
    });
    assert.equal(result.status, 0, `JSON adapter build failed:\n${buildFailure(result)}`);

    const eventDetail = readRoute(event.href);
    assert.match(eventDetail, /data-cms-item="event"/);
    assert.match(eventDetail, /JSON CMS: открытый показ/);
    assert.match(eventDetail, /Программа из CMS/);
    assert.match(eventDetail, /Эта фраза должна попасть в готовый HTML без клиентского рендера\./);

    const newsDetail = readRoute(jsonContent.newsItems[0].href);
    assert.match(newsDetail, /data-cms-field="gallery"/);
    assert.match(newsDetail, /Галерея из JSON CMS/);
    assert.match(newsDetail, /data-media-id="initiation043Landscape"/);

    const eventsListing = readRoute('/events/');
    assert.match(eventsListing, /data-cms-collection="events"/);
    assert.ok(eventsListing.includes(`href="${event.href}"`));
    assert.match(eventsListing, /JSON CMS: открытый показ/);

    const employeesPage = readRoute('/sveden/employees/');
    assert.match(employeesPage, /data-cms-collection="employees"/);
    assert.match(employeesPage, /Тестовый сотрудник JSON CMS/);
    assert.match(employeesPage, /Интеграционная должность/);

    const documentsPage = readRoute('/documents/');
    assert.match(documentsPage, /Тестовый документ JSON CMS/);
    assert.ok(documentsPage.includes(`href="${document.href}"`));
    assert.match(documentsPage, /Обновлено: 2026-08-27/);

    const svedenPage = readRoute('/sveden/common/');
    assert.match(svedenPage, /Сведения из JSON CMS/);
    assert.match(svedenPage, /Проверенное содержимое обязательного раздела отдано серверным HTML\./);
    assert.match(svedenPage, /<li>Значение из CMS<\/li>/);

    const manifest = JSON.parse(readFileSync(join(distRoot, 'content-manifest.json'), 'utf8'));
    assert.equal(manifest.adapter, 'json');
    assert.equal(manifest.collections.events, jsonContent.events.length);
    assert.equal(manifest.collections.employees, jsonContent.employees.length);
    assert.equal(manifest.collections.documents, jsonContent.documents.length);
    assert.equal(manifest.routeCount, publicRoutes.length + 1);
    assert.match(readFileSync(join(distRoot, 'sitemap.xml'), 'utf8'), /\/events\/json-build-event\//);
  } finally {
    rmSync(fixtureFile, { force: true });
    const localEnv = { ...process.env, CONTENT_ADAPTER: 'local', ALLOW_INDEXING: 'false' };
    delete localEnv.CMS_CONTENT_FILE;
    const restored = runBuild(localEnv);
    assert.equal(restored.status, 0, `Failed to restore the local build after JSON adapter test:\n${buildFailure(restored)}`);
  }
});
