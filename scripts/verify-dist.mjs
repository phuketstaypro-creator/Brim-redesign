import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';
import { localeConfig } from '../src/i18n/config.mjs';
import { publicRoute } from '../src/i18n/routing.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const distRoot = join(projectRoot, 'dist');
const manifestFile = join(distRoot, 'content-manifest.json');
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }
}

function routeFile(route) {
  if (route === '/') return join(distRoot, 'index.html');
  return join(distRoot, route.replace(/^\/+|\/+$/g, ''), 'index.html');
}

function safeDistTarget(pathname) {
  const target = resolve(distRoot, normalize(pathname.replace(/^\/+/, '')));
  if (target !== distRoot && !target.startsWith(`${distRoot}${sep}`)) return null;
  return target;
}

function targetForReference(value) {
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  const pathname = new URL(value, 'https://handoff.invalid').pathname;
  const direct = safeDistTarget(pathname);
  if (!direct) return null;
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const index = join(direct, 'index.html');
  if (existsSync(index) && statSync(index).isFile()) return index;
  return direct;
}

function documentReferences(html) {
  const references = [];
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) references.push(match[1]);
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(',')) {
      const source = candidate.trim().split(/\s+/, 1)[0];
      if (source) references.push(source);
    }
  }
  return references;
}

if (!existsSync(manifestFile)) throw new Error('dist/content-manifest.json is missing; run npm run build first');
const manifest = readJson(manifestFile);

if (!Array.isArray(manifest.locales) || !manifest.locales.length) fail('manifest.locales must be a non-empty array');
if (!Array.isArray(manifest.logicalRoutes) || !manifest.logicalRoutes.length) fail('manifest.logicalRoutes must be a non-empty array');
if (!Array.isArray(manifest.publicRoutes) || !manifest.publicRoutes.length) fail('manifest.publicRoutes must be a non-empty array');

const expectedPublicRoutes = [];
for (const locale of manifest.locales ?? []) {
  try {
    localeConfig(locale);
  } catch {
    fail(`manifest contains unsupported locale ${JSON.stringify(locale)}`);
    continue;
  }

  for (const logicalRoute of manifest.logicalRoutes ?? []) {
    const route = publicRoute(locale, logicalRoute);
    expectedPublicRoutes.push(route);
    const file = routeFile(route);
    if (!existsSync(file)) {
      fail(`${route}: generated HTML is missing`);
      continue;
    }

    const html = readFileSync(file, 'utf8');
    const h1Count = (html.match(/<h1(?:\s|>)/g) ?? []).length;
    if (!/^<!doctype html>/i.test(html)) fail(`${route}: doctype is missing`);
    if (!/<main\b[\s\S]*<\/main>/.test(html)) fail(`${route}: populated main element is missing`);
    if (h1Count !== 1) fail(`${route}: expected one h1, received ${h1Count}`);
    if (/raw\.githubusercontent\.com|<div id="app"><\/div>|data-boot="loading"/.test(html)) {
      fail(`${route}: runtime-loader marker detected`);
    }

    for (const reference of documentReferences(html)) {
      const target = targetForReference(reference);
      if (target && !existsSync(target)) fail(`${route}: missing internal reference ${reference}`);
    }
  }
}

const firstPublicRoute = manifest.publicRoutes?.[0];
const firstPublicFile = firstPublicRoute ? routeFile(firstPublicRoute) : null;
let siteOrigin = null;
if (firstPublicFile && existsSync(firstPublicFile)) {
  const firstHtml = readFileSync(firstPublicFile, 'utf8');
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(firstHtml)?.[1];
  try {
    siteOrigin = canonical ? new URL(canonical).origin : null;
  } catch {
    fail(`${firstPublicRoute}: canonical URL is invalid`);
  }
  if (!siteOrigin) fail(`${firstPublicRoute}: canonical URL is missing`);
}

const sitemapFile = join(distRoot, 'sitemap.xml');
if (!existsSync(sitemapFile)) {
  fail('sitemap.xml is missing');
} else {
  const sitemap = readFileSync(sitemapFile, 'utf8');
  if (!/^<\?xml[^>]*>\s*<urlset\b/.test(sitemap)) fail('sitemap.xml is not an XML urlset');
  if (siteOrigin) {
    const missingSitemapRoutes = (manifest.publicRoutes ?? [])
      .filter((route) => !sitemap.includes(`<loc>${siteOrigin}${route}</loc>`));
    if (missingSitemapRoutes.length) {
      fail(`sitemap.xml is missing ${missingSitemapRoutes.length} public routes`);
    }
  }
}

