# БРХК — полный handoff для Codex

## 0.1. Актуальный статус после технической миграции — 1 сентября 2026 года

Этот блок имеет приоритет над историческим описанием исходного прототипа ниже. Разделы 2–4 сохраняют контекст первоначального аудита, но больше не описывают текущую архитектуру буквально.

- Runtime-loader и загрузка исходников с `raw.githubusercontent.com` устранены прямой статической сборкой.
- Vanilla Node SSG формирует `dist/` с отдельным наполненным HTML для 73 текущих публичных маршрутов, настоящим `404`, sitemap, RSS, search index и fingerprinted assets.
- Клиентский JavaScript используется только для progressive enhancement меню, поиска и настроек отображения; основной контент и иерархическая навигация доступны без JavaScript.
- Проект остаётся CMS-независимым: адаптеры `local` и `json`, contract validation и документация находятся в `src/content/` и `docs/`.
- Верхнее меню стало серверно отрендеренной иерархией `<details>/<summary>`; `/sitemap/` формируется из того же navigation contract.
- В `/sveden/` разделены 14 обязательных подразделов и группа дополнительных институциональных страниц. `/sveden/managers/` и `/sveden/employees/` раздельны; доступная среда объединена с материально-техническим обеспечением в `/sveden/objects/` с учётом приказа Рособрнадзора № 920, действующего с 01.09.2026. `/sveden/ovz/` сохранён только как legacy-адрес.
- Страницы, для которых не переданы официальные материалы, имеют `structureOnly: true` и не содержат выдуманных ФИО, документов, результатов или контактов.
- Git integration Vercel у проекта `brim-redesign` на 01.09.2026 отсутствует (`link: null`), поэтому push сам по себе не является deployment. Используется проверяемый source deployment в существующий project ID с последующей проверкой READY/alias/HTTP/screenshots.
- Индексация остаётся закрытой до подтверждения canonical, обязательного контента и прав на все media.

Актуальные контракты и release gates: `README.md`, `docs/CONTENT-SCHEMA.md`, `docs/CMS-INTEGRATION.md`, `docs/LEGAL-INTEGRATION.md`, `docs/ROUTE-MAP.csv`, `docs/DEPLOYMENT.md`.

## 0. Роль агента

Ты продолжаешь разработку редизайна официального сайта Бурятского республиканского хореографического колледжа имени Л. П. Сахьяновой и П. Т. Абашеева.

Твоя задача — не сделать ещё один красивый лендинг, а довести текущий прототип до передаваемого, поддерживаемого, доступного и CMS-независимого фронтенда официальной образовательной организации.

Работай как senior frontend engineer + UX/UI designer + technical lead по миграции контента. Не заявляй о готовности функции, пока не проверил её кодом, скриншотом и HTTP-ответом.

---

## 1. Репозиторий и доступ

- GitHub: https://github.com/phuketstaypro-creator/Brim-redesign
- Clone URL: https://github.com/phuketstaypro-creator/Brim-redesign.git
- Репозиторий публичный.
- Основная ветка: `main`.
- Базовый код перед handoff: commit `a7457b3df47188c34e8106d3a40eecdf69170dda`.
- У пользователя есть права администратора и push.

Начни с:

```bash
git clone https://github.com/phuketstaypro-creator/Brim-redesign.git
cd Brim-redesign
git checkout main
git pull
```

Для больших переделок создавай рабочую ветку, например:

```bash
git checkout -b codex/production-refactor
```

Не переписывай историю `main`, не делай force-push и не удаляй пользовательские материалы без необходимости.

---

## 2. Vercel

- Production URL: https://brim-redesign.vercel.app
- Vercel project name: `brim-redesign`
- Project ID: `prj_upvQFsxC7qs5LmZLRloSFhlCOulh`
- Team/Org ID: `team_WDRk3REaJ9Y0gHComAvNnSde`
- Framework setting: `null`
- Node version в проекте: `24.x`
- Последний проверенный production deployment на момент handoff: `dpl_47j5XuPcfM2dij9174uDJ55Dmtht`
- Последний deployment URL: `brim-redesign-gaiqc67li-alexs-projects-1afb20f9.vercel.app`

### Критически важная правда о текущем production

