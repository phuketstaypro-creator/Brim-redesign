# Сборка и deployment

## Артефакт передачи

`npm run build` создаёт самодостаточный каталог `dist/`. Production web-server отдаёт только его; Node.js, `src/`, CMS credentials и исходный JSON ему не нужны.

В `dist/` входят:

- физический `<locale-route>/index.html` для каждого published logical route и включённой locale;
- локализованные `404.html`: `/404.html`, `/en/404.html`, `/zh/404.html` в default local build;
- общий `sitemap.xml` с `hreflang`, а также локализованные `rss.xml`, `search-index.json` и `manifest.webmanifest` для каждой включённой locale (в корне, `/en/` и `/zh/` у default local build);
- `content-manifest.json` с adapter, route count, required routes, collection counts и media provenance/status;
- CSS/JS с 12-символьным SHA-256 suffix;
- content media в `/assets/media/` с 12-символьным hash содержимого;
- стабильные first-party logo/favicon/manifest assets из `public/`.

Общее число logical routes динамическое: mandatory routes — только проверяемое подмножество, новости и события добавляются из `ContentBundle`. Текущий local bundle содержит 73 logical routes и по умолчанию создаёт 219 HTML-документов (`ru` без префикса, `en` под `/en`, `zh-CN` под `/zh`). Build проверяет один `<h1>` на route, дубликаты, обязательные paths, parity routes между locale, отсутствие неизвестной кириллицы в EN/ZH main content и отсутствие runtime-loader markers.

## Локальная production-сборка

Node.js 24 рекомендуется; `package.json` допускает `>=22 <25`.

```bash
npm ci
npm run validate:content
npm run test
npm run test:e2e
npm run test:a11y
npm run test:visual
```

`npm run validate:content` проверяет выбранный ContentBundle без записи `dist/`. `npm run test` сам запускает build и contract/HTML tests. Для первого browser run:

```bash
npx playwright install chromium
```

Запускаемый review build с явными настройками:

```bash
SITE_URL=https://preview.example.edu ALLOW_INDEXING=false CONTENT_ADAPTER=local npm run build
```

Для CMS export:

```bash
CONTENT_ADAPTER=json \
CMS_CONTENT_FILE=content/export.json \
CONTENT_LOCALES=ru \
SITE_URL=https://preview.example.edu \
ALLOW_INDEXING=false \
npm run build
```

Ту же adapter-aware проверку одной командой выполняет `npm run verify:cms`; она запускает content validation, build и проверяет полный список generated routes/internal files из `content-manifest.json`. `npm run verify` предназначен для regression принятого local snapshot и должен запускаться отдельно без `CONTENT_*` overrides.

`CONTENT_LOCALES` принимает comma-separated subset `ru,en,zh`. Для `CONTENT_ADAPTER=local` отсутствие переменной означает `ru,en,zh`; для plain JSON — только `ru` ради обратной совместимости; для `brhk-content-locales-v1` envelope — все переданные bundles. Запрос отсутствующей locale останавливает build. Встроенные exact-string каталоги покрывают только текущий local bundle; постоянно обновляемые переводы CMS следует передавать отдельными полными bundles в locale envelope.

Не включайте `ALLOW_INDEXING=true`, пока canonical domain и право публикации контента не утверждены. После этого production release gate использует тот же build с реальным `SITE_URL` и `ALLOW_INDEXING=true`. Build остановится, если хотя бы один media record имеет статус вне `owned`, `licensed` или `public-domain`. Если значение отсутствует или отличается от `true`, review-сборка разрешена, HTML получает `noindex, nofollow`, а generated `robots.txt` — `Disallow: /`. `public/robots.txt` и `public/manifest.webmanifest` копируются, но затем намеренно перезаписываются generated версиями.

## Vercel

`vercel.json` уже содержит:

| Setting | Value |
|---|---|
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Clean URLs | enabled |
| Trailing slash | enabled |
| Runtime framework | не требуется |

Project settings:

1. Root Directory — repository root.
2. Production Branch — `main`.
3. Node.js — 24.x.
4. Framework preset — Other, если autodetect не распознал статический build.
5. Environment variables — `CONTENT_ADAPTER`, optional `CMS_CONTENT_FILE`, `CONTENT_LOCALES`, `SITE_URL`, `ALLOW_INDEXING` отдельно для Preview/Production.