const robotsFile = join(distRoot, 'robots.txt');
if (!existsSync(robotsFile)) {
  fail('robots.txt is missing');
} else {
  const robots = readFileSync(robotsFile, 'utf8');
  if (!/^User-agent: \*/m.test(robots)) fail('robots.txt is missing the default user-agent rule');
  if (!/^(?:Allow|Disallow): \/$/m.test(robots)) fail('robots.txt is missing an indexing rule');
  if (siteOrigin && !robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`)) {
    fail('robots.txt sitemap URL does not match the generated canonical origin');
  }
}

for (const locale of manifest.locales ?? []) {
  const config = localeConfig(locale);
  const prefix = config.prefix.replace(/^\//, '');
  const localeDirectory = join(distRoot, prefix);

  const searchFile = join(localeDirectory, 'search-index.json');
  if (!existsSync(searchFile)) {
    fail(`${locale}: search-index.json is missing`);
  } else {
    const searchIndex = readJson(searchFile);
    if (!Array.isArray(searchIndex)) {
      fail(`${locale}: search-index.json must contain an array`);
    } else {
      const actualUrls = searchIndex.map((item, index) => {
        if (!item || typeof item !== 'object') fail(`${locale}: search-index.json[${index}] must be an object`);
        if (typeof item?.title !== 'string' || typeof item?.description !== 'string' || typeof item?.url !== 'string') {
          fail(`${locale}: search-index.json[${index}] has invalid fields`);
        }
        return item?.url;
      }).sort();
      const expectedUrls = (manifest.logicalRoutes ?? []).map((route) => publicRoute(locale, route)).sort();
      if (JSON.stringify(actualUrls) !== JSON.stringify(expectedUrls)) {
        fail(`${locale}: search-index.json routes do not match logicalRoutes`);
      }
    }
  }

  const webManifestFile = join(localeDirectory, 'manifest.webmanifest');
  if (!existsSync(webManifestFile)) {
    fail(`${locale}: manifest.webmanifest is missing`);
  } else {
    const webManifest = readJson(webManifestFile);
    if (webManifest.lang !== config.htmlLang) fail(`${locale}: manifest.webmanifest lang is invalid`);
    if (webManifest.start_url !== publicRoute(locale, '/')) fail(`${locale}: manifest.webmanifest start_url is invalid`);
    if (!Array.isArray(webManifest.icons) || !webManifest.icons.length) {
      fail(`${locale}: manifest.webmanifest icons are missing`);
    } else {
      for (const icon of webManifest.icons) {
        const target = typeof icon?.src === 'string' ? targetForReference(icon.src) : null;
        if (!target || !existsSync(target)) fail(`${locale}: manifest icon ${JSON.stringify(icon?.src)} is missing`);
      }
    }
  }

  const rssFile = join(localeDirectory, 'rss.xml');
  if (!existsSync(rssFile)) {
    fail(`${locale}: rss.xml is missing`);
  } else {
    const rss = readFileSync(rssFile, 'utf8');
    if (!/^<\?xml[^>]*>\s*<rss\b/.test(rss)) fail(`${locale}: rss.xml is not an RSS document`);
    if (siteOrigin && !rss.includes(`<link>${siteOrigin}${publicRoute(locale, '/news/')}</link>`)) {
      fail(`${locale}: rss.xml channel link is invalid`);
    }
  }
}

for (const asset of manifest.media ?? []) {
  const target = typeof asset?.src === 'string' ? targetForReference(asset.src) : null;
  if (!target || !existsSync(target)) fail(`manifest media ${JSON.stringify(asset?.id)} is missing at ${JSON.stringify(asset?.src)}`);
}

const manifestPublicRoutes = [...(manifest.publicRoutes ?? [])].sort();
if (JSON.stringify([...expectedPublicRoutes].sort()) !== JSON.stringify(manifestPublicRoutes)) {
  fail('manifest.publicRoutes does not match locales × logicalRoutes');
}
if (manifest.logicalRouteCount !== (manifest.logicalRoutes ?? []).length) {
  fail('manifest.logicalRouteCount does not match logicalRoutes');
}
if (manifest.routeCount !== expectedPublicRoutes.length) {
  fail('manifest.routeCount does not match generated public routes');
}

for (const locale of ['ru', 'en', 'zh']) {
  const prefix = locale === 'ru' ? '' : localeConfig(locale).prefix.replace(/^\//, '');
  const file = join(distRoot, prefix, '404.html');
  if (!existsSync(file)) fail(`${locale}: localized 404.html is missing`);
}

if (failures.length) {
  throw new Error(`Generated site verification failed:\n${failures.map((item) => `- ${item}`).join('\n')}`);
}

console.log(`Verified ${manifest.routeCount} server-rendered HTML routes, internal files and standalone indexes.`);
console.log(`Content format: ${manifest.contentFormat}; locales: ${manifest.locales.join(', ')}.`);
