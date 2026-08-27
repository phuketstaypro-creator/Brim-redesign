# Схема контента

Фактический frontend-контракт определён в `src/content/contracts.mjs`, `normalize.mjs` и `validate.mjs`. Это CMS-независимая runtime schema версии `1.0.0`, а не схема конкретной CMS. Все факты всё равно требуют проверки колледжем.

## `ContentBundle`

JSON adapter принимает полный объект:

```json
{
  "schemaVersion": "1.0.0",
  "site": {},
  "pages": {},
  "programs": [],
  "newsItems": [],
  "events": [],
  "employees": [],
  "documents": [],
  "svedenSections": [],
  "media": []
}
```

Все девять полей после нормализации присутствуют обязательно. `pages` — объект, остальные коллекции — массивы. Для совместимости normalizer также принимает:

- `pages` как массив записей с `route`, `href` или `path`;
- `news` вместо `newsItems`;
- `sveden` вместо `svedenSections`;
- `mediaAssets` вместо `media`;
- `media` как object keyed by ID.

В новом экспорте следует использовать канонические имена выше.

## Общие правила

- `schemaVersion` строго равен `1.0.0`.
- Внутренний route начинается и заканчивается `/`; запрещены `..`, backslash, query, fragment, пустые segments и protocol-relative URL.
- `id`/`slug` — 1–128 ASCII-символов: буквы, цифры, `.`, `_`, `-`; первый символ — буква или цифра.
- Дата — реальная календарная ISO date `YYYY-MM-DD` либо timezone-qualified ISO datetime.
- Неизвестное значение — `null` или отсутствие optional field; нельзя придумывать правдоподобный placeholder.
- `draft: true`, `published: false` и explicit status вне `published`/`live` удаляются до validation/render.
- Запись без workflow metadata считается опубликованной только ради совместимости с локальным adapter. CMS export должен передавать статус явно.
- Raw HTML не является разрешённым rich-text форматом.

## `site`

Validator и renderer требуют полноценную global model:

| Поле | Тип / обязательность |
|---|---|
| `name`, `shortName`, `title`, `description` | non-empty string |
| `locale`, `legalName`, `themeColor`, `utilityLabel` | non-empty string |
| `baseUrl` | HTTPS URL; HTTP допустим только для localhost |
| `assets.logo` | `{src, width, height, alt}`; first-party URL и positive intrinsic dimensions |
| `navigation`, `utilityNavigation`, `quickLinks`, `sideNavigation`, `footerNavigation`, `legalNavigation` | обязательные arrays из `NavItem` |
| `contacts` | object: `city`, non-empty string `addresses[]`, `phone`, `phoneHref`, `email`, `emailHref` |
| `footer` | object с non-empty `status`, `disclaimer` |
| `home` | обязательные structured sections главной |
| `gallery` | обязательный `GalleryItem[]` |

`home.hero` требует `eyebrow`, `title`, `description`, media ID `image`, `imageAlt` и `actions[]`. `ticker` — непустой string array. `about` требует section fields `index`/`label`/`title`/`lead`, manifest texts, media ID/alt/labels и `stats[]` с `value`/`label`. `education` и `news` требуют section fields с `lead`; `gallery` — без обязательного `lead`. `admission` дополнительно содержит `steps[]` с `title`, `description`, `href`, `linkLabel`.

Все navigation/action href должны быть безопасным внутренним route, HTTPS, `mailto:` или `tel:` URL. `site.gallery[]` требует media ID `image`, `alt`, `caption`; `compact` optional.

`SITE_URL` при build переопределяет `site.baseUrl` и удаляет завершающий `/`.

`NavItem`:

```json
{ "href": "/education/", "label": "Образование", "cta": false }
```

`GalleryItem.image`, `home.hero.image` и `home.about.image` дополнительно проверяются по общей media registry.

## `pages`

Каноническая форма — object keyed by route:

```json
{
  "/about/": {
    "kicker": "Колледж",
    "title": "О колледже",
    "description": "…",
    "image": "stage",
    "sections": [["Заголовок", "Текст"]]
  }
}
```

