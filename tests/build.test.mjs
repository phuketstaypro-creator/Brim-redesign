import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { newsItems } from '../src/data/news.mjs';
import { pages } from '../src/data/pages.mjs';
import { svedenSections } from '../src/data/sveden.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const distRoot = join(projectRoot, 'dist');
const publicRoutes = ['/', ...Object.keys(pages), ...newsItems.map((item) => item.href)];
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

test('build emits exactly 36 unique filled public routes', () => {
  assert.equal(publicRoutes.length, 36);
  assert.equal(new Set(publicRoutes).size, 36);
  assert.ok(existsSync(distRoot), 'dist/ is missing; run npm run build first');

  const generatedRouteFiles = htmlFiles(distRoot).filter((file) => !file.endsWith('404.html'));
  assert.equal(generatedRouteFiles.length, 36, 'unexpected number of generated route documents');

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
  assert.equal(svedenSections.length, 14);
  const indexHtml = readRoute('/sveden/');
  for (const section of svedenSections) {
    assert.ok(existsSync(routeFile(section.href)), `${section.href}: mandatory route is missing`);
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

test('official logo, favicon and hashed first-party assets are emitted', () => {
  const html = readRoute('/');
  assert.match(html, /<link\s+rel="icon"[^>]+href="\/assets\/icons\/favicon-32\.png"/i);
  assert.match(html, /<header[\s\S]*?<img[^>]+class="brand-logo"[^>]+src="\/assets\/images\/brhk-logo\.png"/i);
  assert.match(html, /<footer[\s\S]*?<img[^>]+class="footer-logo"[^>]+src="\/assets\/images\/brhk-logo\.png"/i);

  const stylesheet = html.match(/<link\s+rel="stylesheet"\s+href="([^"]+)"/i)?.[1];
  const script = html.match(/<script\s+defer\s+src="([^"]+)"/i)?.[1];
  assert.match(stylesheet || '', /^\/assets\/site\.[a-f0-9]{12}\.css$/);
  assert.match(script || '', /^\/assets\/site\.[a-f0-9]{12}\.js$/);

  const requiredAssets = [
    stylesheet,
    script,
    '/assets/images/brhk-logo.png',
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
  assert.equal(locations.length, 36);
  assert.equal(new Set(locations).size, 36);
  for (const route of publicRoutes) {
    assert.ok(locations.some((location) => new URL(location).pathname === route), `${route}: absent from sitemap`);
  }
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
