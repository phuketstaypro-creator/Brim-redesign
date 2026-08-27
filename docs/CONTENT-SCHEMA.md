# Схема контента

Документ описывает фактические структуры в `src/data/*.mjs`. Это текущий frontend-контракт, а не схема конкретной CMS. Все значения должны пройти содержательную проверку колледжем до официальной публикации.

## Общие соглашения

- `href` и ключи маршрутов: абсолютный путь внутри сайта с ведущим и завершающим `/`.
- `id` и `slug`: стабильные ASCII-идентификаторы; после публикации не меняются без redirect.
- Даты для обработки: ISO `YYYY-MM-DD`.
- Неизвестное значение: `null`; placeholder нельзя подменять правдоподобным фактом.
- Массив может быть пустым только если подтверждено отсутствие элементов. Если данные ещё не получены, используется `null` или отсутствие необязательного поля согласно адаптеру.
- Все внешние тексты и HTML очищаются на доверенной стороне до сборки.

## `site`

Источник: `src/data/site.mjs`.

| Поле | Тип | Назначение / статус |
|---|---|---|
| `locale` | string | Язык HTML; сейчас `ru` |
| `baseUrl` | URL string | База canonical/sitemap/RSS; сейчас staging Vercel URL, основной домен не подтверждён |
| `shortName` | string | Краткое имя |
| `name` | string | Отображаемое название |
| `legalName` | string | Полное название; требует финальной проверки заказчиком |
| `title` | string | Базовый title главной |
| `description` | string | Базовое meta description |
| `themeColor` | CSS color | Цвет браузерного chrome/manifest |
| `utilityLabel` | string | Служебная подпись header |
| `assets` | object | Карта локальных logo/stage/studio assets; `stage` сейчас указывает на landscape crop studio-фото |
| `navigation` | NavItem[] | Основная навигация |
| `utilityNavigation` | NavItem[] | Служебная навигация |
| `quickLinks` | NavItem[] | Блок быстрого доступа |
| `sideNavigation` | NavItem[] | Боковая навигация внутренних страниц |
| `footerNavigation` | NavItem[] | Навигация footer |
| `legalNavigation` | NavItem[] | Ссылки на правовые шаблоны |
| `contacts` | object | Адреса, телефон, email; требуют проверки владельцем контента |
| `footer` | object | Статус версии и disclaimer |
| `home` | object | Контент секций главной в порядке 01–05 |
| `gallery` | GalleryItem[] | Два текущих демонстрационных элемента |

`NavItem`:

```js
{
  href: '/route/',
  label: 'Название',
  cta: true // optional
}
```

`site.assets.<id>`:

```js
{
  src: '/assets/images/file.webp',
  width: 480,  // реальные intrinsic pixels
  height: 320,
  alt: 'Содержательное описание'
}
```

Обычные страницы используют logical IDs `stage` и `studio`; новости — `studioPortrait`, `studioLandscape`, `studioSquare`. Все текущие photo variants происходят из одного восстановленного `studio-tutu.webp`. Повреждённый исходник сцены не опубликован. Logo хранится отдельной записью. Техническое происхождение файлов описано рядом с public assets, но авторство, лицензия и право публикации не установлены.

## `pages`

Источник: `src/data/pages.mjs`. Экспорт — объект, где ключ является публичным маршрутом.

```js
{
  '/about/': {
    kicker: 'Колледж',
    title: 'О колледже',
    description: '…',
    image: 'stage',
    sections: [
      ['Заголовок секции', 'Текст секции']
    ]
  }
}
```

| Поле страницы | Тип | Обязательность |
|---|---|---|
| `kicker` | string | required |
| `title` | string | required; используется как видимый заголовок |
| `description` | string | required в текущей сборке |
| `image` | `stage` \| `studio` | required в текущих данных |
| `sections` | `[string, string][]` | optional для generic page |
| `template` | `education` \| `news` | optional специальный renderer |
| `gallery` | boolean | optional template flag |
| `documents` | string[] | optional; сейчас только демонстрационные названия, не document records |
| `sveden` | boolean | optional index flag |

Страницы `/privacy/` и `/consent/` являются шаблонами и не должны импортироваться в CMS как утверждённые документы без юридического согласования.

## `programs`

Источник: `src/data/programs.mjs`.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | string | Стабильный идентификатор |
| `href` | route string | Целевая страница |
| `code` | string | Код или подпись типа программы; значение проверяется заказчиком |
| `type` | string | Отображаемая категория |
| `title` | string | Название программы |
| `description` | string | Краткое описание |
| `image` | `stage` \| `studio` | Логический photo ID |
| `primary` | boolean | `true` для основной СПО, `false` для дополнительной программы |