Validation требует безопасный уникальный route, `title` и `description`. Renderer понимает `kicker`, optional `image` media ID, `sections`, `gallery`, `documents`, `sveden`, `seoTitle` и специальные страницы `/education/`, `/news/`.

`pages['/documents/'].documents` в локальном наборе — только ожидаемые названия. Это не records и не активные ссылки. `/privacy/` и `/consent/` — неутверждённые рабочие шаблоны.

## `programs`

```json
{
  "id": "creative-industries",
  "href": "/creative-industries/",
  "code": "Дополнительная программа",
  "type": "Цифровое творчество",
  "title": "Школа креативных индустрий",
  "description": "…",
  "image": "studioPortrait",
  "imageAlt": "…",
  "primary": false,
  "status": "published"
}
```

Обязательны unique `id`, safe `href`, `code`, `type`, `title`, `description`, существующий media ID `image`, содержательный `imageAlt` и boolean `primary`. `primary: true` выводится как основная программа; `false` — внутри группы дополнительных программ. ШКИ и «Балет для всех» сохраняются как `primary: false`, а не выносятся в «Новые проекты».

## `newsItems`

| Поле | Тип / правило |
|---|---|
| `id`, `slug` | required unique ID |
| `href` | required safe route; обычно `/news/<slug>/` |
| `title`, `excerpt`, `category` | required non-empty strings |
| `publishedAt` | required ISO date или timezone-qualified datetime; оба формата корректно преобразуются в RSS `pubDate` |
| `updatedAt` | optional ISO date/datetime |
| `date` | локализованная UI-подпись; не используется для сортировки |
| `body` | required field; string, rich-text block array или `null` |
| `featured` | required boolean |
| `editorialVariant` | `featured`, `wide`, `portrait`, `square`, `standard` или `null` |
| `image`, `coverImage` | optional media ID; renderer принимает оба compatibility-поля |
| `alt`, `coverAlt` | содержательный alt; обязателен при наличии cover |
| `imageWidth`, `imageHeight` | positive integer при наличии cover |
| `coverCaption` | optional visible caption |
| `author` | optional; current renderer не выводит |
| `gallery` | array `{image, alt, caption?, compact?}` или `null`; media ID проверяется и галерея выводится в статье |
| `attachments` | array `{title, href}` или `null`; draft records фильтруются, URL проверяется |
| `seoTitle`, `seoDescription` | string или `null` |
| `source`, `sourceLabel` | обязательный HTTPS source и подпись при `contentStatus: source-linked` |
| workflow fields | `status`, `publicationStatus`, `published`, `draft` |

Если `editorialVariant` равен `null`, карточка выбирает portrait/landscape/square по `imageWidth:imageHeight` (или intrinsic размерам media). Запись без cover получает намеренную typographic no-media card; чужое изображение не подставляется.

Текущие шесть локальных записей имеют `body: null` и `contentStatus: 'source-linked'`; это карточки со ссылкой на источник, не перенесённые статьи.

## Rich-text blocks

Строка превращается в `<p>`. Массив может содержать:

```json
[
  { "type": "heading", "level": 2, "text": "Заголовок" },
  { "type": "paragraph", "text": "Текст" },
  { "type": "quote", "text": "Цитата" },
  { "type": "list", "ordered": false, "items": ["Первое", "Второе"] },
  { "type": "link", "href": "/documents/", "label": "Документы" }
]
```

Heading normalizes to `h2`, кроме явного level `3`. Link разрешён только root-relative или HTTPS. Текст экранируется; unsafe link и неизвестный block не рендерятся.

## `events`

Контракт проверяет unique `id`, `title`/`name`, optional ID-like `slug`, обязательный safe `href` и ISO fields `publishedAt`, `updatedAt`, `startsAt`, `endsAt`. Event renderer использует `href`, `title`, `description`, `category`, `date`/`startsAt`, `body`, cover fields, SEO и attachments.

Build выводит опубликованные records списком на `/events/` и создаёт отдельную HTML-страницу для каждого `href`. Локальная коллекция пуста, потому что подтверждённых событий нет.

## `employees`

