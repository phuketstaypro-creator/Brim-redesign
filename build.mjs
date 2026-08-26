import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const cwd = process.cwd();
const payloadDir = path.join(cwd, 'payload');
const encoded = fs.readdirSync(payloadDir)
  .filter((name) => name.endsWith('.b64'))
  .sort()
  .map((name) => fs.readFileSync(path.join(payloadDir, name), 'utf8'))
  .join('')
  .replace(/\s+/g, '');

const sourceHtml = zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
const mobileCss = fs.readFileSync(path.join(cwd, 'patches', 'mobile-layout.css'), 'utf8');
const mobileJs = fs.readFileSync(path.join(cwd, 'patches', 'mobile-menu.js'), 'utf8');
const mobilePatch = `\n<!-- MOBILE-LAYOUT-V2 START -->\n<style id="mobile-layout-v2">${mobileCss}</style>\n<script id="mobile-layout-controller-v2">${mobileJs}</script>\n<!-- MOBILE-LAYOUT-V2 END -->\n`;

const html = sourceHtml.includes('MOBILE-LAYOUT-V2 START')
  ? sourceHtml
  : sourceHtml.replace('</head>', `${mobilePatch}</head>`);

if (html === sourceHtml && !sourceHtml.includes('MOBILE-LAYOUT-V2 START')) {
  throw new Error('Could not inject the mobile layout patch: closing head tag is missing.');
}

const outDir = path.join(cwd, 'dist');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const routes = [
  '',
  'about',
  'education',
  'admission',
  'students',
  'news',
  'news/demo-article',
  'events',
  'gallery',
  'documents',
  'creative-industries',
  'ballet-for-all',
  'contacts',
  'sveden',
  'sveden/common',
  'sveden/struct',
  'sveden/document',
  'sveden/education',
  'sveden/eduStandarts',
  'sveden/employees',
  'sveden/objects',
  'sveden/grants',
  'sveden/paid_edu',
  'sveden/budget',
  'sveden/vacant',
  'sveden/ovz',
  'sveden/catering',
  'sveden/inter',
  'privacy',
  'consent',
  'accessibility'
];

// Every public route receives a physical index.html. This avoids client-side
// “fake pages” that render correctly but return HTTP 404 to search engines,
// accessibility scanners and government monitoring systems.
for (const route of routes) {
  const routeDir = route ? path.join(outDir, route) : outDir;
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'index.html'), html);
}

const notFound = html
  .replace('<title>БРХК — новая версия сайта</title>', '<title>Страница не найдена — БРХК</title>')
  .replace('<title>БРХК — новая сцена начинается здесь</title>', '<title>Страница не найдена — БРХК</title>');
fs.writeFileSync(path.join(outDir, '404.html'), notFound);
fs.writeFileSync(
  path.join(outDir, 'robots.txt'),
  'User-agent: *\nAllow: /\nSitemap: https://brim-redesign.vercel.app/sitemap.xml\n'
);

const urls = routes
  .map((route) => `<url><loc>https://brim-redesign.vercel.app/${route ? `${route}/` : ''}</loc></url>`)
  .join('');
fs.writeFileSync(
  path.join(outDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
);
fs.writeFileSync(
  path.join(outDir, 'rss.xml'),
  '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Новости БРХК</title><link>https://brim-redesign.vercel.app/news/</link><description>Демонстрационная RSS-лента. Подключается к действующей CMS колледжа.</description></channel></rss>'
);

console.log(`Built ${routes.length} physical routes from ${Buffer.byteLength(html)} bytes into dist/`);
