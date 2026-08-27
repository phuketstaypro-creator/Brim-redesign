import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { newsItems } from './src/data/news.mjs';
import { pages } from './src/data/pages.mjs';
import { programs } from './src/data/programs.mjs';
import { site } from './src/data/site.mjs';
import { svedenSections } from './src/data/sveden.mjs';
import { xml } from './src/templates/components.mjs';
import { renderLayout } from './src/templates/layout.mjs';
import {
  renderEducation,
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

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(assetsRoot, { recursive: true });

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
  const clean = route.replace(/^\/+|\/+$/g, '');
  return join(clean, 'index.html');
}

function assertMedia() {
  const required = [
    'assets/images/brhk-logo.png',
    'assets/images/studio-tutu.webp',
    'assets/images/studio-tutu-320.webp',
    'assets/images/studio-tutu-landscape.webp',
    'assets/images/studio-tutu-landscape-320.webp',
    'assets/images/studio-tutu-square.webp',
    'assets/images/studio-tutu-square-320.webp',
    'assets/icons/favicon-32.png',
    'assets/icons/apple-touch-icon.png',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png'
  ];
  const missing = required.filter((file) => !existsSync(join(publicRoot, file)));
  if (missing.length) throw new Error(`Missing required public assets:\n${missing.join('\n')}`);
}

assertMedia();
cpSync(publicRoot, distRoot, { recursive: true });

const css = `${readFileSync(join(projectRoot, 'src/styles/main.css'), 'utf8')}\n${readFileSync(join(projectRoot, 'src/styles/editorial.css'), 'utf8')}`;
const client = readFileSync(join(projectRoot, 'src/client/app.js'), 'utf8');
const cssHref = `/assets/site.${hash(css)}.css`;
const jsHref = `/assets/site.${hash(client)}.js`;
write(cssHref.slice(1), css);
write(jsHref.slice(1), client);

const routeModels = [
  renderHome({ site, programs, newsItems }),
  renderEducation({ programs }),
  renderNews({ newsItems }),
  ...Object.entries(pages)
    .filter(([route]) => !['/education/', '/news/'].includes(route))
    .map(([route, page]) => renderGeneric(route, page, svedenSections)),
  ...newsItems.map(renderNewsArticle)
];

const routes = routeModels.map((model) => model.route);
const duplicateRoutes = routes.filter((route, index) => routes.indexOf(route) !== index);
if (duplicateRoutes.length) throw new Error(`Duplicate routes: ${[...new Set(duplicateRoutes)].join(', ')}`);
if (routes.length !== 36) throw new Error(`Expected 36 public routes, received ${routes.length}`);

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

const notFound = renderNotFound();
write('404.html', renderLayout({ site, ...notFound, cssHref, jsHref }));

const searchIndex = [
  { title: 'Главная', url: '/', description: site.description },
  ...Object.entries(pages).map(([url, page]) => ({ title: page.title, url, description: page.description })),
  ...newsItems.map((item) => ({ title: item.title, url: item.href, description: `${item.category}. ${item.excerpt}` }))
];
write('search-index.json', `${JSON.stringify(searchIndex, null, 2)}\n`);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${xml(`${site.baseUrl}${route}`)}</loc></url>`).join('\n')}\n</urlset>\n`;
write('sitemap.xml', sitemap);

const rssItems = [...newsItems]
  .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  .map((item) => `    <item><title>${xml(item.title)}</title><link>${xml(`${site.baseUrl}${item.href}`)}</link><guid>${xml(`${site.baseUrl}${item.href}`)}</guid><description>${xml(item.excerpt)}</description><pubDate>${new Date(`${item.publishedAt}T00:00:00+08:00`).toUTCString()}</pubDate></item>`)
  .join('\n');
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Новости БРХК</title><link>${xml(`${site.baseUrl}/news/`)}</link><description>Краткая лента публикаций, сверенных с действующим сайтом БРХК; полные материалы остаются у официального источника до миграции CMS.</description>\n${rssItems}\n</channel></rss>\n`);

console.log(`Built ${routes.length} filled HTML routes, 404, sitemap, RSS and search index into dist/`);
console.log(`Assets: ${cssHref}, ${jsHref}`);
