import { createReadStream, existsSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const distRoot = join(projectRoot, 'dist');
const port = Number(process.env.PORT || 4173);

function build() {
  const result = spawnSync(process.execPath, ['build.mjs'], {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

build();

const mimeTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

function resolveRequest(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relative = normalize(decoded.replace(/^\/+/, ''));
  const candidate = resolve(distRoot, relative || 'index.html');
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${sep}`)) return null;

  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html');
    if (existsSync(index)) return index;
  }

  const cleanHtml = `${candidate}.html`;
  if (existsSync(cleanHtml)) return cleanHtml;
  return null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const file = resolveRequest(url.pathname);

  if (!file) {
    response.statusCode = 404;
    response.setHeader('Content-Type', mimeTypes['.html']);
    createReadStream(join(distRoot, '404.html')).pipe(response);
    return;
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream');
  response.setHeader('Cache-Control', file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`BRHK static server: http://127.0.0.1:${port}`);
});

if (process.argv.includes('--watch')) {
  let timer;
  for (const directory of ['src', 'public']) {
    watch(join(projectRoot, directory), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(build, 120);
    });
  }
}
