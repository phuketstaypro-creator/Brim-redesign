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
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, '404.html'), html);
fs.writeFileSync(path.join(outDir, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://brim-redesign.vercel.app/sitemap.xml\n');
const routes = ['','about','education','admission','students','news','events','gallery','documents','creative-industries','ballet-for-all','contacts','sveden','sveden/common','sveden/struct','sveden/document','sveden/education','sveden/eduStandarts','sveden/employees','sveden/objects','sveden/grants','sveden/paid_edu','sveden/budget','sveden/vacant','sveden/ovz','sveden/catering','sveden/inter','privacy','consent','accessibility'];
const urls = routes.map((route) => `<url><loc>https://brim-redesign.vercel.app/${route ? route + '/' : ''}</loc></url>`).join('');
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
console.log(`Built ${html.length} bytes into dist/`);
