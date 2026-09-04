# Интеграция с действующей CMS

## Граница ответственности

Репозиторий содержит CMS-независимый статический frontend. В нём нет административной панели, базы данных, редакторской авторизации, CMS SDK или production backend. Название и версия действующей CMS, API contract, credentials и тестовый экспорт пока не предоставлены, поэтому совместимость с конкретной системой ещё не подтверждена.

Единая граница интеграции — `ContentBundle` из `src/content/contracts.mjs`. Любой источник сначала превращается в этот объект, затем проходит `normalizeContent` и `validateContent`, и только после этого попадает в шаблоны.

```text
CMS/export или src/data/*.mjs
              ↓ build-time adapter
          ContentBundle
              ↓ normalize + validate
       locale content mapping
      ↓ ru          ↓ en/zh
        media materialization
              ↓ templates
dist/<locale-route>/index.html + first-party assets
```

Публичный браузер не запрашивает CMS, raw GitHub, Yandex Disk или стороннюю галерею. CMS credentials и исходный экспорт не должны попадать в `dist/`; это требует хранить export вне `public/`.

## Встроенные адаптеры

### `local`

Это default. `src/content/adapters/local.mjs` собирает репозиторные модули:

| Поле `ContentBundle` | Локальный источник |
|---|---|
| `site` | `src/data/site.mjs` |
| `pages` | `src/data/pages.mjs` |
| `programs` | `src/data/programs.mjs` |
| `newsItems` | `src/data/news.mjs` |
| `events` | `src/data/events.mjs` |
| `employees` | `src/data/employees.mjs` |
| `documents` | `src/data/documents.mjs` |
| `svedenSections` | `src/data/sveden.mjs` |
| `media` | `src/data/media.mjs` |

Глобальная модель `site` также содержит проверяемые коллекции `usefulLinks` для карточек государственных ресурсов перед футером и `socialLinks` для текстовых ссылок колледжа в футере. Обе коллекции используют обычную форму `{href, label}`, принимают только HTTPS URL, рендерятся на сервере и не подключают сторонние виджеты или скрипты социальных сетей. Для обратной совместимости JSON schema `1.0.0` отсутствие любого из этих новых полей нормализуется в пустой массив.

```bash
CONTENT_ADAPTER=local npm run build
```

### `json`

`src/content/adapters/json.mjs` читает полный JSON-экспорт. Для одного русского набора корень файла — обычный `ContentBundle` с `site.locale: "ru"`; plain bundle с другой locale отклоняется, для переводов используется envelope ниже:

```bash
CONTENT_ADAPTER=json CMS_CONTENT_FILE=content/export.json npm run build
```

Ограничения реализованы намеренно:

- `CMS_CONTENT_FILE` обязателен и должен указывать на обычный `.json`-файл;
- путь и его realpath должны оставаться внутри корня проекта;
- максимальный размер — 25 MiB;
- корень JSON должен быть объектом;
- JavaScript из environment variable не импортируется и не выполняется;
- JSON должен содержать полный bundle, а не частичный patch; отсутствие любой top-level коллекции останавливает validation вместо молчаливой замены на `[]`.

Размещайте export, например, в `content/export.json`, но никогда не внутри `public/`: build копирует `public/` целиком в `dist/`. JSON adapter сам не публикует файл, однако файл, ошибочно положенный в `public/`, станет публичным обычным asset.

Для CMS, уже хранящей переводы, тот же adapter принимает opt-in envelope. Каждое значение `locales` — самостоятельный полный `ContentBundle`, уже переведённый редакцией CMS:

Следующий JSON — сокращённый, намеренно не собираемый каркас envelope. Получите полный валидный русский reference bundle командой `npm run content:reference`, затем сопоставьте такие же полные bundles для каждой передаваемой locale.

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

Envelope требует `defaultLocale: "ru"`, явный русский bundle и только ключи `ru`, `en`, `zh`. `site.locale` каждого bundle обязан совпадать с ключом. Все bundles проходят обычные normalization/validation, а затем cross-locale parity: одинаковые page/public routes, stable collection IDs, slug/href/date/workflow fields, телефоны/email, document relations, media IDs/reference graph, provenance/rights и технические параметры файлов. Пользовательские тексты, alt, credit-подписи и SEO metadata могут отличаться. Неполный перевод не подменяется русским и останавливает сборку при запросе этой locale.

Встроенного удалённого API adapter нет. Практичный первый способ интеграции — получить CMS export отдельным доверенным CI-шагом, положить JSON и разрешённые media files внутрь checkout, затем выполнить обычную сборку. Если нужен прямой API, добавьте доверенный adapter в `src/content/adapters/`, статически зарегистрируйте его имя и import в `src/content/load-content.mjs`, добавьте имя в `SUPPORTED_CONTENT_ADAPTERS` и покройте полный build отдельным тестом по образцу JSON adapter. Не добавляйте путь к произвольному модулю в environment variable и не вызывайте adapter отдельным скриптом, который обходит `build.mjs`.

