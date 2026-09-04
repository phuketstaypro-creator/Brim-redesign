# Схема контента

Фактический frontend-контракт определён в `src/content/contracts.mjs`, `normalize.mjs` и `validate.mjs`. Это CMS-независимая runtime schema версии `1.0.0`, а не схема конкретной CMS. Все факты всё равно требуют проверки колледжем.

## `ContentBundle`

JSON adapter принимает полный объект:

Следующий JSON — сокращённый, намеренно не собираемый перечень top-level полей. Полный валидный reference bundle создаётся командой `npm run content:reference`.

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

Все поля исходного bundle присутствуют обязательно: отсутствие коллекции считается ошибкой adapter/export и не заменяется молча пустым массивом. `pages` — объект, остальные коллекции — массивы. Для совместимости normalizer также принимает:

- `pages` как массив записей с `route`, `href` или `path`;
- `news` вместо `newsItems`;
- `sveden` вместо `svedenSections`;
- `mediaAssets` вместо `media`;
- `media` как object keyed by ID.

В новом экспорте следует использовать канонические имена выше.

Для CMS с собственными переводами поддерживается внешний envelope `brhk-content-locales-v1`:

Следующий JSON также является сокращённым, намеренно не собираемым каркасом: каждое значение `locales` в реальном export должно быть полным валидным bundle из reference-примера.

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

`defaultLocale` строго равен `ru`, русский bundle обязателен, остальные ключи ограничены `en` и `zh`. Каждый bundle отдельно соответствует схеме ниже и имеет совпадающий `site.locale`. Между locale должны совпадать page/public routes, IDs всех коллекций, технические route/date/workflow поля, телефоны/email, document relations, media reference graph, provenance/rights и параметры media files. Переводимыми остаются редакционные тексты, alt, credit-подписи и SEO metadata.

## Общие правила

- `schemaVersion` строго равен `1.0.0`.
- Внутренний route начинается и заканчивается `/`; запрещены `..`, backslash, query, fragment, пустые segments и protocol-relative URL.
- `id`/`slug` — 1–128 ASCII-символов: буквы, цифры, `.`, `_`, `-`; первый символ — буква или цифра.
- Дата — реальная календарная ISO date `YYYY-MM-DD` либо timezone-qualified ISO datetime.
- Неизвестное значение — `null` или отсутствие optional field; нельзя придумывать правдоподобный placeholder.
- `draft`/`published` при наличии обязаны быть boolean, а `status`/`publicationStatus` — непустой строкой; строковые `"true"`/`"false"` отклоняются до фильтрации. Если CMS передаёт оба status-поля, их значения после trim/case normalization обязаны совпадать, иначе export отклоняется как неоднозначный.
- `draft: true`, `published: false` и любое из явно заданных status-полей вне `published`/`live` удаляют запись до content validation/render; malformed collection/record shape отклоняется ещё до normalizer и не может молча исчезнуть вместе с фильтрацией.
- Запись без workflow metadata считается опубликованной только ради совместимости с локальным adapter. CMS export должен передавать статус явно.
- Raw HTML не является разрешённым rich-text форматом.

## Locale-слой поверх `ContentBundle`

Схема `1.0.0` остаётся CMS-независимой и описывает один нормализованный logical content graph. Статический генератор публикует его в locale `ru`, `en` и `zh`: русский route не имеет префикса, английский получает `/en`, китайский (`html lang="zh-CN"`) — `/zh`. Поля `route`/`href`, `id`/`slug`, media ID и source paths являются общими стабильными идентификаторами и не переводятся.

В текущем локальном источнике перевод пользовательских строк выполняется `src/i18n/localize.mjs` по точному совпадению с `src/i18n/catalogs/en.mjs` или `zh.mjs`. UI-подписи живут отдельно в `src/i18n/config.mjs`; `render-context.mjs` и `routing.mjs` дают шаблонам сообщения и locale-aware ссылки. Неизвестная кириллическая строка в EN/ZH main content считается ошибкой сборки, поэтому exact-string каталоги нельзя считать fallback-механизмом для произвольного CMS-контента.