Production сейчас работает через временную loader-обёртку. Загружаемый Vercel `index.html` в браузере подтягивает актуальные файлы из `raw.githubusercontent.com/phuketstaypro-creator/Brim-redesign/main/`:

- `index.html`
- `assets/styles.css`
- `assets/logo.css`
- `assets/app.js`
- `assets/stage.b64`
- `assets/studio.b64`

После этого loader динамически заменяет DOM и исполняет JS.

Это временный костыль, а не допустимая финальная архитектура. Из-за него:

- исходный HTML production содержит только экран загрузки;
- сайт зависит от доступности raw GitHub во время каждого открытия;
- возможен визуальный скачок и задержка;
- поисковики и государственные сканеры могут не увидеть содержимое;
- новые бинарные ассеты требуют отдельного production deploy;
- push в `main` не гарантирует создание нового Vercel deployment;
- фактическая версия сайта может отличаться от списка deployments.

### Обязательная техническая задача №1

Убрать runtime-loader и настроить нормальный прямой деплой собранного проекта. Production должен отдавать готовый HTML/CSS/JS/изображения непосредственно с Vercel, не загружая исходники с GitHub в браузере.

Предпочтительный вариант:

1. Добавить нормальный build pipeline.
2. Генерировать физические HTML-страницы для маршрутов или использовать лёгкий SSG.
3. Выводить сборку в `dist/`.
4. Настроить Vercel `outputDirectory: dist`.
5. Подключить Git integration либо документировать надёжную команду Vercel CLI/API.
6. Проверить production после merge, а не предполагать, что push автоматически задеплоился.

Не мигрируй проект на тяжёлый framework только ради framework. Подойдут:

- vanilla + собственный Node build/prerender;
- Vite vanilla + prerender;
- Astro/Eleventy, если это действительно упрощает физические страницы и CMS-handoff.

Выбор за тобой после аудита, но итог должен быть простым для передачи сторонней CMS-команде.

---

## 3. Текущая структура репозитория

```text
/
├── index.html
├── README.md
├── robots.txt
├── vercel.json
└── assets/
    ├── app.js
    ├── styles.css
    ├── logo.css
    ├── brhk-logo.png
    ├── stage.b64
    └── studio.b64
```

### `index.html`

Содержит общий документ и постоянную оболочку:

- метаданные;
- favicon и Apple Touch Icon;
- skip-link;
- панель версии для слабовидящих;
- модальное окно поиска;
- служебную верхнюю строку;
- header/navigation;
- `<div id="app"></div>` для клиентского рендера;
- быстрые ссылки;
- footer;
- официальный логотип в header и footer.

Логотип уже заменён на официальный бело-красный файл:

```text
assets/brhk-logo.png
```

Не возвращай временную букву `Б`, не искажай пропорции логотипа и не добавляй ему чёрный прямоугольный фон.

### `assets/app.js`

Сейчас это монолитный клиентский SPA-рендерер. В нём находятся:

- объект обычных страниц `pages`;
- список обязательных подразделов `/sveden/`;
- данные образовательных программ `programs`;
- данные новостей `newsItems`;
- генерация маршрутов новостей;
- функция загрузки base64-картинок;
- автоматическое определение ориентации новостных фотографий;
- генераторы homepage, education, news list, article, generic page;
- поиск;
- мобильное меню;
- панель доступности и localStorage.

Главные функции/узлы:

- `hydrateImages()` — подставляет stage/studio изображения;
- `classifyEditorialCards()` — назначает класс карточки по реальному aspect ratio;
- `primaryProgramCards()`;
- `additionalPrograms()`;
- `newsMagazine()`;
- `homePage()`;
- `educationPage()`;
- `newsPage()`;
- `articlePage()`;
- `render()`;
- `applySettings()`.

Перед финальной сдачей монолит следует разделить на понятные модули/data files, но без ненужного архитектурного театра.

### `assets/styles.css`

Главная визуальная система:

- CSS variables и цвета;
- header, hero, typography;
- программы;
- редакционная сетка новостей;
- внутренние страницы;
- документы и `/sveden/`;
- мобильные breakpoints;
- режимы доступности.

### `assets/logo.css`

Отдельные временные стили официального логотипа в header/footer. После рефакторинга можно объединить с основной дизайн-системой.

### `assets/stage.b64` и `assets/studio.b64`

WebP-изображения, сохранённые как base64 text. JS превращает их в data URI.