Инварианты текущей архитектуры:

- `52.02.01 · Искусство балета` и `52.02.02 · Искусство танца` — основные элементы;
- Школа креативных индустрий и «Балет для всех» — дополнительные элементы внутри раздела образования;
- отдельные URL дополнительных программ сохраняются.

Коды, сроки, квалификации, условия и лицензии в текущей модели полностью не представлены и должны поступить из проверенного источника.

## `newsItems`

Источник: `src/data/news.mjs`. Все шесть текущих записей имеют статус `source-linked` и ссылку на действующий сайт БРХК, но не содержат body/author/gallery/attachments. У четырёх записей `source` пока указывает только на корень сайта, поэтому точный permalink ещё требуется сопоставить.

| Поле | Тип | Текущее правило |
|---|---|---|
| `id` | string | required, unique |
| `slug` | string | required, unique |
| `href` | route string | compatibility field; `/news/<slug>/` |
| `title` | string | required |
| `excerpt` | string | required для карточки и meta fallback |
| `body` | unknown \| null | сейчас `null`; формат CMS ещё не согласован |
| `category` | string | required в текущих карточках |
| `date` | string | локализованная compatibility-строка для UI |
| `publishedAt` | ISO date string | источник сортировки/RSS |
| `updatedAt` | ISO date/time \| null | сейчас неизвестно |
| `author` | string/object \| null | сейчас неизвестно; формат CMS не согласован |
| `image` | `studioPortrait` \| `studioLandscape` \| `studioSquare` | compatibility alias текущей сборки |
| `alt` | string | compatibility alias |
| `coverImage` | `studioPortrait` \| `studioLandscape` \| `studioSquare` | canonical cover reference текущего adapter |
| `coverAlt` | string | required для содержательной обложки |
| `imageWidth` | positive integer | реальные intrinsic pixels |
| `imageHeight` | positive integer | реальные intrinsic pixels |
| `editorialVariant` | `featured` \| `wide` \| `portrait` \| `standard` \| null | ручной override или автоматический fallback |
| `featured` | boolean | отдельный редакционный признак |
| `gallery` | unknown \| null | сейчас отсутствует; schema CMS не согласована |
| `attachments` | unknown \| null | сейчас отсутствуют; schema CMS не согласована |
| `seoTitle` | string \| null | сейчас отсутствует |
| `seoDescription` | string \| null | сейчас отсутствует |
| `contentStatus` | string | сейчас только `source-linked`; production vocabulary CMS не согласован |
| `source` | URL string | ссылка на действующий сайт; два прямых article URL и четыре root URL |
| `sourceLabel` | string | отображаемая подпись источника |

`href`, `date`, `image`, `alt` поддерживают текущий renderer. При интеграции их можно вычислять из `slug`, `publishedAt`, `coverImage`, `coverAlt`, но удалять следует только вместе с обновлением build/templates и тестов.

Текущие `slug`/`href` унаследованы от демонстрационного редизайна и не соответствуют заголовкам новых source-linked карточек. Это осознанная временная совместимость до CMS export, legacy inventory и утверждённого redirect map.

Intrinsic размеры текущих новостных вариантов:

| Image ID | Width × height |
|---|---:|
| `studioPortrait` | 480 × 720 |
| `studioLandscape` | 480 × 320 |
| `studioSquare` | 480 × 480 |

## `svedenSections`

Источник: `src/data/sveden.mjs`.

```js
{
  slug: 'common',
  href: '/sveden/common/',
  title: 'Основные сведения'
}
```

Все 14 элементов обязательны для текущей route contract. Запись определяет только маршрут и название. Фактических mandatory organization fields, файлов, дат актуализации и источников в модели пока нет.

## Нереализованные content types

Отдельные коллекции для событий, сотрудников/преподавателей, документов, медиа-галереи и структурированных mandatory organization fields сейчас отсутствуют. `/events/`, `/documents/`, `/gallery/` и `/sveden/*` рендерятся из page/template data.

До получения CMS export нельзя фиксировать их production schema как окончательную. Для каждого типа сначала нужно согласовать:

- стабильный ID и публичный URL;
- статус публикации;
- основной контент и его формат;
- даты/автора/источник;
- связанные медиа и документы;
- SEO поля;
- даты актуализации и ответственного за проверку;
- legacy URL и redirect policy.