Для `CONTENT_ADAPTER=json` файл экспорта и его local media должны существовать внутри build checkout до `npm run build`. JSON может быть plain `ContentBundle` или locale envelope `brhk-content-locales-v1`; формат и parity локалей проверяются до рендера. Сам Vercel adapter не обращается к CMS API. Храните JSON вне `public/`, потому что содержимое `public/` копируется в deployed `dist/` целиком. Если export формируется CI, используйте доверенный pre-build workflow и не печатайте секреты в logs.

`vercel.json` добавляет CSP (`img-src 'self'`), `nosniff`, frame, referrer и permissions headers. Cache policy разделена по типу URL:

| URL | `Cache-Control` |
|---|---|
| `/assets/media/*` | `public, max-age=31536000, immutable` |
| `/assets/site.*` | `public, max-age=31536000, immutable` |
| `/assets/images/*` | `public, max-age=3600, must-revalidate` |
| `/assets/icons/*` | `public, max-age=86400, stale-while-revalidate=604800` |
| `content-manifest.json`, `/search-index.json`, `/en/search-index.json`, `/zh/search-index.json` | `public, max-age=0, must-revalidate` |

Immutable policy применяется только к content-hashed media/CSS/JS. Стабильные logo/favicon URL остаются обновляемыми.

SPA rewrite на `/index.html` запрещён: он создаст soft-404 и сломает требование наполненного HTML на каждом URL.

## Передача на обычный static server

Передавайте либо Git repository с lockfile и build instructions, либо checksum-архив уже проверенного `dist/`. Если передаётся `dist/`, принимающей стороне не нужно устанавливать npm в production.

Обязательная семантика сервера:

- `/about/` отдаёт `/about/index.html`;
- `/en/about/` и `/zh/about/` отдают соответствующие локализованные `index.html`, а неизвестные адреса под `/en/` и `/zh/` — locale-specific `404.html` со статусом `404`;
- существующие files сохраняют правильный MIME;
- неизвестный URL возвращает HTTP `404` с `/404.html`;
- нет fallback всех URL на `/index.html`;
- HTTPS включён;
- security headers эквивалентны `vercel.json`;
- `dist/` является document root, а repository root публично недоступен.

### Nginx

Минимальная конфигурация (директива `map` размещается в `http`, TLS/DNS настраиваются отдельно):

```nginx
map $uri $brhk_cache_control {
    default "";
    ~^/assets/media/ "public, max-age=31536000, immutable";
    ~^/assets/site\. "public, max-age=31536000, immutable";
    ~^/assets/images/ "public, max-age=3600, must-revalidate";
    ~^/assets/icons/ "public, max-age=86400, stale-while-revalidate=604800";
    ~^/(?:content-manifest\.json|(?:en/|zh/)?search-index\.json)$ "public, max-age=0, must-revalidate";
}

server {
    listen 80;
    server_name example.edu;
    root /srv/brhk/dist;
    index index.html;

    location /en/ {
        try_files $uri $uri/ =404;
        error_page 404 /en/404.html;
    }
    location = /en/404.html { internal; }

    location /zh/ {
        try_files $uri $uri/ =404;
        error_page 404 /zh/404.html;
    }
    location = /zh/404.html { internal; }

    location / {
        try_files $uri $uri/ =404;
    }

    error_page 404 /404.html;
    location = /404.html { internal; }

    add_header Cache-Control $brhk_cache_control always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'self'; img-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; upgrade-insecure-requests" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
}
```

Nginx location matching matters: если добавляете другие regex locations, повторно проверьте cache/security headers и `try_files`.

### Apache HTTP Server

DocumentRoot указывает на `dist/`. Следующий пример предназначен для VirtualHost (директивы `<LocationMatch>` недоступны в `.htaccess`):

```apache
DirectoryIndex index.html
Options -Indexes -MultiViews
ErrorDocument 404 /404.html

<LocationMatch "^/en(?:/|$)">
  ErrorDocument 404 /en/404.html
</LocationMatch>
<LocationMatch "^/zh(?:/|$)">
  ErrorDocument 404 /zh/404.html
</LocationMatch>

<IfModule mod_headers.c>
  Header always set Content-Security-Policy "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'self'; img-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; upgrade-insecure-requests"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
</IfModule>

<FilesMatch "^(?:.*-[^.]+\.[0-9a-f]{12}\.(?:avif|gif|jpe?g|png|webp)|site\.[0-9a-f]{12}\.(?:css|js))$">
  <IfModule mod_expires.c>
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
  </IfModule>
  <IfModule mod_headers.c>
    Header set Cache-Control "public, max-age=31536000, immutable"
  </IfModule>
</FilesMatch>

<IfModule mod_headers.c>
  <LocationMatch "^/assets/images/">
    Header set Cache-Control "public, max-age=3600, must-revalidate"
  </LocationMatch>
  <LocationMatch "^/assets/icons/">
    Header set Cache-Control "public, max-age=86400, stale-while-revalidate=604800"
  </LocationMatch>
  <LocationMatch "^/(?:content-manifest\.json|(?:en/|zh/)?search-index\.json)$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </LocationMatch>
</IfModule>
```