Это временный формат. Перенеси их в обычные оптимизированные файлы, например:

```text
assets/images/stage-gala.webp
assets/images/studio-tutu.webp
```

Добавь responsive variants/`srcset` и корректные размеры. Не храни новую медиатеку в base64.

### `vercel.json`

Сейчас задаёт:

- clean URLs;
- trailing slash;
- SPA rewrite на `/index.html`;
- security headers;
- долгий cache для `/assets/`.

После prerender/SSG SPA rewrite нужно заменить на физические маршруты и корректную 404.

### `robots.txt`

Сейчас индексация запрещена (`Disallow: /`). Это правильно для рабочей версии. Не открывай индексацию до согласованного запуска на основном домене.

---

## 4. Текущие маршруты

Основные:

```text
/
/about/
/education/
/admission/
/students/
/news/
/events/
/gallery/
/documents/
/creative-industries/
/ballet-for-all/
/contacts/
/privacy/
/consent/
/accessibility/
/sveden/
```

Обязательные подразделы:

```text
/sveden/common/
/sveden/struct/
/sveden/document/
/sveden/education/
/sveden/eduStandarts/
/sveden/managers/
/sveden/employees/
/sveden/objects/
/sveden/grants/
/sveden/paid_edu/
/sveden/budget/
/sveden/vacant/
/sveden/catering/
/sveden/inter/
```

Сохранённый legacy-адрес, не являющийся отдельным обязательным подразделом в актуальном контракте:

```text
/sveden/ovz/
```

Демонстрационные статьи:

```text
/news/scenicheskiy-kostyum/
/news/gala-koncert-2026/
/news/balet-na-baikale/
/news/shki-nabor/
/news/altargana-2026/
/news/master-klass-po-valsu/
```

После prerender каждый URL должен возвращать собственный физический/серверно сгенерированный HTML с корректными `title`, description, canonical, breadcrumbs и одним `h1`. Нельзя оставлять все страницы пустым `#app`, который заполняется только JavaScript.

---

## 5. Продуктовая логика, которую нельзя ломать

### Главная страница

Текущий порядок:

1. `01 · О колледже`
2. `02 · Образование`
3. `03 · Новости`
4. `04 · Поступление`
5. `05 · Галерея`

Не возвращай блок `Новые проекты`.

### Образовательные программы

Основные программы СПО:

- `52.02.01 · Искусство балета`
- `52.02.02 · Искусство танца`

Дополнительные программы:

- `Школа креативных индустрий`
- `Балет для всех`

ШКИ и «Балет для всех» должны находиться внутри образовательной архитектуры, а не выглядеть как случайные новости или отдельная главная категория сайта. Отдельные URL сохраняются.

### Новости

Пользователь выбрал визуальную логику ZHdK:

- смешанная редакционная сетка;
- вертикальные фотографии дают высокие карточки;
- горизонтальные — более компактные карточки;
- квадратные — компактные;
- композиция должна выглядеть журнально, а не как одинаковый Bootstrap grid;
- при публикации новой статьи редактор не должен вручную верстать карточку.

Текущая логика в `automaticEditorialVariant()`:

```js
ratio < 0.86  => portrait
ratio > 1.22  => landscape
иначе         => square
```

Сохрани смысл, но сделай надёжнее для реальной CMS:

- поддержка заданного editorial override (`featured`, `wide`, `portrait`, `standard`);
- автоматический fallback по aspect ratio;
- натуральные пропорции изображения из обязательных `width`/`height` без crop и layout shift;
- две независимые колонки на desktop и телефоне, как в выбранном референсе;
- измеряемый progressive-enhancement masonry в `src/client/app.js`: карточки по DOM-порядку ставятся в текущую более короткую колонку;
- CSS multi-column fallback при отключённом JavaScript; тексты, ссылки и изображения остаются server-rendered;
- никаких фиксированных `grid-row` spans, процентных media/copy tracks и искусственных высот карточек;
- пересчёт после загрузки изображения, `document.fonts.ready`, изменения ширины и настроек доступности;
- одинаково хорошая работа при 1, 2, 3, 6, 20+ новостях;
- одна колонка только в режиме укрупнённого текста `data-size="xlarge"`.

CMS markers уже используются:

```text
data-cms-collection
data-cms-item
data-cms-field
```

