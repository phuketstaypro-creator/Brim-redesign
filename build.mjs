import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { loadContent } from './src/content/load-content.mjs';
import { materializeMedia } from './src/content/media.mjs';
import { REQUIRED_ROUTES, missingRequiredRoutes } from './src/content/required-routes.mjs';
import { assertIndexableMediaRights } from './src/content/rights.mjs';
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

function assertStableAssets() {
  const required = [
    'assets/images/brhk-monogram.png',
    'assets/icons/favicon-32.png',
    'assets/icons/apple-touch-icon.png',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png'
  ];
  const missing = required.filter((file) => !existsSync(join(publicRoot, file)));
  if (missing.length) throw new Error(`Missing required official assets:\n${missing.join('\n')}`);
}

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(assetsRoot, { recursive: true });
assertStableAssets();
cpSync(publicRoot, distRoot, { recursive: true });

const content = await loadContent({ env: process.env, cwd: projectRoot });
const { pages, programs, newsItems, events, employees, documents, svedenSections } = content;
const allowIndexing = String(process.env.ALLOW_INDEXING || '').toLowerCase() === 'true';
assertIndexableMediaRights(content.media, { allowIndexing });
const site = {
  ...content.site,
  canonicalBase: content.site.baseUrl,
  staging: !allowIndexing
};

const mediaRegistry = materializeMedia(content.media, { publicRoot, distRoot });
configureMediaRegistry(mediaRegistry);
site.socialImage = mediaRegistry.stageHero?.src || mediaRegistry.stage?.src;

const css = `${readFileSync(join(projectRoot, 'src/styles/main.css'), 'utf8')}\n${readFileSync(join(projectRoot, 'src/styles/editorial.css'), 'utf8')}`;
const client = readFileSync(join(projectRoot, 'src/client/app.js'), 'utf8');
const cssHref = `/assets/site.${hash(css)}.css`;
const jsHref = `/assets/site.${hash(client)}.js`;
write(cssHref.slice(1), css);
write(jsHref.slice(1), client);

const routeModels = [
  renderHome({ site, programs, newsItems }),
  renderEducation({ site, programs, page: pages['/education/'] }),
  renderNews({ site, newsItems, page: pages['/news/'] }),
  ...Object.entries(pages)
    .filter(([route]) => !['/education/', '/news/'].includes(route))
    .map(([route, page]) => renderGeneric({ route, page, site, svedenSections, documents, events, employees })),
  ...newsItems.map((item) => renderNewsArticle(item, site)),
  ...events.map((item) => renderEventArticle(item, site))
];

const routes = routeModels.map((model) => model.route);
const duplicateRoutes = routes.filter((route, index) => routes.indexOf(route) !== index);
if (duplicateRoutes.length) throw new Error(`Duplicate routes: ${[...new Set(duplicateRoutes)].join(', ')}`);
const missingRoutes = missingRequiredRoutes(routes);
if (missingRoutes.length) throw new Error(`Required routes were not rendered:\n${missingRoutes.join('\n')}`);

const rendered = [];
for (const model of routeModels) {
  const html = renderLayout({ site, ...model, cssHref, jsHref });
  const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;
  if (h1Count !== 1) throw new Error(`${model.route}: expected one h1, received ${h1Count}`);
  if (html.includes('raw.githubusercontent.com') || html.includes('<div id="app"></div>')) {
    throw new Error(`${model.route}: runtime-loader artifact detected`);
  }
  write(routeFile(model.route), html);
  rendered.push({ ...model, html });
}

const notFound = renderNotFound(site);
write('404.html', renderLayout({ site, ...notFound, cssHref, jsHref }));

const searchIndex = [
  { title: 'Главная', url: '/', description: site.description },
  ...Object.entries(pages).map(([url, page]) => ({ title: page.title, url, description: page.description })),
  ...newsItems.map((item) => ({ title: item.title, url: item.href, description: `${item.category}. ${item.excerpt}` })),
  ...events.filter((item) => item.href).map((item) => ({ title: item.title, url: item.href, description: item.description || '' }))
];
write('search-index.json', `${JSON.stringify(searchIndex, null, 2)}\n`);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${xml(`${site.baseUrl}${route}`)}</loc></url>`).join('\n')}\n</urlset>\n`;
write('sitemap.xml', sitemap);

const rssItems = [...newsItems]
  .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  .map((item) => {
    const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt)
      ? new Date(`${item.publishedAt}T00:00:00+08:00`)
      : new Date(item.publishedAt);
    return `    <item><title>${xml(item.title)}</title><link>${xml(`${site.baseUrl}${item.href}`)}</link><guid>${xml(`${site.baseUrl}${item.href}`)}</guid><description>${xml(item.excerpt)}</description><pubDate>${publishedAt.toUTCString()}</pubDate></item>`;
  })
  .join('\n');
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Новости БРХК</title><link>${xml(`${site.baseUrl}/news/`)}</link><description>Краткая лента публикаций БРХК.</description>\n${rssItems}\n</channel></rss>\n`);

write('robots.txt', `User-agent: *\n${allowIndexing ? 'Allow: /' : 'Disallow: /'}\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
write('manifest.webmanifest', `${JSON.stringify({
  name: site.name,
  short_name: site.shortName,
  lang: site.locale,
  start_url: '/',
  display: 'standalone',
  background_color: '#f1ece3',
  theme_color: site.themeColor,
  icons: [
    { src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
  ]
}, null, 2)}\n`);

write('content-manifest.json', `${JSON.stringify({
  schemaVersion: content.schemaVersion,
  adapter: String(process.env.CONTENT_ADAPTER || 'local').toLowerCase(),
  routeCount: routes.length,
  requiredRoutes: REQUIRED_ROUTES,
  collections: {
    pages: Object.keys(pages).length,
    programs: programs.length,
    news: newsItems.length,
    events: events.length,
    employees: employees.length,
    documents: documents.length,
    sveden: svedenSections.length,
    media: content.media.length
  },
  media: Object.values(mediaRegistry).map((asset) => ({
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

console.log(`Built ${routes.length} filled HTML routes, 404, sitemap, RSS and search index into dist/`);
console.log(`Content: ${content.schemaVersion}; media: ${Object.keys(mediaRegistry).length}; assets: ${cssHref}, ${jsHref}`);
