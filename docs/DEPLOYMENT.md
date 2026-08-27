# Сборка и deployment

## Целевой артефакт

`npm run build` запускает `build.mjs` и создаёт воспроизводимый каталог `dist/`. В него входят:

- 36 физических публичных HTML-маршрутов;
- отдельный `404.html`;
- `sitemap.xml`;
- `rss.xml` с краткими source-linked публикациями и оговоркой о неперенесённых полных материалах;
- `search-index.json`;
- локальные публичные файлы;
- CSS и JavaScript с 12-символьным SHA-256 suffix в имени.

Для каждого route build проверяет ровно один `<h1>` и отсутствие `raw.githubusercontent.com` и пустого `<div id="app"></div>`. Это статический frontend: Vercel не должен выполнять серверный runtime или подставлять общий SPA document.

## Локальная сборка

Рекомендуемая версия — Node.js 24 (`.nvmrc`); `package.json` допускает `>=22 <25`.

```bash
npm ci
npm run build
npm run test
```

Для browser-проверок:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:a11y
```

`build.mjs` намеренно прекращает сборку, если отсутствует любой обязательный asset:

```text
assets/images/brhk-logo.png
assets/images/studio-tutu.webp
assets/images/studio-tutu-320.webp
assets/images/studio-tutu-landscape.webp
assets/images/studio-tutu-landscape-320.webp
assets/images/studio-tutu-square.webp
assets/images/studio-tutu-square-320.webp
assets/icons/favicon-32.png
assets/icons/apple-touch-icon.png
assets/icons/icon-192.png
assets/icons/icon-512.png
```

Этот fail-fast нельзя обходить пустыми файлами или случайными stock-изображениями. Нужны валидные локальные изображения с известными размерами и зафиксированными ограничениями provenance/rights.

## Vercel configuration

Целевые project settings:

| Setting | Value |
|---|---|
| Root directory | repository root |
| Production branch | `main` |
| Node.js | 24.x |
| Install | lockfile-based npm install |
| Build command | `npm run build` |
| Output directory | `dist` |
| Framework | Other / no runtime framework |

SPA rewrite на `/index.html` запрещён: он превращает неизвестные URL в soft-404 и скрывает физические страницы. Текущий `vercel.json` уже настроен на `npm ci` → `npm run build` → `dist`, не содержит rewrite и добавляет CSP, `nosniff`, frame, referrer и permissions headers.

Для `/assets/*` сейчас задано `public, max-age=604800, stale-while-revalidate=86400`. Политика не объявляет нехешированные изображения неизменяемыми. Если cache policy меняется, проверяйте отдельно хешированные CSS/JS и обновляемые media/manifest/robots/sitemap.

## Git integration

Предпочтительный процесс:

1. Подключить Vercel project именно к этому GitHub repository.
2. Проверить production branch `main`, root directory, build command и output directory.
3. Открыть pull request/рабочую ветку и проверить Preview deployment.
4. После всех проверок merge/push в `main`.
5. В Vercel убедиться, что новый deployment связан с ожидаемым commit SHA и имеет состояние `READY`.
6. Проверить production URL после promotion.

Наличие GitHub push не доказывает, что Git integration активна или что production обновился. Состояние подключения и доступ к нужному Vercel team/project в репозитории не зафиксированы; их должен подтвердить владелец проекта.

Если используется CLI fallback, сначала нужно отдельно согласовать и закрепить версию Vercel CLI, выполнить безопасный project link и получить scoped credentials через секреты CI/локальный login. `.vercel/`, токены и project credentials не коммитятся.

## Проверка deployment

Проверка проводится на финальном URL, а не только локально.

Минимальный HTTP-набор:

```bash
curl -I https://<deployment>/
curl -I https://<deployment>/education/
curl -I https://<deployment>/news/
curl -I https://<deployment>/sveden/
curl -I https://<deployment>/sveden/common/
curl -I https://<deployment>/definitely-not-a-route/
curl https://<deployment>/news/ | grep -i raw.githubusercontent.com
```

Ожидается:

- публичные маршруты — `200` и разные наполненные HTML-документы;
- неизвестный URL — реальный `404`;
- CSS/JS/images — корректный MIME type, не HTML fallback;
- HTML уже содержит title, description, canonical, breadcrumbs, основной текст и один `<h1>` без запуска JS;
- нет сетевых запросов к raw GitHub;
- headers фактически присутствуют в HTTP-ответах;
- sitemap/RSS/search index соответствуют deployed build;
- console не содержит ошибок и broken asset requests.

Затем выполняются screenshots как минимум для home, news, education и `/sveden/` на ширинах 390 и 1440 px, а также menu/accessibility states.

## Canonical и индексация

`site.baseUrl` сейчас равен `https://brim-redesign.vercel.app` и используется генератором sitemap/RSS/canonical. Это staging URL, а не подтверждение основного домена колледжа.

До запуска:

1. Заказчик утверждает основной canonical host и доступ к DNS.
2. `site.baseUrl` меняется одним commit.
3. Проверяются canonical, sitemap, RSS, redirects и HTTPS.
4. Только после письменного решения staging `Disallow: /` заменяется production robots policy.

## Rollback

Перед production promotion сохранить deployment ID и commit SHA предыдущей рабочей версии. При критической ошибке использовать штатный rollback/promote предыдущего deployment в Vercel, затем исправить источник отдельным commit. Не переписывать Git history и не восстанавливать runtime loader.

Deployment считается завершённым только после фиксации commit SHA, deployment ID, времени проверки, HTTP-результатов, screenshots и известных ограничений.