Не удаляй их без замены на документированную интеграционную схему.

---

## 6. Визуальное направление

Референсы:

- USC Glorya Kaufman School of Dance;
- Juilliard;
- Conservatoire de Paris;
- Zurich University of the Arts / ZHdK;
- P.A.R.T.S. как дозированный авангардный акцент.

Ключевая формула:

- культурная институция, а не муниципальный шаблон;
- крупная академическая типографика;
- много воздуха;
- реальные фотографии сцены и учебного процесса;
- строгая сетка;
- тёмный театральный фон + тёплая бумага + винный цвет + умеренный золотой акцент;
- без балетных «завитушек», театральных штор и дешёвой псевдороскоши;
- без случайных stock-фото;
- без искусственной фигуры танцора из CSS, когда доступны реальные фотографии.

Текущая палитра примерно:

```text
background: #f1ece3
paper:      #fbf8f1
ink:        #171211
wine:       #711934
wine dark:  #42101f
gold:       #d5af70
header:     #15100f
```

Официальный логотип:

```text
assets/brhk-logo.png
```

Белые части должны оставаться читаемыми на тёмном фоне. На светлом фоне при необходимости используй контрастную подложку или отдельную официальную вариацию, но не перекрашивай произвольно.

---

## 7. Фотоматериалы

В коде сейчас доступны два обработанных изображения:

- гала-концерт/общая сцена (`stage`);
- учебный зал и балетный костюм (`studio`).

Пользователь также предоставил источники фотоматериалов, которые ещё не импортированы полностью:

```text
https://disk.yandex.ru/d/iMwgK_Uu3QKVGw
https://disk.yandex.ru/d/0grsoeDxm9nDbQ
https://khyrtygeeva.gallery.photo/gallery/otcetno-vypusknoj-koncert-brhk-7-iuna-xq7npw/
https://khyrtygeeva.gallery.photo/gallery/press-konferencia-brhk-n3y47c/
https://disk.yandex.ru/d/oQnam07n1U620w
```

Перед массовым использованием:

1. Скачай только материалы, к которым дан доступ.
2. Сохрани исходные имена/источник и автора в metadata/documentation.
3. Не удаляй водяные знаки.
4. Уточни/зафиксируй право колледжа публиковать фотографии, особенно изображения несовершеннолетних.
5. Оптимизируй в WebP/AVIF, сделай responsive sizes.
6. Добавь содержательные `alt`, а декоративным изображениям — пустой `alt`.
7. Для hero делай отдельное мобильное кадрирование, а не один `object-position` на всё.

Нужно также найти и перенести хороший официальный постер, который находится на действующем сайте БРХК. Не hotlink: сохраняй локально после подтверждения прав.

---

## 8. CMS и границы договора

Договор — редизайн и передача готового кода. Это НЕ бесплатная разработка новой CMS и НЕ переписывание внутренней админки колледжа.

У колледжа уже есть своя CMS/админка, где редакторы публикуют посты и документы. Точный движок пока не подтверждён.

Поэтому:

- не внедряй новую CMS без прямого согласования;
- не делай backend/auth/roles как скрытый дополнительный проект;
- делай frontend CMS-agnostic;
- выдели типы контента и поля;
- подготовь templates и integration guide;
- сохрани возможность подключить существующие данные;
- не завязывай дизайн на Vercel-specific runtime.

Обязательные документы для передачи:

```text
docs/CMS-INTEGRATION.md
docs/CONTENT-SCHEMA.md
docs/ROUTE-MAP.csv
docs/CONTENT-MIGRATION.md
docs/DEPLOYMENT.md
docs/ACCESSIBILITY.md
docs/LEGAL-INTEGRATION.md
```

Минимальные модели:

- page;
- news article;
- event;
- employee/teacher;
- program;
- document;
- gallery/media item;
- mandatory organization field (`sveden`).

Для новостей предусмотри поля:

```text
id
slug
title
excerpt
body
category
publishedAt
updatedAt
author
coverImage
coverAlt
imageWidth
imageHeight
editorialVariant
featured
gallery
attachments
seoTitle
seoDescription
```

---

## 9. Полная миграция действующего сайта

Текущий прототип содержит шаблоны, но не весь многолетний архив сайта.

Нужно:

1. Провести инвентаризацию текущего официального сайта БРХК.
2. Собрать все доступные URL, типы страниц, документы и категории.
3. Не придумывать отсутствующие данные.
4. Для каждого старого URL выбрать:
   - сохранить URL;
   - перенести на новый URL + 301;
   - архивировать;
   - удалить только после письменного решения заказчика.
5. Подготовить redirect map.
6. Получить от заказчика экспорт CMS или участие их технического специалиста.
7. Проверить, кто и на какой платформе создал/обслуживает текущий сайт.

Без экспорта нельзя честно объявлять полную миграцию завершённой.

---

## 10. Доступность

Уже реализована панель:

- normal / large / xlarge text;
- normal / monochrome / high contrast themes;
- show/hide images;
- normal/wide spacing;
- motion on/off;
- localStorage key: `brhk-access`.

Также есть:

- skip-link;
- видимый keyboard focus;
- семантические области;
- ARIA для модальных окон и мобильного меню;
- Escape close;
- reduced-motion CSS.

Это нельзя сломать при рефакторинге.

Перед выпуском выполнить:

- keyboard-only test;
- VoiceOver и/или NVDA;
- zoom 200% и 400%;
- ширины 320/360/390/768/1024/1440/1920;
- axe-core;
- Lighthouse accessibility;
- contrast audit;
- проверку заголовков и landmarks;
- проверку доступности PDF/сканов отдельно.

Цель: WCAG 2.2 AA по фронтенду, без ложного заявления, что все документы и CMS автоматически соответствуют требованиям.

Версия для слабовидящих должна менять интерфейс реально, а не быть декоративной кнопкой.

---

## 11. 152-ФЗ и правовая часть

Сейчас формы и аналитика не подключены. Страницы `/privacy/` и `/consent/` — рабочие шаблоны, не утверждённые локальные акты.

Не заявляй «сайт соответствует 152-ФЗ» только на основании фронтенда.

При подключении форм нужно документировать:

- оператора персональных данных;
- конкретную цель каждой формы;
- минимальный состав данных;
- основание и текст согласия;
- место и сроки хранения;
- маршруты передачи;
- доступы;
- отзыв согласия;
- защиту от спама;
- журналирование;
- локализацию данных и реальный backend.

Не подключай:

- рекламные пиксели;
- внешнюю аналитику;
- карты/видео/виджеты, которые ставят cookies;

без отдельного решения и корректного consent flow.

Backend форм может быть вне договора. В таком случае реализуй только доступный frontend + документированный API contract и явно обозначь ответственность CMS-команды.

---

## 12. SEO, государственные проверки и маршруты

Текущий клиентский SPA недостаточен для финальной версии.

Финальная сборка должна для каждого маршрута отдавать HTML, содержащий без исполнения JS:

- корректный `<title>`;
- meta description;
- canonical;
- один `h1`;
- breadcrumbs;
- основной текст;
- структурированную навигацию;
- ссылки на документы;
- `lang="ru"`;
- Open Graph для новостей;
- при необходимости schema.org `EducationalOrganization`, `NewsArticle`, `Event`, breadcrumbs.

Добавить:

```text
sitemap.xml
rss.xml
404.html
manifest.webmanifest
```

`robots.txt` оставить закрытым на staging и открыть только при запуске основного домена.

Не уничтожать старые URL и поисковую историю без redirect map.

---

## 13. Безопасность и производительность