`CONTENT_LOCALES` принимает subset `ru,en,zh`. Plain `ContentBundle` обязан иметь `site.locale: "ru"`: для переводов нужен locale envelope. Для `CONTENT_ADAPTER=local` default — все три locale; для plain JSON default — `ru`, чтобы существующие экспорты схемы `1.0.0` продолжали собираться; для locale envelope default — все переданные bundles. Запрос отсутствующей locale останавливает build. EN/ZH для CMS включаются только после полного перевода публикуемых полей и редакционной проверки.

Logical routes не могут начинаться с зарезервированных сегментов `/en/` или `/zh/`: эти префиксы добавляет только генератор. Root-relative ссылки на файлы без завершающего `/` (например, `/uploads/order.pdf`) считаются общими deployment assets и не получают языковой префикс; принимающая CMS/build-цепочка обязана фактически положить такой файл в соответствующий публичный путь.

Английские и китайские тексты имеют информационный характер. Русскоязычные правовые материалы и утверждённые документы остаются авторитетными; перевод названия документа не подтверждает наличие или официальный статус документа.

## `site`

Validator и renderer требуют полноценную global model:

| Поле | Тип / обязательность |
|---|---|
| `name`, `shortName`, `title`, `description` | non-empty string |
| `locale`, `legalName`, `themeColor`, `utilityLabel` | non-empty string |
| `baseUrl` | HTTPS URL; HTTP допустим только для localhost |
| `assets.logo` | approved frontend-owned `{src, width, height, alt}`; `src=/assets/images/brhk-logo-full.png`, `1705×677`, локализуемый non-empty `alt` |
| `navigation` | обязательный array из `NavItem`; поддерживает один уровень `children` для серверно отрендеренного иерархического меню |
| `utilityNavigation`, `quickLinks`, `sideNavigation`, `footerNavigation`, `legalNavigation` | обязательные плоские arrays из `NavItem` |
| `usefulLinks`, `socialLinks` | плоские `NavItem[]` только с HTTPS URL; ради совместимости со схемой `1.0.0` отсутствующее поле нормализуется в `[]`; `usefulLinks` формирует карточки перед футером, `socialLinks` — ссылки колледжа в футере |
| `institutionalNavigation` | обязательный плоский `NavItem[]` для страниц «Сервисы и открытость», не являющихся автоматически подразделами приказа № 1493 |
| `officialNavigation` | обязательный плоский `NavItem[]` для проверенных внешних официальных ссылок |
| `contacts` | object: `city`, non-empty string `addresses[]`, `phone`, `phoneHref`, `email`, `emailHref` |
| `footer` | object с non-empty `status`, `disclaimer` |
| `home` | обязательные structured sections главной |
| `gallery` | обязательный `GalleryItem[]` |

`home.hero` требует `eyebrow`, `title`, `description`, media ID `image`, `imageAlt` и `actions[]`. `ticker` — непустой string array. `about` требует section fields `index`/`label`/`title`/`lead`, manifest texts, media ID/alt/labels и `stats[]` с `value`/`label`; необязательный `details[]` добавляет короткий список пояснений внутри карточки показателя. `education` и `news` требуют section fields с `lead`; `gallery` — без обязательного `lead`. `admission` дополнительно содержит `steps[]` с `title`, `description`, `href`, `linkLabel`.

Все navigation/action href должны быть безопасным внутренним route, HTTPS, `mailto:` или `tel:` URL. `site.gallery[]` требует media ID `image`, `alt`, `caption`; `compact` optional.

`SITE_URL` при build переопределяет `site.baseUrl` и удаляет завершающий `/`.

Плоский `NavItem`:

```json
{ "href": "/education/", "label": "Образование", "cta": false }
```

Группа верхнего уровня может не иметь собственного `href`, если содержит непустой `children`. Поддерживается только один уровень вложенности:

```json
{
  "label": "Образование",
  "children": [
    { "href": "/education/", "label": "Программы", "group": "Программы" },
    { "href": "/creative-industries/", "label": "Школа креативных индустрий", "group": "Программы" }
  ]
}
```

`label` обязателен; `href` должен быть безопасной ссылкой, `group` — непустой строкой, `cta` — boolean. Дочерний `children` у дочернего item отклоняется. Каждая внутренняя navigation-ссылка обязана указывать на реально существующий публичный route.

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