## Environment contract

| Переменная | Поведение |
|---|---|
| `CONTENT_ADAPTER` | `local` по умолчанию; второе допустимое значение — `json` |
| `CMS_CONTENT_FILE` | Путь внутри проекта; используется только адаптером `json` |
| `CONTENT_LOCALES` | Comma-separated subset `ru,en,zh`; `local` без значения собирает все три, plain JSON — `ru`, locale envelope — все переданные locale |
| `SITE_URL` | При наличии заменяет `site.baseUrl`; завершающие `/` удаляются |
| `ALLOW_INDEXING` | Только case-insensitive `true` разрешает индексацию |

`SITE_URL` должен быть HTTPS URL; HTTP разрешён validator только для localhost. Он определяет canonical, sitemap, RSS и ссылки в robots. Пока основной домен не утверждён, оставляйте `ALLOW_INDEXING=false`.

`.env.example` документирует значения, но Node-скрипт сам `.env` не загружает. Настройте переменные в shell, CI или Vercel project settings.

## Мультиязычный контракт

Русский — locale по умолчанию и сохраняет исходные адреса без префикса. Английский публикуется под `/en/`, китайский с HTML locale `zh-CN` — под `/zh/`. Это статические представления одного набора logical routes: например, `/news/`, `/en/news/` и `/zh/news/` относятся к одной странице. Переключатель языка строится сервером и сохраняет logical route; JavaScript для перехода не требуется. Canonical указывает на текущую locale-версию, `hreflang` связывает фактически собранные варианты, а `x-default` указывает на русский адрес только если `ru` входит в выбранный subset.

Текущая реализация разделяет два типа переводов:

- `src/i18n/config.mjs` содержит locale metadata и UI messages; `render-context.mjs` передаёт их шаблонам, `routing.mjs` добавляет/снимает языковые префиксы;
- `src/i18n/localize.mjs` переводит строки текущего репозиторного `ContentBundle` по точному совпадению с каталогами `src/i18n/catalogs/en.mjs` и `zh.mjs`.

Exact-string каталоги покрывают именно текущий `local` bundle и не являются универсальным переводчиком CMS. Новое или изменённое русское поле, для которого нет точного ключа, останавливает EN/ZH build; молчаливого показа русского текста в основном содержании нет. Юридические названия и нормативные материалы нельзя объявлять официальными переводами: EN/ZH версии предназначены для информирования, а утверждённые русскоязычные материалы остаются авторитетными.

Plain JSON поэтому по умолчанию собирается только с `CONTENT_LOCALES=ru`. Для постоянно обновляемой CMS не расширяйте exact-string каталоги вручную при каждой публикации: экспортируйте `brhk-content-locales-v1` и сопоставляйте locale-записи по стабильным ID и logical routes на доверенной стороне. Envelope без `CONTENT_LOCALES` собирает все реально переданные locale; явное значение может выбрать их subset, но не может запросить отсутствующий bundle.

CMS во всех языках должна сохранять стабильные `id`, logical `route`/`href`, ссылки на `media.id`, даты, workflow status и связи с документами. Локализуются пользовательские тексты и metadata; slug, route, media/source paths, provenance URL, телефоны, email, даты и технические статусы не переводятся. Любая смена logical route требует согласованной redirect-стратегии для всех трёх публичных префиксов.

Не экспортируйте `/en/…` или `/zh/…` как logical route: эти сегменты зарезервированы locale-router и добавляются на build. Ссылки вида `/uploads/document.pdf` остаются общими для всех языков и не переписываются; CMS-интеграция должна доставить сам файл в этот root-relative путь до сборки.

## Publication workflow

Normalizer исключает запись, если:

- `published === false`;
- `draft === true`;
- любое из явно заданных полей `status`/`publicationStatus` не равно `published` или `live`.

Для совместимости с локальными данными запись без workflow-поля считается публичной. Поэтому внешний CMS adapter обязан явно передавать статус и никогда не экспортировать preview/draft как запись без статуса.

`published` и `draft` принимают только boolean; строки `"true"`/`"false"` являются ошибкой. `status`/`publicationStatus` при наличии должны быть непустыми строками. Если переданы оба status-поля, они обязаны совпадать после trim и приведения регистра; конфликт останавливает сборку вместо выбора одного значения. Raw boundary также проверяет типы top-level collections и форму каждой записи до filtering, поэтому malformed CMS object не может молча превратиться в пустой массив или исчезнуть из зелёной сборки.

Новости дополнительно сортируются: сначала `featured`, затем по `publishedAt` от новых к старым. Validation проверяет уникальные ID/slug, безопасные внутренние маршруты, ISO dates и ссылки на существующие media IDs.