Сохранить/уточнить headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` или CSP frame-ancestors
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

После удаления loader можно внедрить CSP без разрешения на `raw.githubusercontent.com`.

Требования:

- никаких внешних font-файлов без необходимости;
- локальные изображения;
- responsive images;
- width/height или aspect-ratio для предотвращения CLS;
- lazy loading ниже первого экрана;
- preload только критичных ресурсов;
- без горизонтального overflow;
- без console errors;
- без broken links;
- без тяжёлых анимационных библиотек.

Ориентиры для staging:

- Lighthouse Performance >= 90 на разумном мобильном профиле;
- Accessibility >= 95;
- Best Practices >= 95;
- SEO >= 90, учитывая намеренный `noindex`;
- axe: 0 critical/serious violations.

Если цифра не достигнута, объясни конкретную причину, не подделывай отчёт.

---

## 14. Тестирование

Добавь воспроизводимые команды, минимум:

```bash
npm run dev
npm run build
npm run test
npm run test:e2e
npm run test:a11y
```

Проверять:

- все внутренние ссылки;
- все ассеты;
- HTTP 200 для маршрутов;
- 404 для неизвестного маршрута;
- уникальные title/h1;
- отсутствие дублирующихся ID;
- наличие alt;
- меню на мобильном;
- панель доступности;
- поиск;
- новостную сетку с portrait/landscape/square;
- article pages;
- documents/sveden;
- отсутствие horizontal overflow.

Для визуальной проверки сделай Playwright screenshots:

```text
home-390.png
home-1440.png
news-390.png
news-1440.png
education-390.png
education-1440.png
sveden-390.png
sveden-1440.png
sveden-managers-390.png
sveden-managers-1440.png
sitemap-390.png
sitemap-1440.png
menu-open-390.png
menu-sveden-open-390.png
nav-sveden-open-1440.png
accessibility-open-390.png
```

---

## 15. Правила работы Codex

1. Сначала прочитай весь репозиторий и открой production.
2. Не доверяй README как единственному источнику — он минимальный и может отставать.
3. Не переписывай всё «с нуля» без измеримой причины.
4. Не меняй утверждённую визуальную концепцию на типичный госшаблон.
5. Не возвращай блок `Новые проекты`.
6. Не выноси ШКИ из образовательной структуры.
7. Не удаляй обязательные `/sveden/` URL.
8. Не подключай новую CMS молча.
9. Не используй выдуманные факты, даты, ФИО, документы и результаты.
10. Не объявляй миграцию завершённой без экспорта CMS.
11. Делай атомарные commits с понятными сообщениями.
12. Перед merge показывай summary, tests и screenshots.
13. После push проверяй реальный Vercel deployment/production URL.
14. Не считай push равным deploy: проверь deployment ID и HTTP.
15. Не оставляй временные loader/preview hacks в финальной версии.

---

## 16. Приоритетный план выполнения

### P0 — привести техническую базу в порядок

- убрать GitHub runtime loader;
- добавить build pipeline;
- prerender/SSG для всех маршрутов;
- обычные image assets вместо base64;
- прямой Vercel deploy;
- dev/build/test команды;
- 404/sitemap/RSS/manifest;
- базовый CI.

### P1 — сохранить и усилить утверждённый дизайн

- официальный логотип везде;
- реальные фото;
- адаптивные hero crops;
- редакционная сетка новостей;
- education architecture с четырьмя программами;
- мобильная адаптация и доступность.

### P2 — полная структура и контент

- аудит текущего сайта;
- все существующие разделы;
- сотрудники;
- документы;
- поступление;
- события;
- галерея;
- полный `/sveden/`;
- legacy route map.

### P3 — CMS handoff

- schemas;
- template mapping;
- integration guide;
- content migration guide;
- deployment guide;
- редакционная инструкция.

### P4 — финальная приёмка

- visual regression;
- responsive;
- accessibility;
- performance;
- link checker;
- SEO markup;
- legal checklist;
- production deployment;
- исходный код и документация заказчику.

---

## 17. Критерии готовности

Работа считается технически готовой только когда:

- production не загружает код с raw GitHub;
- каждый публичный маршрут отдаёт наполненный HTML;
- все основные и обязательные страницы работают;
- header/footer используют официальный логотип;
- главная содержит `03 · Новости`, а не `Новые проекты`;
- ШКИ и «Балет для всех» находятся в образовании;
- новостная сетка выдерживает разные ориентации фотографий;
- CMS-команде понятны поля и места интеграции;
- нет broken links/assets/console errors;
- мобильная версия проверена скриншотами;
- доступность проверена инструментально и вручную;
- весь фактический контент подтверждён источником/заказчиком;
- изменения закоммичены;
- Vercel deployment `READY`;
- production URL проверен после деплоя.

---

## 18. Формат первого ответа Codex

После первичного аудита не начинай с длинной теории. Верни:

1. что фактически найдено в репозитории;
2. что фактически отдаёт production;
3. 5–10 главных технических проблем;
4. выбранную архитектуру следующей версии и почему;
5. точный список файлов, которые изменишь;
6. план на 3–5 атомарных commits;
7. какие данные/доступы действительно отсутствуют.

Затем начинай работу и подтверждай каждый завершённый этап результатами тестов.
