import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const payloadDir = path.join(process.cwd(), 'payload');
const encoded = fs.readdirSync(payloadDir)
  .filter((name) => name.endsWith('.b64'))
  .sort()
  .map((name) => fs.readFileSync(path.join(payloadDir, name), 'utf8'))
  .join('')
  .replace(/\s+/g, '');

const html = zlib.gunzipSync(Buffer.from(encoded, 'base64'));
const outDir = path.join(process.cwd(), 'dist');
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

const notFound = html.replace(
  '<title>БРХК — новая версия сайта</title>',
  '<title>Страница не найдена — БРХК</title>'
);
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

console.log(`Built ${routes.length} physical routes from ${html.length} bytes into dist/`);
