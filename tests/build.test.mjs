import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { loadContent } from '../src/content/load-content.mjs';
import { REQUIRED_ROUTES, SVEDEN_REQUIRED_ROUTES } from '../src/content/required-routes.mjs';
import { collectPublicRoutes } from '../src/content/validate.mjs';
import { publicContentHref } from '../src/i18n/routing.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const distRoot = join(projectRoot, 'dist');
const content = await loadContent({ env: { CONTENT_ADAPTER: 'local' }, cwd: projectRoot });
const publicRoutes = collectPublicRoutes(content);
const { svedenSections } = content;
const localeSpecs = [
  { id: 'ru', prefix: '', htmlLang: 'ru', hreflang: 'ru' },
  { id: 'en', prefix: '/en', htmlLang: 'en', hreflang: 'en' },
  { id: 'zh', prefix: '/zh', htmlLang: 'zh-CN', hreflang: 'zh-CN' }
];
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

function localizedRoute(prefix, route) {
  if (route === '/') return prefix ? `${prefix}/` : '/';
  return `${prefix}${route}`;
}

function linkTag(html, attributes) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((tag) => Object.entries(attributes).every(([name, value]) => tag.includes(`${name}="${value}"`)));
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
  assert.equal(publicRoutes.length, 73, 'the local content adapter logical route count changed');
  assert.ok(existsSync(distRoot), 'dist/ is missing; run npm run build first');

  const generatedRouteFiles = htmlFiles(distRoot).filter((file) => !file.endsWith('404.html'));
  assert.equal(generatedRouteFiles.length, publicRoutes.length * localeSpecs.length, 'unexpected number of generated route documents');

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

test('English and Chinese routes are fully localized server documents with route-preserving language alternates', () => {
  const canonicalBase = content.site.baseUrl.replace(/\/$/, '');
  const representativeRoutes = ['/', '/sveden/common/'];

  for (const locale of localeSpecs) {
    for (const logicalRoute of publicRoutes) {
      const route = localizedRoute(locale.prefix, logicalRoute);
      const html = readRoute(route);
      const canonical = linkTag(html, { rel: 'canonical' })?.match(/href="([^"]+)"/i)?.[1];
      const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';

      assert.match(html, new RegExp(`^<!doctype html>\\s*<html lang="${locale.htmlLang.replace('-', '\\-')}"`), `${route}: wrong html lang`);
      assert.equal(canonical, `${canonicalBase}${route}`, `${route}: canonical must be self-referencing`);
      assert.ok(stripMarkup(main).length >= 100, `${route}: localized main content is not server-rendered`);
      const internalMainLinks = [...main.matchAll(/\bhref="(\/[^"]*)"/gi)]
        .map((match) => match[1])
        .filter((href) => !href.startsWith('/assets/'));
      assert.ok(
        internalMainLinks.every((href) => locale.prefix ? href.startsWith(`${locale.prefix}/`) : !/^\/(?:en|zh)(?:\/|$)/.test(href)),
        `${route}: main content contains an internal link outside its locale`
      );
      if (locale.id !== 'ru') {
        assert.doesNotMatch(main, /[А-Яа-яЁё]/, `${route}: untranslated Cyrillic remains in localized main`);
      }

      for (const alternate of localeSpecs) {
        const alternateRoute = localizedRoute(alternate.prefix, logicalRoute);
        const expectedHref = `${canonicalBase}${alternateRoute}`;
        assert.ok(
          linkTag(html, { rel: 'alternate', hreflang: alternate.hreflang, href: expectedHref }),
          `${route}: missing ${alternate.hreflang} alternate for ${alternateRoute}`
        );
      }
      assert.ok(
        linkTag(html, { rel: 'alternate', hreflang: 'x-default', href: `${canonicalBase}${logicalRoute}` }),
        `${route}: missing Russian x-default alternate`
      );
    }

    for (const logicalRoute of representativeRoutes) {
      const route = localizedRoute(locale.prefix, logicalRoute);
      const html = readRoute(route);
      const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] || '';
      assert.match(header, /class="nav-item nav-language-item"/, `${route}: language selector is missing from the header navigation`);
      for (const alternate of localeSpecs) {
        const target = localizedRoute(alternate.prefix, logicalRoute);
        assert.ok(header.includes(`href="${target}"`), `${route}: language selector does not preserve ${logicalRoute} for ${alternate.id}`);
      }
    }
  }

  const englishHome = readRoute('/en/');
  assert.ok(englishHome.includes('href="/en/education/"'));
  assert.ok(englishHome.includes('href="/en/news/"'));
  const englishDisclosure = readRoute('/en/sveden/common/');
  assert.ok(englishDisclosure.includes('href="/en/sveden/"'));
  assert.ok(englishDisclosure.includes('href="/en/sveden/managers/"'));

  const chineseHome = readRoute('/zh/');
  assert.ok(chineseHome.includes('href="/zh/education/"'));
  assert.ok(chineseHome.includes('href="/zh/news/"'));
  const chineseDisclosure = readRoute('/zh/sveden/common/');
  assert.ok(chineseDisclosure.includes('href="/zh/sveden/"'));
  assert.ok(chineseDisclosure.includes('href="/zh/sveden/managers/"'));
});

