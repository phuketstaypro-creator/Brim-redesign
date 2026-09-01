# Миграция контента

## Фактический статус

Frontend и build-time integration boundary реализованы, полная миграция официального сайта — нет. В репозитории отсутствуют:

- экспорт действующей CMS и её API/schema;
- подтверждённый полный legacy URL inventory;
- полные тела/авторы/галереи/вложения новостей;
- проверенные structured events и employee records;
- настоящие файлы/реквизиты/метаданные документов;
- заполненные обязательные сведения `/sveden/`;
- утверждённые legal тексты и redirect map;
- подтверждённый основной canonical domain;
- финальные разрешения и согласия по медиаматериалам.

Локальная сборка сейчас содержит 73 публичных HTML-маршрута: 67 адресов из `REQUIRED_ROUTES` и шесть `source-linked` news routes. Число 73 описывает текущий snapshot, а не предел: CMS может добавлять опубликованные news/event pages, но не может удалить `REQUIRED_ROUTES`.

## Матрица текущих данных

| Тип | Что есть | Что отсутствует / ограничение |
|---|---|---|
| Site/global | Навигация, контакты, layout и главная | Проверка всех фактов и production canonical |
| Page | Основные pages; 14 обязательных `/sveden/*`; legacy `/sveden/ovz/`; сохранённые тематические и институциональные routes | Полные утверждённые материалы/provenance; `structureOnly` pages пока содержат только честное предупреждение |
| Program | 2 основные + ШКИ и «Балет для всех» как дополнительные | Полные характеристики, сроки, квалификации, лицензии |
| News | 6 source-linked карточек/routes | Body, author, gallery, attachments; у 4 нет точного permalink |
| Event | Пустая `events` collection; готовы listing и detail renderer | Проверенные records |
| Employee | Пустая `employees` collection; готов список на `/sveden/employees/` | Проверенные fields/records, решение по detail routes |
| Document | Пустая structured `documents` collection; ожидаемые названия на page | Файлы, ссылки, реквизиты, даты, размеры, a11y status |
| `/sveden/` | 14 mandatory items; отдельный legacy `/sveden/ovz/`; renderer для body/sections/documents | Фактические поля, документы, даты актуализации; mapping объединённого `/sveden/objects/` по действующей редакции приказа № 1493 |
| Институциональные страницы | Отдельная группа «Сервисы и открытость», включая СОУТ | Основание публикации, владелец, официальное содержание и собственный срок обновления для каждого раздела |
| Media | Official logo; восстановленное studio image; WebP derivatives из client-provided Yandex preview | Финальные права/согласия; photographer metadata; originals в исходном качестве |
| Legal | Маршруты и рабочие шаблоны | Утверждённые локальные акты |

## Целевой миграционный поток

```text
immutable CMS snapshot + media inventory
                  ↓ transform
          ContentBundle 1.0.0 JSON
                  ↓ local files in public/
CONTENT_ADAPTER=json + CMS_CONTENT_FILE
                  ↓ normalize / validate / materialize
          dist/ + content-manifest.json
                  ↓ compare / test / preview / accept
```

Это batch/build-time migration. Текущий frontend не выполняет live CMS fetch и не должен получать CMS credentials в браузере.

## 1. Зафиксировать исходники

Получить от заказчика:

- immutable CMS export с timestamp/checksum;
- описание content types, fields и workflow statuses;
- полный sitemap/server route export;
- originals документов с исходными именами;
- media inventory: original, source URL, author/credit, license/permission, consent status, alt/caption/crops;
- ответственных за редакционную, фактическую, юридическую и `/sveden/` проверку.

Raw snapshot хранить read-only в защищённом migration storage. CMS tokens, персональные данные и приватные drafts не коммитить.

## 2. Провести URL inventory

Для каждого legacy URL записать:

- HTTP status и canonical;
- CMS ID/content type;
- title/date/language;
- связанные media/documents;
- новый route;
- решение: preserve, 301, archive или remove после письменного согласования.

`docs/ROUTE-MAP.csv` описывает текущий frontend, но не доказывает полноту legacy inventory. Slug шести локальных redesign news pages временный и не подтверждает legacy URL.

## 3. Сформировать `ContentBundle`

Создать полный JSON по [схеме](CONTENT-SCHEMA.md). При mapping:

- не заполнять пропуски вымышленными ФИО, должностями, датами, результатами или документами;
- сохранять source CMS ID/URL в миграционном журнале;
- передавать explicit workflow status;
- нормализовать routes и ISO dates детерминированно;
- сохранять `null` для неизвестного optional value;
- преобразовывать rich text только в разрешённые blocks;
- сохранять `structureOnly: true`, пока для страницы не получены и не приняты официальные сведения;
- оставлять ШКИ и «Балет для всех» внутри `programs` с `primary: false`;
- сохранять все routes из `src/content/required-routes.mjs`;
- передавать `group: 'mandatory'` для всех 14 `SVEDEN_REQUIRED_ROUTES` и `group: 'legacy'` для `/sveden/ovz/`;
- не создавать отдельную обязательную копию доступной среды на `/sveden/ovz/`: фактические сведения относятся к объединённому `/sveden/objects/`;
- разделять руководство `/sveden/managers/` и педагогический состав `/sveden/employees/`;
- учитывать приказ Рособрнадзора № 920 от 30.04.2026, зарегистрированный под № 86689 и действующий с 01.09.2026, при mapping сведений и документов о материально-техническом обеспечении, доступной среде, общежитиях/интернатах и предоставлении помещений;
- не добавлять блок «Новые проекты».

