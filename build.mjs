import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { loadContentSet } from './src/content/load-content.mjs';
import { materializeMedia } from './src/content/media.mjs';
import { REQUIRED_ROUTES, missingRequiredRoutes } from './src/content/required-routes.mjs';
import { assertIndexableMediaRights } from './src/content/rights.mjs';
import { LOCALE_IDS, localeConfig } from './src/i18n/config.mjs';
import { localizeContent } from './src/i18n/localize.mjs';
import { configureRenderLocale } from './src/i18n/render-context.mjs';
import { publicRoute, routeAlternates } from './src/i18n/routing.mjs';
import { configureMediaRegistry, xml } from './src/templates/components.mjs';
import { renderLayout } from './src/templates/layout.mjs';
import {
  renderEducation,
  renderEventArticle,
  renderGeneric,
  renderHome,
  renderNews,
  renderNewsArticle,
  renderNotFound
} from './src/templates/routes.mjs';

const projectRoot = resolve(import.meta.dirname);
const distRoot = join(projectRoot, 'dist');
const publicRoot = join(projectRoot, 'public');
const assetsRoot = join(distRoot, 'assets');

if (basename(distRoot) !== 'dist' || dirname(distRoot) !== projectRoot) {
  throw new Error(`Refusing to clean unexpected output directory: ${distRoot}`);
}