test('locale routing prefixes pages but preserves deployment-wide files', () => {
  assert.equal(publicContentHref('en', '/news/'), '/en/news/');
  assert.equal(publicContentHref('zh', '/sveden/common/'), '/zh/sveden/common/');
  assert.equal(publicContentHref('en', '/uploads/order.pdf'), '/uploads/order.pdf');
  assert.equal(publicContentHref('zh', '/assets/files/report.docx'), '/assets/files/report.docx');
  assert.equal(publicContentHref('en', 'https://example.edu/file.pdf'), 'https://example.edu/file.pdf');
});

test('search indexes, web manifests and RSS feeds are emitted per locale', () => {
  for (const locale of localeSpecs) {
    const searchFile = join(distRoot, locale.prefix.replace(/^\//, ''), 'search-index.json');
    const manifestFile = join(distRoot, locale.prefix.replace(/^\//, ''), 'manifest.webmanifest');
    const rssFile = join(distRoot, locale.prefix.replace(/^\//, ''), 'rss.xml');

    for (const file of [searchFile, manifestFile, rssFile]) {
      assert.ok(existsSync(file), `${file}: localized service file is missing`);
      assert.ok(statSync(file).size > 0, `${file}: localized service file is empty`);
    }

    const searchIndex = JSON.parse(readFileSync(searchFile, 'utf8'));
    assert.ok(searchIndex.length > publicRoutes.length / 2, `${locale.id}: search index is unexpectedly small`);
    assert.ok(searchIndex.every((item) => item.title && item.description && item.url), `${locale.id}: search item is incomplete`);
    assert.ok(searchIndex.every((item) => locale.prefix ? item.url.startsWith(`${locale.prefix}/`) : !/^\/(?:en|zh)(?:\/|$)/.test(item.url)), `${locale.id}: search URL escaped its locale`);

    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    assert.equal(manifest.lang, locale.htmlLang, `${locale.id}: wrong manifest language`);
    assert.equal(manifest.start_url, localizedRoute(locale.prefix, '/'), `${locale.id}: wrong manifest start URL`);
    assert.ok(readRoute(localizedRoute(locale.prefix, '/')).includes(`rel="manifest" href="${localizedRoute(locale.prefix, '/manifest.webmanifest')}"`), `${locale.id}: page does not reference its localized manifest`);

    const rss = readFileSync(rssFile, 'utf8');
    assert.ok(rss.includes(`<language>${locale.htmlLang}</language>`), `${locale.id}: wrong RSS language`);
    assert.ok(rss.includes(`<link>${content.site.baseUrl}${localizedRoute(locale.prefix, '/news/')}</link>`), `${locale.id}: wrong RSS channel URL`);
    if (locale.id !== 'ru') {
      assert.doesNotMatch(JSON.stringify(searchIndex), /[А-Яа-яЁё]/, `${locale.id}: search index contains untranslated Cyrillic`);
      assert.doesNotMatch(rss, /[А-Яа-яЁё]/, `${locale.id}: RSS contains untranslated Cyrillic`);
    }
  }
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
  assert.match(html, /<header[\s\S]*?<img[^>]+class="brand-logo"[^>]+src="\/assets\/images\/brhk-logo-full\.png"[^>]+width="1705"[^>]+height="677"/i);
  assert.match(html, /<footer[\s\S]*?<img[^>]+class="footer-logo"[^>]+src="\/assets\/images\/brhk-logo-full\.png"[^>]+width="1705"[^>]+height="677"/i);
  assert.doesNotMatch(html.match(/<header[\s\S]*?<\/header>/i)?.[0] || '', /brand-text/);

  const stylesheet = html.match(/<link\s+rel="stylesheet"\s+href="([^"]+)"/i)?.[1];
  const script = html.match(/<script\s+defer\s+src="([^"]+)"/i)?.[1];
  assert.match(stylesheet || '', /^\/assets\/site\.[a-f0-9]{12}\.css$/);
  assert.match(script || '', /^\/assets\/site\.[a-f0-9]{12}\.js$/);

  const requiredAssets = [
    stylesheet,
    script,
    '/assets/images/brhk-logo-full.png',
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

  const logoBytes = readFileSync(join(distRoot, 'assets', 'images', 'brhk-logo-full.png'));
  assert.equal(logoBytes.byteLength, 87883, 'full logo byte length changed');
  assert.equal(
    createHash('sha256').update(logoBytes).digest('hex'),
    'def5b0dfc87068369a21a6adb82bb999f57eb6a49f14e7d36336e2ce9ae22866',
    'full client-provided logo must be emitted byte-for-byte'
  );
});

test('Vercel applies security and cache headers before filesystem and localized 404 routes', () => {
  const config = JSON.parse(readFileSync(join(projectRoot, 'vercel.json'), 'utf8'));
  const routes = config.routes || [];
  const filesystemIndex = routes.findIndex((route) => route.handle === 'filesystem');
  assert.ok(filesystemIndex > 0, 'filesystem phase must follow response-header routes');
  const preFilesystem = routes.slice(0, filesystemIndex);
  assert.ok(preFilesystem.every((route) => route.continue === true && route.headers), 'header routes must continue into filesystem routing');
  assert.ok(preFilesystem.some((route) => route.headers['Content-Security-Policy']), 'security headers are missing');
  assert.ok(preFilesystem.some((route) => route.src.includes('assets/media') && /immutable/.test(route.headers['Cache-Control'] || '')), 'hashed media cache route is missing');
  assert.deepEqual(routes.slice(-3).map(({ src, status, dest }) => ({ src, status, dest })), [
    { src: '/en(?:/.*)?', status: 404, dest: '/en/404.html' },
    { src: '/zh(?:/.*)?', status: 404, dest: '/zh/404.html' },
    { src: '/.*', status: 404, dest: '/404.html' }
  ]);
});

test('sitemap contains 219 unique localized URLs with complete language alternates', () => {
  const sitemap = readFileSync(join(distRoot, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedRouteCount = publicRoutes.length * localeSpecs.length;
  assert.equal(locations.length, expectedRouteCount);
  assert.equal(new Set(locations).size, expectedRouteCount);

  for (const logicalRoute of publicRoutes) {
    for (const locale of localeSpecs) {
      const route = localizedRoute(locale.prefix, logicalRoute);
      assert.ok(locations.some((location) => new URL(location).pathname === route), `${route}: absent from sitemap`);
    }
  }

  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  assert.equal(entries.length, expectedRouteCount);
  for (const entry of entries) {
    const location = entry.match(/<loc>([^<]+)<\/loc>/)?.[1] || '(unknown)';
    for (const locale of localeSpecs) {
      assert.match(entry, new RegExp(`<xhtml:link rel="alternate" hreflang="${locale.hreflang}" href="[^"]+"\/>`), `${location}: missing ${locale.hreflang} sitemap alternate`);
    }
    assert.match(entry, /<xhtml:link rel="alternate" hreflang="x-default" href="[^"]+"\/>/, `${location}: missing x-default sitemap alternate`);
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
  assert.deepEqual(manifest.locales, localeSpecs.map((locale) => locale.id));
  assert.equal(manifest.logicalRouteCount, publicRoutes.length);
  assert.equal(manifest.routeCount, publicRoutes.length * localeSpecs.length);
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
    assert.deepEqual(manifest.locales, ['ru'], 'JSON adapter must remain Russian-only unless CONTENT_LOCALES is explicitly set');
    assert.equal(manifest.logicalRouteCount, publicRoutes.length + 1);
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

test('a non-Russian locale can be built independently with a complete manifest', { concurrency: false }, () => {
  const runBuild = (env) => spawnSync(process.execPath, ['build.mjs'], {
    cwd: projectRoot,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  const buildFailure = (result) => [result.stdout, result.stderr].filter(Boolean).join('\n');

  try {
    const result = runBuild({
      ...process.env,
      CONTENT_ADAPTER: 'local',
      CONTENT_LOCALES: 'en',
      ALLOW_INDEXING: 'false'
    });
    assert.equal(result.status, 0, `English-only build failed:\n${buildFailure(result)}`);

    const manifest = JSON.parse(readFileSync(join(distRoot, 'content-manifest.json'), 'utf8'));
    assert.deepEqual(manifest.locales, ['en']);
    assert.equal(manifest.logicalRouteCount, publicRoutes.length);
    assert.equal(manifest.routeCount, publicRoutes.length);
    assert.equal(manifest.media.length, content.media.length);
    const homeHtml = readFileSync(join(distRoot, 'en', 'index.html'), 'utf8');
    assert.match(homeHtml, /^<!doctype html>\s*<html lang="en"/);
    assert.doesNotMatch(homeHtml, /hreflang="x-default"/, 'English-only build must not point x-default at an unbuilt Russian route');
    for (const fallback of ['404.html', join('en', '404.html'), join('zh', '404.html')]) {
      assert.ok(existsSync(join(distRoot, fallback)), `locale-subset build is missing stable fallback ${fallback}`);
    }
  } finally {
    const localEnv = { ...process.env, CONTENT_ADAPTER: 'local', ALLOW_INDEXING: 'false' };
    delete localEnv.CONTENT_LOCALES;
    const restored = runBuild(localEnv);
    assert.equal(restored.status, 0, `Failed to restore the default locale build:\n${buildFailure(restored)}`);
  }
});