Validator принимает unique `id`, `title` или `name` и optional `image`/`photo` media ID. `/sveden/employees/` выводит список из `name`/`title`, optional `role`/`position`, `department`, photo и alt. Отдельных employee detail routes нет. Локальная коллекция пуста; production fields всё равно нужно согласовать до импорта.

## `documents`

Validator принимает unique `id`, `title` или `name`, optional ISO `publishedAt`/`updatedAt`, optional safe root-relative/HTTPS/`mailto:`/`tel:` `href` и optional `image`/`thumbnail` media ID. `/documents/` публикует прошедшую publication normalization запись с непустым `href`; это включает `published` и `live`. Renderer также отображает `fileType` и `updatedAt`.

Локальная structured collection пуста. Не добавляйте record без настоящего файла, реквизитов, размера, MIME, provenance и accessibility status.

## `svedenSections`

```json
{
  "slug": "common",
  "href": "/sveden/common/",
  "title": "Основные сведения"
}
```

Обязательны unique `slug`, safe unique `href`, `title`. Набор должен содержать все 14 route из `SVEDEN_REQUIRED_ROUTES`; дополнительные записи допустимы. Для совпавшего детального route renderer использует optional `body`/`content` rich text, `sections` в формате page card grid и `documents`; если они пусты, отображается prototype content из `pages`.

Nested `documents` проверяются как records с обязательными `title` и безопасным `href`; draft/unpublished элементы фильтруются normalizer. Optional `sections` проверяются как пары `[title, description]`, а `body`/`content` проходят allowlist rich-text renderer с экранированием. Дополнительные поля конкретной CMS всё равно следует проверять в её доверенном adapter.

## `media`

Каждый `MediaAsset`:

```json
{
  "id": "stageHero",
  "sourcePath": "assets/images/stage.webp",
  "src": "/assets/images/stage.webp",
  "width": 1080,
  "height": 720,
  "defaultAlt": "Фактическое описание",
  "source": "https://example.org/provenance",
  "originalName": "original.jpg",
  "rightsStatus": "verification-required",
  "credit": null,
  "variants": [
    {
      "sourcePath": "assets/images/stage-480.webp",
      "src": "/assets/images/stage-480.webp",
      "width": 480,
      "height": 320
    }
  ],
  "mobile": null
}
```

Обязательны:

- unique safe `id`;
- root rendition и каждый variant: safe `sourcePath` относительно `public/`, root-relative `src`, positive intrinsic `width`/`height`;
- минимум один `variants[]`; desktop widths не дублируются;
- `defaultAlt`, `originalName`, `source`, `rightsStatus`;
- `credit`: string или `null`.

`source` — HTTPS provenance URL либо `repository:<safe-relative-path>`. Допустимые rights statuses:

```text
owned
licensed
public-domain
client-provided-pending-final-rights-check
verification-required
restricted
```

Optional `mobile` повторяет rendition fields и имеет собственный непустой `variants[]`. Build поддерживает `.avif`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.webp`, читает файлы только из `public/` и выпускает `/assets/media/<id>-<rendition>.<12-char-sha256>.<ext>`. До копирования build сверяет расширение с сигнатурой, проверяет структуру контейнера, извлекает intrinsic dimensions из bytes и требует их точного совпадения с объявленными `width`/`height`; HTML-ответ или усечённый файл останавливает сборку.

Поле `src` в input декларативное и валидируется как first-party URL; rendered `src/srcset` строятся заново из materialized files. Внешний `source` никогда не становится hotlink.

Неизвестный media ID в `site.home`, gallery, page, program, news, event, employee или document останавливает validation. Для новости без подтверждённого cover используйте `null`, а не ID чужого фото.

## Public route contract

`REQUIRED_ROUTES` — обязательное подмножество, а не полная allowlist. Итоговые routes: `/`, `Object.keys(pages)`, `newsItems[].href`, `events[].href`. Поэтому route count динамический. Missing required route, duplicate route или unsafe route — build error.

Точный список обязательных paths находится в `src/content/required-routes.mjs`; все 14 `/sveden/*` нельзя удалять при CMS mapping.