## Маршруты

Route contract не фиксирует общее количество страниц. В текущем local bundle `REQUIRED_ROUTES` состоит из трёх явно разделённых групп:

- 16 `CORE_REQUIRED_ROUTES` — основные frontend-разделы, включая `/sveden/`;
- 14 `SVEDEN_REQUIRED_ROUTES` — обязательные подразделы специального раздела;
- 37 `PRESERVED_INFORMATION_ROUTES` — сохранённые тематические и институциональные адреса, включая legacy `/sveden/ovz/`.

Build завершается ошибкой, если любой адрес из объединённого `REQUIRED_ROUTES` исчез. Это технический контракт передачи: нахождение тематической страницы в `PRESERVED_INFORMATION_ROUTES` не превращает её в обязательный подраздел приказа Рособрнадзора № 1493.

Итоговый набор образуют:

1. `/`;
2. все ключи `pages`;
3. `href` всех опубликованных `newsItems`;
4. `href` всех опубликованных `events`.

Поэтому CMS может добавлять 1, 20 или больше новостей/событий без изменения `build.mjs`. Текущий local bundle создаёт 73 logical routes: 67 required и шесть news routes. Default local build материализует их в 219 HTML-документов (`73 × 3 locale`). Все logical routes должны начинаться и заканчиваться `/`, не содержать traversal, query или fragment. Дубликат любого публичного route или расхождение набора routes между locale останавливает build.

`docs/ROUTE-MAP.csv` остаётся картой 73 logical routes: строки для `/en` и `/zh` в ней намеренно не размножаются. `/sveden/` остаётся обязательным русским адресом; его информационные варианты доступны как `/en/sveden/` и `/zh/sveden/` и не заменяют оригинал.

`/sveden/ovz/` нельзя удалять или экспортировать как пятнадцатый обязательный подраздел. Это обязательный legacy-адрес прежней структуры с `group: 'legacy'`, который направляет к объединённому `/sveden/objects/`. Набор `group: 'mandatory'` точно равен 14 `SVEDEN_REQUIRED_ROUTES`; любые дополнительные записи допускаются только как legacy. Руководство (`/sveden/managers/`) и педагогический состав (`/sveden/employees/`) должны оставаться раздельными CMS-узлами. Изменения к приказу № 1493, внесённые приказом Рособрнадзора № 920 от 30.04.2026 (регистрация № 86689, вступление в силу 01.09.2026), должны учитываться при mapping полей объединённого подраздела материально-технического обеспечения и доступной среды.

ШКИ и «Балет для всех» остаются элементами `programs` с `primary: false` и рендерятся внутри образования. Блок «Новые проекты» не добавляется.

## Rich text

`newsItems[].body` и `events[].body` могут быть строкой, `null` или массивом блоков. Renderer поддерживает только:

- `paragraph` с `text`;
- `heading` уровня 2 или 3;
- `quote`;
- `list` с `items` и optional `ordered`;
- `link` с root-relative или HTTPS `href` и `label`.

Все тексты экранируются. Неизвестный или неполный block останавливает validation, чтобы CMS-материал не исчезал молча; raw HTML не интерпретируется. Если CMS хранит HTML/portable text, преобразуйте его в этот allowlist на доверенной стороне. Не передавайте HTML как «уже безопасный» frontend field.

## Медиа

Контент ссылается не на URL, а на стабильный `media.id`. Каждая запись media содержит локальный `sourcePath`, декларативный `src`, реальные размеры, alt, provenance, rights status и минимум один responsive variant. `mobile` может задать отдельный mobile crop и его variants.

На build:

1. validator отклоняет неизвестные ID, unsafe paths/URLs, отсутствующие размеры или rights metadata;
2. `materializeMedia` читает только поддерживаемые image files из `public/`, сверяет сигнатуру формата и проверяет структуру контейнера;
3. intrinsic dimensions извлекаются из самих bytes и обязаны совпасть с объявленными `width`/`height`;
4. каждый rendition копируется в `dist/assets/media/` под именем с 12 символами SHA-256 содержимого;
5. шаблон получает first-party `src`/`srcset` и проверенные intrinsic dimensions.

Build не скачивает remote images. Значение `source: https://…` — provenance, не runtime URL. CMS ingestion должен предварительно скачать только разрешённый оригинал/варианты, проверить MIME и права, сохранить их в `public/` и вернуть соответствующий `sourcePath`. Встроенная проверка отбрасывает HTML вместо изображения, битые PNG/WebP/JPEG/GIF/AVIF-контейнеры и ложные размеры, но не заменяет антивирусную проверку, полное декодирование каждого кодека и ручную проверку прав. Нельзя hotlink внешнюю галерею или подменять отсутствующее фото случайным изображением.