Validation требует безопасный уникальный route, `title`, `description` и array `sections` (он может быть пустым). Renderer понимает `kicker`, optional `image` media ID, boolean `gallery`, `documents`, boolean `sveden`, `seoTitle`, boolean `structureOnly`, boolean `siteMap` и специальные страницы `/education/`, `/news/`. Флаги специальных renderer-контрактов обязательны: `/sveden/` требует `sveden: true`, `/gallery/` — `gallery: true`, `/sitemap/` — `siteMap: true`; CMS export не может удалить или отключить их.

`structureOnly: true` означает, что утверждённое фактическое содержание не передано. Renderer в этом случае показывает явное предупреждение и не подменяет данные вымышленными документами, ссылками, ФИО или датами. `siteMap: true` включает серверно отрендеренную иерархию `site.navigation`; сейчас этот флаг используется на `/sitemap/`.

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

Обязательны unique `id`, safe `href`, `code`, `type`, `title`, `description`, существующий media ID `image`, содержательный `imageAlt` и boolean `primary`. `primary: true` выводится как основная программа; `false` — внутри группы дополнительных программ. Контракт требует записи с маршрутами `/creative-industries/` и `/ballet-for-all/` и сохраняет обе как `primary: false`: ШКИ и «Балет для всех» не выносятся в «Новые проекты».

## `newsItems`

| Поле | Тип / правило |
|---|---|
| `id`, `slug` | required unique ID |
| `href` | required safe route; обычно `/news/<slug>/` |
| `title`, `excerpt`, `category` | required non-empty strings |
| `publishedAt` | required ISO date или timezone-qualified datetime; оба формата корректно преобразуются в RSS `pubDate` |
| `updatedAt` | optional ISO date/datetime |
| `date` | optional string: локализованная UI-подпись; не используется для сортировки |
| `body` | required field; string, rich-text block array или `null` |
| `featured` | required boolean |
| `editorialVariant` | `featured`, `wide`, `portrait`, `square`, `standard` или `null` |
| `image`, `coverImage` | optional media ID; renderer принимает оба compatibility-поля |
| `alt`, `coverAlt` | содержательный alt; обязателен при наличии cover |
| `imageWidth`, `imageHeight` | positive integer при наличии cover |
| `coverCaption` | optional string: visible caption |
| `author` | optional string; current renderer не выводит |
| `gallery` | array `{image, alt, caption?, compact?}` или `null`; media ID проверяется и галерея выводится в статье |
| `attachments` | array `{title, href}` или `null`; draft records фильтруются, URL проверяется |
| `seoTitle`, `seoDescription` | optional string или `null` |
| `source`, `sourceLabel` | обязательный HTTPS source и подпись при `contentStatus: source-linked` |
| workflow fields | `status`, `publicationStatus`, `published`, `draft` |

Если `editorialVariant` равен `null`, карточка выбирает portrait/landscape/square по обязательным при cover `imageWidth:imageHeight`; renderer имеет защитный fallback на intrinsic размеры media, но валидный CMS export всё равно передаёт оба поля. Запись без cover получает намеренную typographic no-media card; чужое изображение не подставляется.

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

Heading normalizes to `h2`, кроме явного level `3`. Link разрешён только root-relative или HTTPS. Текст экранируется; unsafe link, неизвестный type и неполный block останавливают validation до рендера.

## `events`

Контракт проверяет unique `id`, обязательный `title`, optional ID-like `slug`, обязательный safe `href` и ISO fields `publishedAt`, `updatedAt`, `startsAt`, `endsAt`. Используемые renderer поля `description`, `category`, локализованный `date`, `seoTitle`, `seoDescription`, `coverCaption`, `alt` и `coverAlt` при наличии обязаны быть строками; cover требует непустой alt. Event renderer также поддерживает allowlist `body` и проверенные attachments.

Build выводит опубликованные records списком на `/events/` и создаёт отдельную HTML-страницу для каждого `href`. Локальная коллекция пуста, потому что подтверждённых событий нет.

## `employees`