function hash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function write(relativePath, content) {
  const destination = join(distRoot, relativePath);
  if (destination !== distRoot && !destination.startsWith(`${distRoot}${sep}`)) {
    throw new Error(`Unsafe output path: ${relativePath}`);
  }
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function routeFile(route) {
  if (route === '/') return 'index.html';
  return join(route.replace(/^\/+|\/+$/g, ''), 'index.html');
}

function localeFile(locale, filename) {
  const directory = localeConfig(locale).prefix.replace(/^\//, '');
  return directory ? join(directory, filename) : filename;
}

function assertStableAssets() {
  const required = [
    'assets/images/brhk-logo-full.png',
    'assets/icons/favicon-32.png',
    'assets/icons/apple-touch-icon.png',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png'
  ];
  const missing = required.filter((file) => !existsSync(join(publicRoot, file)));
  if (missing.length) throw new Error(`Missing required official assets:\n${missing.join('\n')}`);
}

function createRouteModels(content, site) {
  const { pages, programs, newsItems, events, employees, documents, svedenSections } = content;
  return [
    renderHome({ site, programs, newsItems }),
    renderEducation({ site, programs, page: pages['/education/'] }),
    renderNews({ site, newsItems, page: pages['/news/'] }),
    ...Object.entries(pages)
      .filter(([route]) => !['/education/', '/news/'].includes(route))
      .map(([route, page]) => renderGeneric({ route, page, site, svedenSections, documents, events, employees })),
    ...newsItems.map((item) => renderNewsArticle(item, site)),
    ...events.map((item) => renderEventArticle(item, site))
  ];
}

function assertRouteModels(routeModels, locale) {
  const logicalRoutes = routeModels.map((model) => model.route);
  const duplicateRoutes = logicalRoutes.filter((route, index) => logicalRoutes.indexOf(route) !== index);
  if (duplicateRoutes.length) throw new Error(`${locale}: duplicate routes: ${[...new Set(duplicateRoutes)].join(', ')}`);
  const missingRoutes = missingRequiredRoutes(logicalRoutes);
  if (missingRoutes.length) throw new Error(`${locale}: required routes were not rendered:\n${missingRoutes.join('\n')}`);
  return logicalRoutes;
}

function searchIndexFor(content, site, locale) {
  const { pages, newsItems, events } = content;
  const messages = localeConfig(locale).messages;
  return [
    { title: messages.home, url: publicRoute(locale, '/'), description: site.description },
    ...Object.entries(pages).map(([url, page]) => ({ title: page.title, url: publicRoute(locale, url), description: page.description })),
    ...newsItems.map((item) => ({ title: item.title, url: publicRoute(locale, item.href), description: `${item.category}. ${item.excerpt}` })),
    ...events.filter((item) => item.href).map((item) => ({ title: item.title, url: publicRoute(locale, item.href), description: item.description || '' }))
  ];
}

function renderRss(content, site, locale) {
  const messages = localeConfig(locale).messages;
  const rssItems = [...content.newsItems]
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .map((item) => {
      const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt)
        ? new Date(`${item.publishedAt}T00:00:00+08:00`)
        : new Date(item.publishedAt);
      const href = `${site.baseUrl}${publicRoute(locale, item.href)}`;
      return `    <item><title>${xml(item.title)}</title><link>${xml(href)}</link><guid>${xml(href)}</guid><description>${xml(item.excerpt)}</description><pubDate>${publishedAt.toUTCString()}</pubDate></item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${xml(messages.rssTitle)}</title><link>${xml(`${site.baseUrl}${publicRoute(locale, '/news/')}`)}</link><description>${xml(messages.rssDescription)}</description><language>${xml(localeConfig(locale).htmlLang)}</language>\n${rssItems}\n</channel></rss>\n`;
}

function manifestFor(site, locale) {
  const config = localeConfig(locale);
  return `${JSON.stringify({
    name: site.name,
    short_name: site.shortName,
    lang: config.htmlLang,
    start_url: publicRoute(locale, '/'),
    display: 'standalone',
    background_color: '#f1ece3',
    theme_color: site.themeColor,
    icons: [
      { src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  }, null, 2)}\n`;
}

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(assetsRoot, { recursive: true });
assertStableAssets();
cpSync(publicRoot, distRoot, { recursive: true });

const contentSet = await loadContentSet({ env: process.env, cwd: projectRoot });
const sourceContent = contentSet.locales[contentSet.defaultLocale];
const adapterName = String(process.env.CONTENT_ADAPTER || 'local').toLowerCase();
const requestedLocales = String(process.env.CONTENT_LOCALES || '')
  .split(',')
  .map((locale) => locale.trim().toLowerCase())
  .filter(Boolean);
const buildLocaleIds = requestedLocales.length
  ? [...new Set(requestedLocales)]
  : contentSet.localized
    ? Object.keys(contentSet.locales)
    : adapterName === 'local'
      ? [...LOCALE_IDS]
      : ['ru'];
const unsupportedLocales = buildLocaleIds.filter((locale) => !LOCALE_IDS.includes(locale));
if (unsupportedLocales.length) throw new Error(`Unsupported CONTENT_LOCALES: ${unsupportedLocales.join(', ')}`);
const unavailableLocales = contentSet.localized
  ? buildLocaleIds.filter((locale) => !Object.hasOwn(contentSet.locales, locale))
  : [];
if (unavailableLocales.length) {
  throw new Error(`CONTENT_LOCALES not supplied by the localized CMS export: ${unavailableLocales.join(', ')}`);
}
const allowIndexing = String(process.env.ALLOW_INDEXING || '').toLowerCase() === 'true';
for (const locale of buildLocaleIds) {
  const localeContent = contentSet.localized ? contentSet.locales[locale] : sourceContent;
  try {
    assertIndexableMediaRights(localeContent.media, { allowIndexing });
  } catch (error) {
    error.message = `${locale}: ${error.message}`;
    throw error;
  }
}

const css = `${readFileSync(join(projectRoot, 'src/styles/main.css'), 'utf8')}\n${readFileSync(join(projectRoot, 'src/styles/editorial.css'), 'utf8')}`;
const client = readFileSync(join(projectRoot, 'src/client/app.js'), 'utf8');
const cssHref = `/assets/site.${hash(css)}.css`;
const jsHref = `/assets/site.${hash(client)}.js`;
write(cssHref.slice(1), css);
write(jsHref.slice(1), client);

const localeBuilds = [];
let manifestMediaRegistry = null;
const renderedPublicPaths = new Set();
const locale404Documents = new Map();

for (const locale of buildLocaleIds) {
  configureRenderLocale(locale, buildLocaleIds);
  const content = contentSet.localized
    ? structuredClone(contentSet.locales[locale])
    : localizeContent(sourceContent, locale);
  const site = {
    ...content.site,
    canonicalBase: content.site.baseUrl,
    staging: !allowIndexing
  };
  const mediaRegistry = materializeMedia(content.media, { publicRoot, distRoot });
  configureMediaRegistry(mediaRegistry);
  if (!manifestMediaRegistry) manifestMediaRegistry = mediaRegistry;
  site.socialImage = mediaRegistry.stageHero?.src || mediaRegistry.stage?.src;

  const routeModels = createRouteModels(content, site);
  const logicalRoutes = assertRouteModels(routeModels, locale);
  const routes = [];

  for (const model of routeModels) {
    const publicPath = publicRoute(locale, model.route);
    if (renderedPublicPaths.has(publicPath)) {
      throw new Error(`${locale}: localized public route is duplicated: ${publicPath}`);
    }
    renderedPublicPaths.add(publicPath);
    const html = renderLayout({ site, ...model, cssHref, jsHref });
    const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;
    if (h1Count !== 1) throw new Error(`${publicPath}: expected one h1, received ${h1Count}`);
    if (html.includes('raw.githubusercontent.com') || html.includes('<div id="app"></div>')) {
      throw new Error(`${publicPath}: runtime-loader artifact detected`);
    }
    const mainMarkup = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] || '';
    if (locale !== 'ru' && /[А-Яа-яЁё]/.test(mainMarkup)) {
      throw new Error(`${publicPath}: untranslated Cyrillic text remains in main content`);
    }
    write(routeFile(publicPath), html);
    routes.push(publicPath);
  }

  const notFound = renderNotFound(site);
  const notFoundHtml = renderLayout({ site, ...notFound, cssHref, jsHref });
  write(localeFile(locale, '404.html'), notFoundHtml);
  locale404Documents.set(locale, notFoundHtml);
  write(localeFile(locale, 'search-index.json'), `${JSON.stringify(searchIndexFor(content, site, locale), null, 2)}\n`);
  write(localeFile(locale, 'rss.xml'), renderRss(content, site, locale));
  write(localeFile(locale, 'manifest.webmanifest'), manifestFor(site, locale));
  localeBuilds.push({ locale, content, site, routeModels, logicalRoutes, routes });
}

// Vercel and the local dev server have stable locale-aware fallback targets.
// When a subset is built, unavailable locales use the first built noindex 404.
const fallbackNotFoundHtml = locale404Documents.values().next().value;
for (const locale of LOCALE_IDS) {
  if (!locale404Documents.has(locale)) write(localeFile(locale, '404.html'), fallbackNotFoundHtml);
}

const referenceLogicalRoutes = localeBuilds[0].logicalRoutes;
for (const build of localeBuilds.slice(1)) {
  const mismatch = referenceLogicalRoutes.filter((route) => !build.logicalRoutes.includes(route))
    .concat(build.logicalRoutes.filter((route) => !referenceLogicalRoutes.includes(route)));
  if (mismatch.length) throw new Error(`${build.locale}: route parity failed: ${[...new Set(mismatch)].join(', ')}`);
}

const baseUrl = localeBuilds[0].site.baseUrl;
const sitemapEntries = referenceLogicalRoutes.flatMap((logicalRoute) => routeAlternates(logicalRoute).filter((item) => buildLocaleIds.includes(item.locale)).map((alternate) => {
  const alternateLinks = routeAlternates(logicalRoute).filter((item) => buildLocaleIds.includes(item.locale))
    .map((item) => `    <xhtml:link rel="alternate" hreflang="${xml(item.hreflang)}" href="${xml(`${baseUrl}${item.href}`)}"/>`)
    .concat(buildLocaleIds.includes('ru') ? `    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(`${baseUrl}${publicRoute('ru', logicalRoute)}`)}"/>` : [])
    .join('\n');
  return `  <url><loc>${xml(`${baseUrl}${alternate.href}`)}</loc>\n${alternateLinks}\n  </url>`;
}));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapEntries.join('\n')}\n</urlset>\n`);

write('robots.txt', `User-agent: *\n${allowIndexing ? 'Allow: /' : 'Disallow: /'}\nSitemap: ${baseUrl}/sitemap.xml\n`);

const totalRouteCount = localeBuilds.reduce((count, build) => count + build.routes.length, 0);
write('content-manifest.json', `${JSON.stringify({
  schemaVersion: sourceContent.schemaVersion,
  adapter: adapterName,
  contentFormat: contentSet.format,
  locales: buildLocaleIds,
  logicalRouteCount: referenceLogicalRoutes.length,
  routeCount: totalRouteCount,
  logicalRoutes: referenceLogicalRoutes,
  publicRoutes: localeBuilds.flatMap((build) => build.routes),
  requiredRoutes: REQUIRED_ROUTES,
  collections: {
    pages: Object.keys(sourceContent.pages).length,
    programs: sourceContent.programs.length,
    news: sourceContent.newsItems.length,
    events: sourceContent.events.length,
    employees: sourceContent.employees.length,
    documents: sourceContent.documents.length,
    sveden: sourceContent.svedenSections.length,
    media: sourceContent.media.length
  },
  media: Object.values(manifestMediaRegistry).map((asset) => ({
    id: asset.id,
    src: asset.src,
    width: asset.width,
    height: asset.height,
    provenance: String(asset.source || '').startsWith('repository:') ? 'repository' : 'external',
    originalName: asset.originalName,
    credit: asset.credit,
    rightsStatus: asset.rightsStatus
  }))
}, null, 2)}\n`);

console.log(`Built ${totalRouteCount} filled HTML routes (${referenceLogicalRoutes.length} × ${buildLocaleIds.length} locales), localized 404, sitemap, RSS and search indexes into dist/`);
console.log(`Content: ${sourceContent.schemaVersion}; media: ${Object.keys(manifestMediaRegistry).length}; assets: ${cssHref}, ${jsHref}`);
