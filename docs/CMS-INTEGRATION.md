# Интеграция с действующей CMS

## Граница ответственности

Репозиторий содержит CMS-независимый статический frontend. В нём нет административной панели, базы данных, редакторской авторизации, CMS SDK или production backend. Название и версия действующей CMS, API contract, credentials и тестовый экспорт пока не предоставлены, поэтому совместимость с конкретной системой ещё не подтверждена.

Единая граница интеграции — `ContentBundle` из `src/content/contracts.mjs`. Любой источник сначала превращается в этот объект, затем проходит `normalizeContent` и `validateContent`, и только после этого попадает в шаблоны.

```text
CMS/export или src/data/*.mjs
              ↓ build-time adapter
          ContentBundle
              ↓ normalize + validate
        media materialization
              ↓ templates
dist/<route>/index.html + first-party assets
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

```bash
CONTENT_ADAPTER=local npm run build
```

### `json`

`src/content/adapters/json.mjs` читает полный JSON-экспорт:

```bash
CONTENT_ADAPTER=json CMS_CONTENT_FILE=content/export.json npm run build
```

Ограничения реализованы намеренно:

- `CMS_CONTENT_FILE` обязателен и должен указывать на обычный `.json`-файл;
- путь и его realpath должны оставаться внутри корня проекта;
- максимальный размер — 25 MiB;
- корень JSON должен быть объектом;
- JavaScript из environment variable не импортируется и не выполняется;
- JSON должен содержать полный bundle, а не частичный patch.

Размещайте export, например, в `content/export.json`, но никогда не внутри `public/`: build копирует `public/` целиком в `dist/`. JSON adapter сам не публикует файл, однако файл, ошибочно положенный в `public/`, станет публичным обычным asset.

Встроенного удалённого API adapter нет. Практичный первый способ интеграции — получить CMS export отдельным доверенным CI-шагом, положить JSON и разрешённые media files внутрь checkout, затем выполнить обычную сборку. Если нужен прямой API, напишите отдельный доверенный модуль, вызывающий `loadContent({ adapter })` функцией; не добавляйте путь к произвольному модулю в публично управляемую environment variable.

## Environment contract

| Переменная | Поведение |
|---|---|
| `CONTENT_ADAPTER` | `local` по умолчанию; второе допустимое значение — `json` |
| `CMS_CONTENT_FILE` | Путь внутри проекта; используется только адаптером `json` |
| `SITE_URL` | При наличии заменяет `site.baseUrl`; завершающие `/` удаляются |
| `ALLOW_INDEXING` | Только case-insensitive `true` разрешает индексацию |

`SITE_URL` должен быть HTTPS URL; HTTP разрешён validator только для localhost. Он определяет canonical, sitemap, RSS и ссылки в robots. Пока основной домен не утверждён, оставляйте `ALLOW_INDEXING=false`.

`.env.example` документирует значения, но Node-скрипт сам `.env` не загружает. Настройте переменные в shell, CI или Vercel project settings.

## Publication workflow

Normalizer исключает запись, если:

- `published === false`;
- `draft === true`;
- явно заданный `status`/`publicationStatus` не равен `published` или `live`.

Для совместимости с локальными данными запись без workflow-поля считается публичной. Поэтому внешний CMS adapter обязан явно передавать статус и никогда не экспортировать preview/draft как запись без статуса.

Новости дополнительно сортируются: сначала `featured`, затем по `publishedAt` от новых к старым. Validation проверяет уникальные ID/slug, безопасные внутренние маршруты, ISO dates и ссылки на существующие media IDs.

## Маршруты

Route contract не фиксирует общее количество страниц. Массив `REQUIRED_ROUTES` содержит только обязательное подмножество: основные разделы, `/sveden/` и 14 его подразделов. Build завершается ошибкой, если любой из них исчез.

Итоговый набор образуют:

1. `/`;
2. все ключи `pages`;
3. `href` всех опубликованных `newsItems`;
4. `href` всех опубликованных `events`.

Поэтому CMS может добавлять 1, 20 или больше новостей/событий без изменения `build.mjs`. Все маршруты должны начинаться и заканчиваться `/`, не содержать traversal, query или fragment. Дубликат любого публичного route останавливает build.

ШКИ и «Балет для всех» остаются элементами `programs` с `primary: false` и рендерятся внутри образования. Блок «Новые проекты» не добавляется.

## Rich text

`newsItems[].body` и `events[].body` могут быть строкой, `null` или массивом блоков. Renderer поддерживает только:

- `paragraph` с `text`;
- `heading` уровня 2 или 3;
- `quote`;
- `list` с `items` и optional `ordered`;
- `link` с root-relative или HTTPS `href` и `label`.

Все тексты экранируются. Неизвестный блок пропускается; raw HTML не интерпретируется. Если CMS хранит HTML/portable text, преобразуйте его в этот allowlist на доверенной стороне. Не передавайте HTML как «уже безопасный» frontend field.

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
- Employee records выводятся списком на `/sveden/employees/` (имя/title, роль/position, department и optional photo). Отдельных employee detail routes нет.
- На `/documents/` активными ссылками становятся прошедшие publication normalization records с `href`; это включает `published` и `live`. До получения файлов остаются неподтверждённые названия без ссылок.
- `svedenSections` задаёт обязательные названия/URL для index и route validation. Для совпавшего детального route renderer умеет вывести `body`/`content` rich text, `sections` и `documents`; при их отсутствии используется prototype page из `pages`.

Nested `svedenSections[].documents` и article attachments проходят publication filtering, требуют `title` и безопасный root-relative/HTTPS/`mailto:`/`tel:` `href`. `svedenSections[].sections` проверяются как пары строк. Специфичные для выбранной CMS поля adapter всё равно должен преобразовать в этот allowlist до build.

Не заполняйте пустые коллекции вымышленными документами, ФИО, должностями, датами или событиями ради демонстрации.

## Минимальный CI-процесс CMS

1. Получить immutable CMS snapshot и media в доверенной среде.
2. Зафиксировать checksum и source metadata; не коммитить токены/персональные выгрузки.
3. Преобразовать snapshot в полный `ContentBundle` JSON.
4. Скопировать разрешённые local renditions в `public/`.
5. Запустить `CONTENT_ADAPTER=json CMS_CONTENT_FILE=… npm run test`.
6. Выполнить `npm run test:e2e`, `npm run test:a11y`, `npm run test:visual`.
7. Сопоставить `dist/content-manifest.json` с CMS counts/routes/media.
8. Проверить Preview deployment; только затем публиковать production.

## Что нужно получить от владельца CMS

1. Название/версию CMS и API/export schema.
2. Content types, обязательные поля и vocabulary статусов.
3. Правила preview, scheduled publication, удаления и slug.
4. Полный legacy URL inventory и утверждённые redirects.
5. Структуру документов и обязательных сведений `/sveden/`.
6. Медиареестр: оригинал, автор/источник, основание публикации, согласия, alt/caption/crops.
7. Production canonical, DNS и владельца индексации.
8. Ответственных за фактическую, юридическую и accessibility-проверку.

Интеграция не считается завершённой только потому, что CMS API или build вернул `200`: нужен контентный diff, route/asset validation и приёмка реального deployment.