Если доступен только `.htaccess`, оставьте общий `ErrorDocument 404 /404.html`; locale-specific error body потребует настройки VirtualHost у администратора сервера. Не добавляйте `FallbackResource /index.html` и generic rewrite всех запросов на главную. После конфигурации проверьте, что `/definitely-not-a-route/`, `/en/definitely-not-a-route/` и `/zh/definitely-not-a-route/` остаются настоящими `404` и получают ожидаемый язык документа.

### Простейший static hosting

Cloud object storage/CDN, GitHub Pages-подобный host или панель провайдера подходят, если поддерживают directory index и custom 404. Загрузите содержимое `dist/`, не сам каталог уровнем выше. На host без настоящего 404/headers сначала согласуйте ограничение: такой host не соответствует текущим критериям production.

## Проверка реального deployment

Локальная зелёная сборка не подтверждает production. Команды ниже показывают текущий трёхъязычный reference deployment; для одноязычного или частичного CMS build проверяйте тот же набор условий для каждой фактически включённой locale:

```bash
curl -I https://<deployment>/
curl -I https://<deployment>/education/
curl -I https://<deployment>/news/
curl -I https://<deployment>/sveden/
curl -I https://<deployment>/sveden/common/
curl -I https://<deployment>/en/sveden/common/
curl -I https://<deployment>/zh/sveden/common/
curl -I https://<deployment>/definitely-not-a-route/
curl -I https://<deployment>/en/definitely-not-a-route/
curl https://<deployment>/news/
curl https://<deployment>/en/news/
curl https://<deployment>/zh/news/
curl https://<deployment>/content-manifest.json
```

Проверить:

- все expected routes — `200 text/html`, unknown route — `404`;
- HTML до JS содержит unique title, description, canonical, основной текст, breadcrumbs и один `h1`;
- `html lang`, canonical, locale-preserving language links и `hreflang` соответствуют собранным `ru`/`en`/`zh-CN`; `x-default` присутствует только при включённой `ru`, а `/sveden/` остаётся доступен без префикса;
- URL в canonical/sitemap и каждом локализованном RSS построены из ожидаемого `SITE_URL`;
- search index каждой включённой locale содержит ссылки только этой locale; каждая версия страницы подключает свой manifest и search index;
- `robots.txt` и meta robots соответствуют `ALLOW_INDEXING`;
- CSS, JS, favicon, logo и каждый `src/srcset` — `200` с корректным MIME, не HTML fallback;
- media URL имеют `/assets/media/…<hash>…` и совпадают с manifest;
- нет `raw.githubusercontent.com`, внешнего image hotlink, console errors или broken images;
- `content-manifest.json` counts соответствуют опубликованной/нормализованной части CMS export; raw, filtered и причины исключения отдельно сверены по migration register;
- screenshots 390 и 1440 для home/news/education/sveden, `/sveden/managers/` и `/sitemap/`, плюс открытые mobile/desktop navigation и accessibility states;
- редакционная сетка проверена с portrait, landscape, square и no-media карточкой.
- основной контент каждой включённой EN/ZH locale не содержит непереведённую кириллицу; информационный перевод не обозначает русскоязычные юридические материалы официальными переводами.

## Git, promotion и rollback

GitHub push не является сам по себе доказательством deployment. После push в `main` запишите commit SHA, Vercel deployment ID и убедитесь, что именно этот deployment имеет `READY` и назначен production domain.

Перед promotion сохраните ID предыдущего рабочего deployment. При критической ошибке штатно promote/rollback предыдущую сборку, затем исправьте источник новым commit. Не переписывайте Git history и не возвращайте runtime loader.

Deployment завершён только после фиксации commit SHA, deployment ID, времени, HTTP-результатов, screenshots, test reports и известных контентных/правовых ограничений.
