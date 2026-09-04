# БРХК — CMS-независимый редизайн

Статически генерируемый frontend Бурятского республиканского хореографического колледжа. В принятой конфигурации локального адаптера `npm run build` создаёт в `dist/` отдельный наполненный HTML-документ для каждого публичного маршрута на русском, английском и китайском языках; CMS-сборка создаёт документы для каждой фактически включённой locale. JavaScript используется только для progressive enhancement меню, поиска, пользовательских настроек и точной упаковки новостной masonry-сетки; основной текст, ссылки, изображения и переключение языка уже присутствуют в HTML ответа.

В проекте нет CMS, базы данных, редакторской авторизации и server runtime. Контент поступает через проверяемый `ContentBundle`: либо из репозиторных модулей, либо из JSON-экспорта CMS на этапе сборки. Браузер не загружает исходники с GitHub и не обращается к CMS или внешним фотохостингам.

## Статус передачи

Визуальный редизайн и responsive-интерфейс приняты заказчиком 4 сентября 2026 года. Репозиторий готов к передаче как самостоятельный CMS-независимый frontend.

| Контрольная точка | Состояние |
|---|---|
| Основная ветка | `main` |
| Репозиторий | `https://github.com/phuketstaypro-creator/Brim-redesign` |
| Reference production | `https://brim-redesign.vercel.app` |
| Принятый визуальный baseline | commit `35e99f8`, deployment `dpl_8w4FoDVA2BF8aT7FF5msvPCG4UbB` |
| Финальная handoff-запись | [GitHub Release `handoff-2026-09-04`](https://github.com/phuketstaypro-creator/Brim-redesign/releases/tag/handoff-2026-09-04): точный SHA, CI, deployment и production evidence |
| Серверный HTML | 73 logical routes × 3 locale = 219 документов в текущем local snapshot |
| Проверки baseline | 40 Node tests, 23 browser tests, 16 axe scenarios, 23 visual scenarios |
| CMS | не входит в репозиторий; подключается через документированную content boundary |
| Индексация reference production | закрыта (`noindex`, `Disallow: /`) до утверждения основного домена, контента и медиаправ |

Приёмка редизайна означает готовность интерфейса и frontend-кода. Она не означает, что в репозиторий уже перенесены закрытые данные действующей CMS, официальный архив документов или неподтверждённые персональные данные. Команда действующего сайта должна подключить их через адаптер, не переписывая шаблоны и не заполняя пробелы вымышленными сведениями.

Идентификаторы финального commit/deployment нельзя корректно «вписать в самих себя» до создания commit. Поэтому неизменяемая release-запись хранится в привязанном к точному SHA GitHub Release; README сохраняет принятый визуальный baseline и стабильную ссылку на актуальное доказательство передачи.

## Быстрый старт из чистого клона

```bash
git clone https://github.com/phuketstaypro-creator/Brim-redesign.git
cd Brim-redesign
git switch main
git pull --ff-only

nvm install 24
nvm use 24
npm ci
npx playwright install chromium
npm run verify
npm run dev -- --watch
```

Локальный адрес — `http://127.0.0.1:4173`. `npm run verify` повторяет полный набор contract, build, browser, accessibility и visual проверок. Обычный `npm run dev` собирает сайт один раз; флаг `--watch` пересобирает его при изменениях в `src/` и `public/`.

`.env.example` — только перечень настроек. Node-скрипты намеренно не загружают `.env`/`.env.local` автоматически: задавайте переменные в shell, CI или настройках hosting-проекта и не коммитьте секреты.

## Что реализовано

- `CONTENT_ADAPTER=local` — текущие данные из `src/data/*.mjs`;
- `CONTENT_ADAPTER=json` + `CMS_CONTENT_FILE` — полный JSON-экспорт той же схемы;
- нормализация, фильтрация draft-записей и fail-fast validation до рендера;
- русские logical routes сохраняются без префикса, английские публикуются под `/en/`, китайские (`zh-CN`) — под `/zh/`; языковой переключатель сохраняет текущий logical route;
- UI-сообщения, настройки locale и маршрутизация находятся в `src/i18n/config.mjs`, `render-context.mjs` и `routing.mjs`, а переводы текущего локального контента — в exact-string каталогах `src/i18n/catalogs/`;
- обязательные маршруты проверяются как неизменяемое подмножество, а опубликованные новости и события могут добавлять произвольное количество собственных маршрутов;
- ссылки на медиа задаются строгими ID; неизвестный ID останавливает сборку;
- разрешённые локальные медиа копируются в `dist/assets/media/` под URL с SHA-256-фрагментом; runtime hotlink отсутствует;
- безопасный набор rich-text blocks для тел новостей и событий;
- официальный логотип БРХК сохранён в header, footer и производных favicon/icon;
- глобальный блок «Полезные ссылки» и ссылки колледжа на ВКонтакте/MAX рендерятся из CMS-нейтральной модели `site` без сторонних виджетов;
- редакционная masonry-сетка измеряет натуральную высоту portrait, landscape, square и карточек без изображения, укладывает их в две независимые колонки без пустых полос и имеет читаемый CSS fallback без JavaScript;
- `/sveden/` и 14 обязательных подразделов входят в route contract; `/sveden/ovz/` сохранён отдельно как legacy-адрес и ведёт к объединённому подразделу `/sveden/objects/`;
- иерархическое меню и `/sitemap/` включают сохранённые тематические и институциональные разделы, но не выдают пустую структуру за опубликованные официальные сведения;
- ШКИ и «Балет для всех» остаются дополнительными программами внутри раздела образования;
- блока «Новые проекты» нет.

## Как подключить действующую CMS

Главная точка интеграции — объект `ContentBundle`, описанный в `src/content/contracts.mjs` и [CONTENT-SCHEMA.md](docs/CONTENT-SCHEMA.md). Шаблоны не знают название CMS: сначала доверенный build-шаг преобразует данные CMS в этот контракт, затем `normalizeContent` и `validateContent` проверяют их до генерации HTML.

Рекомендуемый путь не требует менять frontend-код:

1. Создать неизменяемый export опубликованных данных из действующей CMS.
2. Сопоставить типы CMS с полями `ContentBundle` по таблице ниже.
3. Скопировать разрешённые оригиналы и responsive renditions в `public/` внутри временного build checkout.
4. Записать полный JSON вне `public/`, например в `content/export.json`.
5. Выполнить validation и полный test build с `CONTENT_ADAPTER=json`.
6. Сверить опубликованные/нормализованные CMS counts, routes и media со сгенерированным `dist/content-manifest.json`; причины отбрасывания draft/unpublished записей учитывать отдельно в migration register.
7. Проверить Preview по HTTP, screenshots и accessibility; только после этого публиковать production.

Эталон текущего контракта можно получить одной командой. Файл создаётся в игнорируемом Git каталоге `artifacts/` и нужен только как пример формы данных:

```bash
npm run content:reference
# artifacts/content-bundle.reference.json
```

| Тип данных действующей CMS | Поле frontend-контракта | Что сохранять стабильным |
|---|---|---|
| Настройки сайта, меню, контакты, главная | `site` | внутренние URL и контакты; approved logo asset остаётся frontend-owned |
| Обычные страницы | `pages` | ключ-route вида `/about/` |
| Образовательные программы | `programs[]` | `id`, `href`, `primary` |
| Новости | `newsItems[]` | `id`, `slug`, `href`, дата, media ID |
| Афиша/события | `events[]` | `id`, `href`, даты начала/окончания |
| Сотрудники | `employees[]` | `id`, должность, подразделение, photo ID |
| Документы | `documents[]` | `id`, настоящий `href`, тип и дата файла |
| Специальный раздел | `svedenSections[]` | все 14 mandatory routes и `group` |
| Фото и варианты | `media[]` | `id`, локальные файлы, реальные размеры, права |

Для русского export достаточно обычного полного `ContentBundle`. Он обратно совместим со схемой `1.0.0` и по умолчанию собирается только для `ru`. Для CMS с собственными английскими и китайскими полями используйте locale envelope: каждая locale передаёт уже переведённый полный bundle, а стабильные ID, logical routes и media references остаются одинаковыми.

Следующий JSON — намеренно сокращённый, не собираемый каркас envelope. Полный валидный пример текущих данных создаёт `npm run content:reference`; для envelope нужно поместить такие полные bundles в `locales`.

```json
{
  "format": "brhk-content-locales-v1",
  "defaultLocale": "ru",
  "locales": {
    "ru": { "schemaVersion": "1.0.0", "site": {}, "pages": {}, "programs": [], "newsItems": [], "events": [], "employees": [], "documents": [], "svedenSections": [], "media": [] },
    "en": { "schemaVersion": "1.0.0", "site": {}, "pages": {}, "programs": [], "newsItems": [], "events": [], "employees": [], "documents": [], "svedenSections": [], "media": [] },
    "zh": { "schemaVersion": "1.0.0", "site": {}, "pages": {}, "programs": [], "newsItems": [], "events": [], "employees": [], "documents": [], "svedenSections": [], "media": [] }
  }
}
```

Тексты `src/i18n/catalogs/*.mjs` относятся только к принятому repository-managed snapshot. Не расширяйте exact-string каталоги при каждой публикации CMS: для постоянно обновляемых переводов экспортируйте locale envelope из самой CMS.

Если CMS не умеет формировать JSON, добавьте один доверенный adapter в `src/content/adapters/` и статически зарегистрируйте его рядом с `local`/`json` в `src/content/load-content.mjs`. Adapter должен только получить данные и вернуть JSON-like `ContentBundle`; в нём нельзя рендерить HTML, обращаться к DOM или передавать секреты в браузер. Не загружайте путь к произвольному JavaScript-модулю из environment variable.

Публикация в CMS должна запускать новую статическую сборку через настроенный принимающей командой CI job/build hook. В production не требуется Node.js или соединение с CMS: web-server отдаёт только `dist/`. Редакторский preview черновиков остаётся функцией действующей CMS либо отдельной защищённой интеграцией; публичная сборка отбрасывает draft/unpublished records.

Полная пошаговая спецификация: [CMS-INTEGRATION.md](docs/CMS-INTEGRATION.md). Поля всех коллекций: [CONTENT-SCHEMA.md](docs/CONTENT-SCHEMA.md). Перенос архива и URL: [CONTENT-MIGRATION.md](docs/CONTENT-MIGRATION.md).

## Текущий статус контента

- Локальный набор содержит шесть `source-linked` новостей. Полные тексты, авторы, галереи и вложения не перенесены; четыре записи пока ссылаются на корень официального сайта, а не на подтверждённый permalink.
- `events`, `employees` и структурированная коллекция `documents` намеренно пусты: проверенные записи и файлы не получены. Страница документов показывает только ожидаемые названия без активных ссылок.
- Текущий локальный bundle содержит 73 logical routes: 67 маршрутов зафиксированы в `REQUIRED_ROUTES`, ещё шесть относятся к `source-linked` новостям. При трёх locale это 219 отдельных наполненных HTML-документов. Общее число logical routes остаётся динамическим при подключении CMS.
- `/sveden/*` содержит 14 обязательных подразделов и отдельный legacy-адрес `/sveden/ovz/`, но не импортированные официальные сведения и документы. Руководство и педагогический состав разделены, а материально-техническое обеспечение и доступная среда объединены в `/sveden/objects/`.
- Тематические страницы старой структуры, для которых официальные материалы не переданы, помечены `structureOnly: true` и прямо сообщают посетителю, что это только готовая структура будущего раздела.
- `/privacy/` и `/consent/` — рабочие шаблоны, не утверждённые локальные акты.
- Основной canonical-домен заказчиком не подтверждён. По умолчанию используется staging URL, а индексация закрыта.
- Сценические фотографии импортированы из предоставленной заказчиком папки Yandex Disk. В модели стоит статус `client-provided-pending-final-rights-check`: до публичного запуска всё ещё нужны подтверждение права публикации и необходимые согласия изображённых лиц. Фотограф не указан, потому что источник его не сообщает.
- Происхождение и ограничения всех файлов перечислены в [реестре медиаправ](docs/ASSET-LICENSES.md).
- Английский и китайский переводы предназначены для информирования. Русскоязычные нормативные материалы, документы и утверждённые сведения остаются авторитетной версией; перевод не превращает рабочий шаблон или непроверенную структуру в официальный документ.

Наличие файла или карточки в сборке не означает завершённую фактическую, редакционную или юридическую проверку.

## Структура обязательных сведений

Проект различает три категории и не смешивает их в один юридический список:

1. 14 обязательных подразделов специального раздела — `SVEDEN_REQUIRED_ROUTES`;
2. `/sveden/ovz/` — сохранённый адрес прежней структуры, а не пятнадцатый обязательный подраздел;
3. институциональные и тематические страницы — безопасность, СОУТ, противодействие коррупции, психологическая служба, независимая оценка качества и другие пользовательские разделы со своими основаниями публикации.

СОУТ размещается на `/documents/sout/` как отдельная обязанность работодателя и не обозначается подразделом структуры приказа Рособрнадзора № 1493. Утверждённые сведения специального раздела должны обновляться не позднее десяти рабочих дней после изменения. Актуальная правовая классификация и ссылки на официальные источники приведены в [LEGAL-INTEGRATION.md](docs/LEGAL-INTEGRATION.md).

## Требования и команды

- Node.js 24 рекомендуется через `.nvmrc`;
- допустимый диапазон в `package.json`: Node.js `>=22 <25`;
- установка зависимостей — только по `package-lock.json`.

```bash
npm ci
npm run dev
```

Проверки:

```bash
npm run build
npm run validate:content
npm run verify:cms
npm run verify
npm run test
npm run test:content
npm run test:e2e
npm run test:a11y
npm run test:visual
```

`npm run validate:content` проверяет выбранный adapter без генерации `dist/`. `npm run verify:cms` — adapter-aware проверка выбранного CMS export: validation, build и сверка всех routes/internal files из manifest. `npm run verify` — полный regression gate принятого repository-managed snapshot, объединяющий Node, browser, axe и visual проверки; запускайте его без `CONTENT_*` overrides. Текущие browser-сценарии частично привязаны к local fixture и трём locale, поэтому фактический CMS Preview дополнительно требует своей sample matrix/ручной приёмки. `npm run build` очищает только корневой `dist/` и генерирует локализованные HTML-маршруты и `404.html`, общий `sitemap.xml`, отдельные для каждой locale `rss.xml`, `search-index.json` и `manifest.webmanifest`, `content-manifest.json`, хешированные CSS/JS и хешированные first-party media. Количество logical routes зависит от опубликованных записей и не зафиксировано числом. `dist/` не редактируется вручную.

## Выбор источника контента

Без переменных окружения используется локальный адаптер:

```bash
npm run build
```

Для подготовленного JSON-файла внутри каталога проекта:

```bash
CONTENT_ADAPTER=json \
CMS_CONTENT_FILE=content/export.json \
CONTENT_LOCALES=ru \
SITE_URL=https://example.edu \
ALLOW_INDEXING=false \
npm run verify:cms
```

В PowerShell:

```powershell
$env:CONTENT_ADAPTER = 'json'
$env:CMS_CONTENT_FILE = 'content/export.json'
$env:CONTENT_LOCALES = 'ru'
$env:SITE_URL = 'https://example.edu'
$env:ALLOW_INDEXING = 'false'
npm run verify:cms

# Убрать CMS overrides перед regression-проверкой repository snapshot:
Remove-Item Env:CONTENT_ADAPTER, Env:CMS_CONTENT_FILE, Env:CONTENT_LOCALES, Env:SITE_URL, Env:ALLOW_INDEXING -ErrorAction SilentlyContinue
npm run verify
```

Для locale envelope после проверки переводов замените `CONTENT_LOCALES=ru` на `CONTENT_LOCALES=ru,en,zh`. Обычный одноязычный JSON и новый envelope используют один `CONTENT_ADAPTER=json`; формат определяется по явному полю `format`.

Основные переменные описаны в `.env.example`:

| Переменная | Назначение |
|---|---|
| `CONTENT_ADAPTER` | `local` (default) или `json` |
| `CMS_CONTENT_FILE` | Путь к полному `.json`-экспорту внутри проекта; нужен только для `json` |
| `CONTENT_LOCALES` | Comma-separated subset `ru,en,zh`; `local` по умолчанию собирает все три, plain JSON — `ru`, locale envelope — все переданные locale |
| `SITE_URL` | HTTPS origin для canonical, sitemap и RSS, без завершающего `/` |
| `ALLOW_INDEXING` | Только `true` включает `index, follow` и `Allow: /`, причём build потребует разрешённый rights status для всех media; любое другое значение оставляет review-сборку в `noindex` |

Файл `.env.example` — образец, а не секрет и не автоматический loader. Передавайте значения через окружение shell, CI или Vercel project settings. Не включайте `en`/`zh` только ради наличия переключателя: locale envelope должен содержать полные проверенные bundles для этих языков. Exact-string механизм `src/i18n/localize.mjs` применяется к repository-managed snapshot и строго останавливает сборку, если для него отсутствует перевод.

## Структура

```text
build.mjs                       статический генератор
src/content/                    contracts, adapters, normalization, validation, media materialization
src/content/adapters/local.mjs  адаптер репозиторных модулей
src/content/adapters/json.mjs   адаптер plain JSON или locale-envelope экспорта
src/data/                       текущий локальный ContentBundle
src/i18n/                       locale config, UI messages, exact-string catalogs и маршрутизация
src/templates/                  HTML-шаблоны и безопасный rich text
src/styles/                     визуальная система и редакционная сетка
src/client/                     progressive enhancement
public/                         first-party исходники, логотип и icons
tests/                          contract, HTML, browser, a11y и visual проверки
docs/                           документация передачи и интеграции
dist/                           воспроизводимый build artifact
```

## Передача и deployment

Vercel выполняет `npm ci` → `npm run build` и публикует только `dist/`. Такой же каталог можно разместить на Nginx, Apache или любом static hosting без Node.js в production. SPA rewrite запрещён: неизвестный URL должен возвращать настоящий `404`, а не главную страницу.

`docs/ROUTE-MAP.csv` содержит ровно 73 logical routes и не дублирует их по языкам. Публичные соответствия вычисляются одинаково: `/sveden/` → `/en/sveden/` → `/zh/sveden/`; исходный `/sveden/` не перенаправляется и не удаляется.

### Кто и что разворачивает

- CMS-команда отвечает за export/mapping, media ingestion, публикационные статусы и запуск новой сборки после публикации.
- Frontend build отвечает за validation, маршруты, HTML, assets, sitemap/RSS/search, security-safe rich text и отказ при нарушении контракта.
- Web-server отвечает за HTTPS, directory indexes, корректные MIME/cache/security headers и настоящий HTTP `404`.
- Редакция/колледж отвечает за фактическую точность, документы, персональные данные, переводы, права на изображения и решение об индексации.

GitHub Actions в этом репозитории выполняет проверки, но не содержит production secrets и сам не публикует Vercel deployment. На момент передачи Git Integration текущего Vercel-проекта отсутствует. Принимающая команда должна выбрать и зафиксировать один authoritative путь: подключить Git Integration к `main` либо использовать gated CLI/CI release после успешного GitHub CI. Нельзя считать один `git push` доказательством публикации.

Для доступа к текущему reference-проекту нужны membership/credentials владельца Vercel team:

| Ресурс | Значение |
|---|---|
| Scope | `alexs-projects-1afb20f9` |
| Team ID | `team_WDRk3REaJ9Y0gHComAvNnSde` |
| Project | `brim-redesign` |
| Project ID | `prj_upvQFsxC7qs5LmZLRloSFhlCOulh` |
| Production domain | `brim-redesign.vercel.app` |

Первичная привязка CLI:

```bash
npx vercel@59.3.0 login
npx vercel@59.3.0 whoami
npx vercel@59.3.0 teams ls
npx vercel@59.3.0 link --yes --project brim-redesign --scope alexs-projects-1afb20f9
```

Рекомендуемый gated release: дождаться зелёного CI для точного SHA, собрать deployment без переключения production-домена, проверить его, затем выполнить promotion.

```bash
SHA=$(git rev-parse HEAD)

npx vercel@59.3.0 pull --yes --environment=production --scope alexs-projects-1afb20f9
npx vercel@59.3.0 build --prod

DEPLOYMENT_URL=$(npx vercel@59.3.0 deploy \
  --prebuilt \
  --prod \
  --skip-domain \
  --meta commitSha="$SHA" \
  --meta gitBranch=main)

npx vercel@59.3.0 inspect "$DEPLOYMENT_URL"
PLAYWRIGHT_BASE_URL="$DEPLOYMENT_URL" npm run test:e2e
PLAYWRIGHT_BASE_URL="$DEPLOYMENT_URL" npm run test:a11y
PLAYWRIGHT_BASE_URL="$DEPLOYMENT_URL" npm run test:visual
npx vercel@59.3.0 promote "$DEPLOYMENT_URL"
```

PowerShell использует ту же последовательность, но переменные задаются через `$env:NAME` и `$deploymentUrl = ...`. Для сборки с Vercel environment без автоматической загрузки `.env` используйте `npx vercel@59.3.0 env run -e preview -- npm run build`.

После promotion проверьте как минимум `/`, `/education/`, `/news/`, `/sveden/`, `/sveden/common/`, соответствующие `/en/` и `/zh/` URL, `content-manifest.json`, все assets и заведомо неизвестный URL со статусом `404`. При критической ошибке верните предыдущий проверенный deployment:

```bash
npx vercel@59.3.0 rollback <previous-deployment-id-or-url> --scope alexs-projects-1afb20f9
```

На другом сервере Vercel-доступы не нужны: выполните проверенную сборку и сделайте содержимое `dist/` document root. Готовые Nginx и Apache примеры находятся в [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Неприкосновенные условия принятого дизайна

- не возвращать блок «Новые проекты»;
- ШКИ и «Балет для всех» оставлять дополнительными программами внутри образования;
- сохранять официальный полный логотип в header/footer и официальные favicon/icons;
- сохранять двухколоночную журнальную news masonry-сетку на desktop и телефоне, включая portrait/landscape/square/no-media cards;
- не удалять `/sveden/` и 14 обязательных подразделов; `/sveden/ovz/` оставлять legacy-адресом, а не пятнадцатым обязательным подразделом;
- не превращать все URL в SPA rewrite и не переносить основной контент обратно в JavaScript;
- не подключать внешние шрифты, фото-хотлинки, аналитику, виджеты или новую CMS без отдельного решения;
- не публиковать вымышленные факты, ФИО, документы, даты, контакты или права на изображения;
- сохранять `data-cms-*` markers либо документировать их эквивалент, если принимающая CMS требует свои edit hooks.

## Состав передачи

- исходный код и lockfile в `main`;
- воспроизводимая Node 24 SSG-сборка без server runtime;
- local и JSON content adapters, validation и locale-aware export contract;
- HTML/CSS/JS templates и first-party media pipeline;
- 73-route logical map и обязательные `/sveden/` contracts;
- GitHub CI, Node/browser/axe/visual тесты;
- Vercel и обычные static-server инструкции;
- реестр медиаправ, accessibility и правовой integration checklist.

Не входят и должны быть переданы принимающей стороне отдельно: credentials/экспорт действующей CMS, полный архив записей и файлов, утверждённый redirect map, официальный production-домен/DNS, секреты hosting-проекта и документы, которых нет в официально подтверждённых источниках. В репозитории также нет файла `LICENSE`: правовой режим исходного кода и условия его дальнейшей передачи определяются договором/правообладателем и должны быть подтверждены заказчиком, а не придуманы разработчиками.

Подробности:

- [CMS integration](docs/CMS-INTEGRATION.md)
- [Content schema](docs/CONTENT-SCHEMA.md)
- [Content migration](docs/CONTENT-MIGRATION.md)
- [Asset licenses](docs/ASSET-LICENSES.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Accessibility](docs/ACCESSIBILITY.md)
- [Route map](docs/ROUTE-MAP.csv)
- [Legal integration](docs/LEGAL-INTEGRATION.md)

Frontend и принятый редизайн готовы к передаче. Подключение данных конкретной CMS считается отдельным завершённым этапом только после реального export/API mapping, content diff, утверждённых документов и медиаправ, production canonical, HTTP-проверок, screenshots и доступностной проверки deployed URL.