Официальный логотип и favicon дополнительно сохраняют стабильные `/assets/images/…` и `/assets/icons/…` URL для layout/manifest. Остальные content images в HTML используют materialized `/assets/media/…` URL.

## Коллекции без данных

Контракт уже содержит `events`, `employees` и `documents`, но локальные массивы пусты, потому что проверенные сведения не получены.

- Published event с обязательным `href` попадает в listing `/events/` и получает отдельную HTML-страницу.
- Employee records выводятся списком на `/sveden/employees/` (имя/title, роль/position, department и optional photo). Если соответствующий `svedenSections[]` одновременно содержит проверенные `body`/`content`, `sections` или `documents`, они выводятся перед списком сотрудников, а не заменяются им. Отдельных employee detail routes нет.
- На `/documents/` активными ссылками становятся прошедшие publication normalization records с `href` и `fileType`; это включает `published` и `live`. Structured records выводятся независимо от optional placeholder-массива `pages['/documents/'].documents`. До получения файлов остаются неподтверждённые названия без ссылок.
- `svedenSections` задаёт названия, URL и `group`. Все 14 `SVEDEN_REQUIRED_ROUTES` обязаны иметь `group: 'mandatory'`; `/sveden/ovz/` имеет `group: 'legacy'`. Для совпавшего детального route renderer умеет вывести `body`/`content` rich text, `sections` и `documents`; при их отсутствии используется page model из `pages`.
- Тематическая страница без официального материала хранит `structureOnly: true`. Renderer явно сообщает, что это только структура будущего раздела; adapter не должен снимать флаг, пока не переданы и не проверены фактические сведения.
- `site.institutionalNavigation` формирует отдельную группу «Сервисы и открытость». СОУТ находится на `/documents/sout/` как самостоятельная обязанность работодателя, а не как элемент `svedenSections` приказа № 1493.

Nested `svedenSections[].documents` проходят publication filtering и требуют `title`, `fileType` и безопасный root-relative/HTTPS `href`; article attachments требуют `title` и безопасный root-relative/HTTPS `href`. `svedenSections[].sections` проверяются как пары строк. Специфичные для выбранной CMS поля adapter всё равно должен преобразовать в этот allowlist до build.

Не заполняйте пустые коллекции вымышленными документами, ФИО, должностями, датами или событиями ради демонстрации.

## Минимальный CI-процесс CMS

1. Получить immutable CMS snapshot и media в доверенной среде.
2. Зафиксировать checksum и source metadata; не коммитить токены/персональные выгрузки.
3. Преобразовать snapshot в полный `ContentBundle` JSON.
4. Скопировать разрешённые local renditions в `public/`.
5. Запустить adapter-aware `CONTENT_ADAPTER=json CMS_CONTENT_FILE=… CONTENT_LOCALES=ru npm run verify:cms`; для проверенного locale envelope повторить с `CONTENT_LOCALES=ru,en,zh`.
6. Развернуть Preview и выполнить HTTP/browser/accessibility/visual приёмку фактического CMS-контента. Полный `npm run verify` без `CONTENT_*` overrides остаётся regression gate принятого repository-managed snapshot и не заменяет CMS content acceptance. Существующие Playwright-сценарии частично знают local fixture и три locale; для plain RU CMS Preview используйте отдельную sample matrix/manual checklist или адаптируйте копию сценариев под фактический export, не выдавая local fixture checks за CMS acceptance.
7. Сопоставить `dist/content-manifest.json` с опубликованными/нормализованными CMS counts/routes/media; raw→filtered расхождения и причины исключения записать в migration register.
8. Проверить Preview deployment; только затем публиковать production.

## Что нужно получить от владельца CMS

1. Название/версию CMS и API/export schema.
2. Content types, обязательные поля и vocabulary статусов.
3. Правила preview, scheduled publication, удаления и slug.
4. Полный legacy URL inventory и утверждённые redirects.
5. Структуру документов и обязательных сведений `/sveden/`: 14 mandatory items, legacy `/sveden/ovz/` и mapping полей `/sveden/objects/` по действующей редакции приказа № 1493.
6. Перечень институциональных страниц с отдельным основанием публикации, владельцем и сроком обновления; для СОУТ — утверждённые отчёты и даты.
7. Медиареестр: оригинал, автор/источник, основание публикации, согласия, alt/caption/crops.
8. Production canonical, DNS и владельца индексации.
9. Ответственных за фактическую, юридическую и accessibility-проверку.
10. Модель locale-записей и полный перевод всех публикуемых полей с общими стабильными ID/routes/media; владельца редакционной проверки EN/ZH и правило, что русские правовые материалы остаются авторитетными.

Интеграция не считается завершённой только потому, что CMS API или build вернул `200`: нужен контентный diff, route/asset validation и приёмка реального deployment.