Normalizer фильтрует drafts, а validator агрегирует ошибки duplicate IDs/routes, unsafe paths, dates, missing required routes и unknown media IDs. Ошибку validation нельзя обходить ослаблением required routes ради импорта.

## 4. Перенести медиа

Внешний ingestion step должен:

1. скачать разрешённый original/variant в доверенной среде;
2. проверить MIME, декодирование, размеры и checksum;
3. сохранить provenance и original filename;
4. получить rights status и необходимые consent records;
5. подготовить responsive renditions без удаления watermark;
6. положить файлы внутрь `public/`;
7. добавить `MediaAsset` и ссылаться на него по stable ID.

`materializeMedia` не скачивает URL: на build он читает local `sourcePath` и выпускает content-hashed first-party `/assets/media/*`. `source` хранит provenance и не становится runtime hotlink.

### Уже импортированные Yandex-фотографии

Источник: предоставленная заказчиком публичная папка `https://disk.yandex.ru/d/0grsoeDxm9nDbQ`. В репозитории находятся только WebP derivatives из доступных preview JPEG с номерами `001`, `014`, `015`, `034`, `039`, `043`, `052`; оригинальные JPEG в исходном качестве не сохранены как публикационные originals.

Для этих records установлен точный машинный статус:

```text
client-provided-pending-final-rights-check
```

Подпись `Архив БРХК` — описание предоставленного архива, а не имя фотографа и не доказательство лицензии. Источник не сообщил фотографа, поэтому автор не придуман. До production нужны:

- письменное подтверждение основания публикации;
- имя/форма credit, если требуется правообладателем;
- согласия изображённых лиц и законных представителей, где применимо;
- подтверждение допустимых crops и срока использования;
- по возможности originals вместо preview derivatives.

Подробный статус — в [ASSET-LICENSES.md](ASSET-LICENSES.md).

### Восстановленное studio image

`studio-tutu.webp` технически восстановлен из исторического repository payload, а его responsive crops детерминированы. Это не подтверждает upstream author/license/consent. Он имеет тот же pending-final-rights-check status и должен пройти отдельную проверку. Повреждённый `stage.b64` достоверно не восстанавливается и не публикуется.

## 5. Перенести документы

Для каждого файла зафиксировать:

- official title и реквизиты;
- original filename, MIME и byte size;
- publication/update date и актуальность;
- public route и размещение в `/documents/`/`/sveden/`;
- checksum и source;
- text layer, tags, reading order, language и need for HTML alternative;
- владельца проверки и персональные данные в metadata.

СОУТ переносится на `/documents/sout/` как отдельная обязанность работодателя, а не как подраздел приказа № 1493. Для отчёта СОУТ фиксируются дата утверждения, дата публикации и состав публикуемых сводных данных/мероприятий. Для обязательных сведений `/sveden/*` отдельно фиксируются дата фактического изменения и дата публикации, чтобы контролировать обновление не позднее десяти рабочих дней после изменения.

Прошедший publication normalization record со статусом `published` или `live` и настоящим `href` становится активной ссылкой текущего renderer. Название без файла не превращать в фиктивный PDF URL.

## 6. Проверять партиями

Для каждой партии:

```bash
CONTENT_ADAPTER=json CMS_CONTENT_FILE=content/export.json npm run test
npm run test:e2e
npm run test:a11y
npm run test:visual
```

Сверить CMS snapshot → JSON → `dist/content-manifest.json`:

- counts всех collections;
- список routes и required subset;
- разбиение required subset на 14 mandatory `/sveden/*`, legacy `/sveden/ovz/` и остальные сохранённые институциональные/тематические routes;
- first/last publication dates;
- dropped drafts и причину каждого исключения;
- media ID/provenance/originalName/rightsStatus; точный source сверяется по внешнему migration register, потому что публичный manifest его не раскрывает;
- files/checksums и отсутствие внешних image URLs;
- exact sample records, включая rich text, documents и no-media cards.

Visual regression дополнить content stress cases: 1, 2, 3, 6 и 20 news cards; portrait/landscape/square; очень длинный title; отсутствующий optional cover.

## 7. Preview, redirects и приёмка

На Preview проверить HTTP, HTML без JS, screenshots, keyboard/screen reader, links/assets, headers, noindex и CMS sample diff. Redirects применять только после утверждённого map; неизвестный URL должен оставаться настоящим `404`.

Production promotion выполняется после выбора canonical domain, правовой проверки media/documents/legal pages и письменной content acceptance. На реальном deployment повторить HTTP, browser, a11y и visual проверки.

## Критерии завершения

Миграция завершена только когда:

- CMS snapshot полностью инвентаризирован;
- каждая source record имеет migration outcome;
- required и legacy routes получили утверждённое решение;
- news/event/employee/document/sveden content проверен владельцем;
- media имеют provenance, rights и consent status;
- documents имеют metadata и accessibility outcome;
- legal тексты утверждены;
- production canonical/robots согласованы;
- deployed commit/deployment ID, HTTP results, screenshots и test reports зафиксированы.

До этого репозиторий можно передать как CMS-независимый интеграционно готовый frontend, но не как завершённую миграцию официального сайта.