Validator принимает unique `id`, `title` или `name` и optional `image`/`photo` media ID. Поля `role`, `position`, `department` и `alt` при наличии обязаны быть строками. `/sveden/employees/` сначала выводит проверенные `body`/`content`, `sections` и `documents` совпавшей записи `svedenSections[]`, затем список сотрудников. Ни одна из двух моделей не скрывает другую. Отдельных employee detail routes нет. Локальная коллекция пуста; production fields всё равно нужно согласовать до импорта.

## `documents`

Validator принимает unique `id`, обязательный `title`, optional ISO `publishedAt`/`updatedAt`, optional safe root-relative/HTTPS `href` и optional `image`/`thumbnail` media ID. При наличии `href` обязателен non-empty `fileType`, чтобы интерфейс не придумывал тип файла. `/documents/` публикует прошедшую publication normalization запись с `href`; это включает `published` и `live`, причём structured collection выводится даже без optional placeholder-поля `pages['/documents/'].documents`. Renderer также отображает `fileType` и `updatedAt`.

Локальная structured collection пуста. Схема `1.0.0` проверяет только перечисленные выше frontend-поля; реквизиты, byte size, точный MIME, checksum, provenance и accessibility status пока обязательны во внешнем migration register/приёмке, а не притворно валидируются этим контрактом. Не публикуйте record, пока эти сведения не проверены владельцем контента.

## `svedenSections`

```json
{
  "slug": "common",
  "href": "/sveden/common/",
  "title": "Основные сведения",
  "group": "mandatory"
}
```

Обязательны unique `slug`, safe unique `href`, `title` и `group`. Каждый `href` обязан иметь matching key в `pages`, иначе генератор не сможет выпустить страницу. Допустимы только `group: 'mandatory'` и `group: 'legacy'`. Набор `mandatory` обязан точно совпадать с 14 route из `SVEDEN_REQUIRED_ROUTES`: удалить, понизить или добавить пятнадцатый mandatory route нельзя. Дополнительные записи допустимы только с `group: 'legacy'`. Запись `/sveden/ovz/` сама обязательна как legacy-совместимость и сохраняет прежний адрес, направляя к объединённому `/sveden/objects/`; она не считается пятнадцатым обязательным подразделом.

Для совпавшего детального route renderer использует optional `body`/`content` rich text, `sections` в формате page card grid и `documents`; если они пусты, отображается page model из `pages`. Все 15 текущих маршрутов имеют server-rendered HTML, но страницы без официальных материалов помечены `structureOnly: true`.

Nested `documents` проверяются как records с обязательными `title`, `fileType` и безопасным `href`; draft/unpublished элементы фильтруются normalizer. Optional `sections` проверяются как пары `[title, description]`, а `body`/`content` проходят allowlist rich-text renderer с экранированием. Дополнительные поля конкретной CMS всё равно следует проверять в её доверенном adapter.

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

`REQUIRED_ROUTES` — обязательное подмножество, а не полная allowlist. Оно объединяет 16 `CORE_REQUIRED_ROUTES`, 14 юридически обязательных `SVEDEN_REQUIRED_ROUTES` и 37 сохранённых `PRESERVED_INFORMATION_ROUTES`. Последняя группа содержит legacy `/sveden/ovz/`, институциональные и тематические адреса, нужные для передачи текущей информационной архитектуры; она не означает, что все эти страницы являются подразделами приказа № 1493.

Итоговые logical routes: `/`, `Object.keys(pages)`, `newsItems[].href`, `events[].href`. В текущем local bundle их 73: 67 из `REQUIRED_ROUTES` и шесть news routes. Default local build создаёт 219 наполненных HTML-документов: 73 без префикса, 73 под `/en` и 73 под `/zh`. При подключении CMS logical route count остаётся динамическим. Missing required route, duplicate/unsafe route или locale route parity mismatch — build error.

Точный обязательный список находится в `src/content/required-routes.mjs`, а `docs/ROUTE-MAP.csv` перечисляет 73 logical routes один раз без дублирования языковых префиксов. При CMS mapping нельзя удалять ни один из 14 `SVEDEN_REQUIRED_ROUTES`; `/sveden/` и остальные русские адреса сохраняются без префикса, `/sveden/ovz/` сохраняется отдельно как legacy-совместимость, а институциональные страницы не должны ошибочно маркироваться обязательными подразделами специального раздела.
