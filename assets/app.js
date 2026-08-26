const pages = {
  '/about/': {
    kicker: 'Колледж',
    title: 'О колледже',
    description: 'История, люди и профессиональная традиция БРХК.',
    sections: [
      ['Школа, которая формирует сцену', 'Хореографическое училище основано в 1961 году. Сегодня колледж носит имена Л. П. Сахьяновой и П. Т. Абашеева и готовит артистов балета, исполнителей танца и преподавателей.'],
      ['Педагоги и наставники', 'Профессиональная школа держится на ежедневной работе педагогов, концертмейстеров, воспитателей и мастеров сцены. Финальные карточки сотрудников подключаются из действующей CMS.'],
      ['История и выпускники', 'Хронология, награды и биографии будут перенесены из существующего сайта после сверки с ответственным сотрудником колледжа.']
    ]
  },
  '/admission/': {
    kicker: 'Абитуриентам',
    title: 'Ваш путь в БРХК',
    description: 'Просмотр, медицинская комиссия, творческий отбор и документы.',
    sections: [
      ['01 · Предварительный просмотр', 'Консультация, оценка физических данных и знакомство с требованиями программы.'],
      ['02 · Медицинская комиссия', 'Проверка отсутствия ограничений к профессиональной нагрузке.'],
      ['03 · Творческий отбор', 'Физические данные, музыкальность, координация и сценический номер.'],
      ['04 · Документы', 'Оригиналы документов подаются по официальному перечню текущего года.']
    ]
  },
  '/students/': {
    kicker: 'Студентам',
    title: 'Учёба, сцена и поддержка',
    description: 'Расписание, интернат, социальная поддержка и полезные документы.',
    sections: [
      ['Расписание', 'Публикация по классам, курсам и группам с датой последнего обновления.'],
      ['Интернат', 'Правила проживания, документы и контакты ответственных сотрудников.'],
      ['Стипендии и поддержка', 'Основания, размеры выплат, меры социальной поддержки и локальные акты.'],
      ['Безопасность', 'Пожарная, антитеррористическая и информационная безопасность.']
    ]
  },
  '/events/': {
    kicker: 'Афиша',
    title: 'Сцена встречается со зрителем',
    description: 'Концерты, показы, дни открытых дверей и мастер-классы.',
    sections: [
      ['Гала-концерты', 'Отчётные и выпускные показы учащихся колледжа.'],
      ['Дни открытых дверей', 'Знакомство с программами, педагогами и условиями поступления.'],
      ['Мастер-классы', 'Профессиональные встречи и открытые занятия.']
    ]
  },
  '/gallery/': {
    kicker: 'Медиа',
    title: 'Галерея',
    description: 'Сцена, учебный процесс, костюмы и люди колледжа.',
    gallery: true
  },
  '/documents/': {
    kicker: 'Официально',
    title: 'Документы',
    description: 'Устав, лицензия, аккредитация, локальные акты и отчётность.',
    documents: [
      'Устав образовательной организации',
      'Лицензия на образовательную деятельность',
      'Государственная аккредитация',
      'Отчёт о самообследовании',
      'Правила внутреннего распорядка'
    ]
  },
  '/creative-industries/': {
    kicker: 'Дополнительная программа',
    title: 'Школа креативных индустрий',
    description: 'Современный образовательный хаб на пересечении культуры Бурятии и цифровых технологий.',
    sections: [
      ['Звукорежиссура', 'Запись, обработка звука и саунд-дизайн.'],
      ['Анимация и 3D-графика', 'Движение, персонаж и визуальное повествование.'],
      ['Дизайн', 'Графика, композиция и цифровые продукты.'],
      ['Электронная музыка', 'Создание музыки современными инструментами.'],
      ['Фото- и видеопроизводство', 'Съёмка, монтаж и сценические медиа.']
    ]
  },
  '/ballet-for-all/': {
    kicker: 'Дополнительная программа',
    title: 'Балет для всех',
    description: 'Понятный вход в культуру движения для детей и взрослых.',
    sections: [
      ['Дети', 'Координация, музыкальность и безопасная нагрузка.'],
      ['Подростки', 'Техника, пластика и творческая уверенность.'],
      ['Взрослые', 'Осанка, мобильность и внимательная работа с телом.']
    ]
  },
  '/contacts/': {
    kicker: 'Контакты',
    title: 'Связаться с колледжем',
    description: 'Адреса учебных площадок, телефоны и электронная почта.',
    sections: [
      ['Основная площадка', '670000, Республика Бурятия, г. Улан-Удэ, ул. Ербанова, 3.'],
      ['Учебная площадка', 'г. Улан-Удэ, пр. Победы, 18.'],
      ['Приёмная', 'Телефон: +7 (3012) 21-23-13. Email: brhk@govrb.ru.']
    ]
  },
  '/privacy/': {
    kicker: 'Правовая информация',
    title: 'Политика обработки персональных данных',
    description: 'Рабочий шаблон для заполнения фактическими процессами оператора.',
    sections: [
      ['Важно', 'Финальный локальный акт утверждается заказчиком после проверки целей, категорий данных, сроков хранения, систем и мер защиты.'],
      ['Формы', 'В этой версии формы не собирают персональные данные. При подключении CMS фиксируются маршруты передачи, место хранения и отзыв согласия.'],
      ['Техническое хранение', 'Сайт сохраняет только пользовательские настройки доступности. Рекламные пиксели не подключены.']
    ]
  },
  '/consent/': {
    kicker: 'Правовая информация',
    title: 'Согласие на обработку персональных данных',
    description: 'Структура согласия для конкретной формы и цели обработки.',
    sections: [
      ['Обязательные элементы', 'Оператор, субъект, перечень данных, цель, действия, срок и порядок отзыва.'],
      ['Несовершеннолетние', 'Отдельно определяется полномочие законного представителя и минимальный состав данных.']
    ]
  },
  '/accessibility/': {
    kicker: 'Доступность',
    title: 'Доступность сайта',
    description: 'Настройки отображения и принципы работы для пользователей с разными потребностями.',
    sections: [
      ['Клавиатура', 'Быстрый переход к содержанию, видимый фокус и логичный порядок навигации.'],
      ['Отображение', 'Размер текста, цветовые схемы, интервалы и отключение изображений.'],
      ['Движение', 'Отключение анимации и поддержка системной настройки reduced motion.'],
      ['Финальная проверка', 'Перед запуском проводится ручной аудит с VoiceOver/NVDA и масштабом 200–400%.']
    ]
  }
};

const sveden = [
  ['common', 'Основные сведения'],
  ['struct', 'Структура и органы управления'],
  ['document', 'Документы'],
  ['education', 'Образование'],
  ['eduStandarts', 'Образовательные стандарты и требования'],
  ['employees', 'Руководство и педагогический состав'],
  ['objects', 'Материально-техническое обеспечение'],
  ['grants', 'Стипендии и меры поддержки'],
  ['paid_edu', 'Платные образовательные услуги'],
  ['budget', 'Финансово-хозяйственная деятельность'],
  ['vacant', 'Вакантные места для приёма'],
  ['ovz', 'Доступная среда'],
  ['catering', 'Организация питания'],
  ['inter', 'Международное сотрудничество']
];

pages['/sveden/'] = {
  kicker: 'Официально',
  title: 'Сведения об образовательной организации',
  description: 'Специальный раздел с постоянной структурой и датами актуализации.',
  sveden: true
};

sveden.forEach(([slug, title]) => {
  pages[`/sveden/${slug}/`] = {
    kicker: 'Сведения об организации',
    title,
    description: 'Шаблон обязательного подраздела. Финальные сведения и документы поступают из проверенного экспорта CMS.',
    sections: [
      ['Публикуемые сведения', 'Наименование показателя, значение, документ-основание и дата актуализации.'],
      ['Редакторская проверка', 'Полнота, доступность файлов и отсутствие устаревших документов.']
    ]
  };
});

const programs = [
  {
    href: '/education/',
    code: '52.02.01 · СПО',
    type: 'Основная программа',
    title: 'Искусство балета',
    description: 'Классический танец, актёрское мастерство, музыкальная подготовка и сценическая практика.',
    image: 'stage',
    primary: true
  },
  {
    href: '/education/',
    code: '52.02.02 · СПО',
    type: 'Основная программа',
    title: 'Искусство танца',
    description: 'Народно-сценический танец, культура региона и современная исполнительская практика.',
    image: 'studio',
    primary: true
  },
  {
    href: '/creative-industries/',
    code: 'Дополнительная программа',
    type: 'Цифровое творчество',
    title: 'Школа креативных индустрий',
    description: 'Звук, видео, анимация, дизайн, электронная музыка и проектная работа.',
    image: 'studio',
    primary: false
  },
  {
    href: '/ballet-for-all/',
    code: 'Дополнительная программа',
    type: 'Открытые группы',
    title: 'Балет для всех',
    description: 'Культура движения для детей, подростков и взрослых с разным уровнем подготовки.',
    image: 'stage',
    primary: false
  }
];

const newsItems = [
  {
    slug: 'scenicheskiy-kostyum',
    href: '/news/scenicheskiy-kostyum/',
    category: 'Закулисье',
    date: '26 августа 2026',
    title: 'Как рождается сценический костюм',
    excerpt: 'От учебного эскиза и примерки до момента, когда костюм становится частью образа артиста.',
    image: 'studio',
    alt: 'Балетный костюм в учебном зале БРХК'
  },
  {
    slug: 'gala-koncert-2026',
    href: '/news/gala-koncert-2026/',
    category: 'Сценическая жизнь',
    date: '8 июня 2026',
    title: 'Отчётно-выпускной гала-концерт БРХК',
    excerpt: 'Большой итог учебного года и встреча будущих артистов со зрителем.',
    image: 'stage',
    alt: 'Участники гала-концерта БРХК на сцене'
  },
  {
    slug: 'balet-na-baikale',
    href: '/news/balet-na-baikale/',
    category: 'Проекты',
    date: '18 июля 2026',
    title: 'Балет на Байкале: школа выходит за пределы сцены',
    excerpt: 'Классическая хореография, культура региона и новый формат показа.',
    image: 'stage',
    alt: 'Артисты и учащиеся БРХК после выступления'
  },
  {
    slug: 'shki-nabor',
    href: '/news/shki-nabor/',
    category: 'Образование',
    date: '2 июня 2026',
    title: 'ШКИ открывает набор на новые направления',
    excerpt: 'Звук, видео, анимация, дизайн и электронная музыка для подростков.',
    image: 'studio',
    alt: 'Учебное пространство БРХК'
  },
  {
    slug: 'altargana-2026',
    href: '/news/altargana-2026/',
    category: 'Фестиваль',
    date: '12 июня 2026',
    title: 'БРХК на международном фестивале «Алтаргана»',
    excerpt: 'Участие учащихся и педагогов в большой культурной программе.',
    image: 'stage',
    alt: 'Участники концертной программы БРХК'
  },
  {
    slug: 'master-klass-po-valsu',
    href: '/news/master-klass-po-valsu/',
    category: 'Мастер-класс',
    date: '29 мая 2026',
    title: 'Открытый мастер-класс по сценическому вальсу',
    excerpt: 'Работа с музыкальностью, партнёрством и пространством сцены.',
    image: 'studio',
    alt: 'Балетный класс БРХК'
  }
];

const newsByPath = Object.fromEntries(newsItems.map(item => [item.href, item]));
const stageData = '/assets/stage.b64';
const studioData = '/assets/studio.b64';
const imageCache = {};

async function loadImage(name, url) {
  if (imageCache[name]) return imageCache[name];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Не удалось загрузить изображение: ${url}`);
  const b64 = (await response.text()).trim();
  imageCache[name] = `data:image/webp;base64,${b64}`;
  return imageCache[name];
}

async function hydrateImages() {
  const [stage, studio] = await Promise.all([
    loadImage('stage', stageData),
    loadImage('studio', studioData)
  ]);

  const sources = { stage, studio };
  const images = [...document.querySelectorAll('[data-photo]')];
  images.forEach(image => {
    image.src = sources[image.dataset.photo] || stage;
  });

  await Promise.all(images.map(image => image.decode?.().catch(() => undefined)));
  classifyEditorialCards();
}

function classifyEditorialCards() {
  document.querySelectorAll('[data-news-card]').forEach(card => {
    const image = card.querySelector('img');
    if (!image?.naturalWidth || !image?.naturalHeight) return;
    const ratio = image.naturalWidth / image.naturalHeight;
    card.classList.remove('is-portrait', 'is-landscape', 'is-square');
    card.classList.add(ratio < 0.86 ? 'is-portrait' : ratio > 1.22 ? 'is-landscape' : 'is-square');
  });
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

function normalizePath(pathname) {
  let path = pathname.replace(/index\.html$/, '');
  if (path !== '/' && !path.endsWith('/')) path += '/';
  return path;
}

function sectionHead(index, label, title, lead = '') {
  return `<div class="section-head"><div class="section-index">${esc(index)} · ${esc(label)}</div><div><h2>${title}</h2>${lead ? `<p class="section-lead">${esc(lead)}</p>` : ''}</div></div>`;
}

function primaryProgramCards() {
  return `<div class="program-grid">${programs.filter(program => program.primary).map(program => `
    <a class="program-card" href="${program.href}" data-cms-item="program">
      <img data-photo="${program.image}" alt="${esc(program.title)}" data-cms-field="image">
      <div class="program-body">
        <div class="program-meta"><span>${esc(program.code)}</span><span>${esc(program.type)}</span></div>
        <h3 data-cms-field="title">${esc(program.title)}</h3>
        <p data-cms-field="excerpt">${esc(program.description)}</p>
      </div>
    </a>`).join('')}</div>`;
}

function additionalPrograms() {
  return `<div class="additional-programs"><div class="additional-programs-label">Дополнительные программы</div>${programs.filter(program => !program.primary).map(program => `
    <a class="additional-program" href="${program.href}" data-cms-item="program">
      <div><span>${esc(program.code)}</span><h3 data-cms-field="title">${esc(program.title)}</h3></div>
      <p data-cms-field="excerpt">${esc(program.description)}</p>
      <strong aria-hidden="true">↗</strong>
    </a>`).join('')}</div>`;
}

function newsMagazine(items = newsItems, context = 'page') {
  return `<div class="editorial-news editorial-news-${context}" data-cms-collection="news">
    ${items.map((item, index) => `
      <article class="editorial-card" data-news-card data-cms-item="news" style="--editorial-order:${index}">
        <a href="${item.href}">
          <figure class="editorial-media">
            <img data-photo="${item.image}" alt="${esc(item.alt)}" data-cms-field="image">
          </figure>
          <div class="editorial-copy">
            <div class="editorial-meta"><span data-cms-field="category">${esc(item.category)}</span><time data-cms-field="date">${esc(item.date)}</time></div>
            <h3 data-cms-field="title">${esc(item.title)}</h3>
            <p data-cms-field="excerpt">${esc(item.excerpt)}</p>
            <span class="editorial-arrow" aria-hidden="true">→</span>
          </div>
        </a>
      </article>`).join('')}
  </div>`;
}

function gallery() {
  return `<div class="gallery-grid">
    <figure class="gallery-item"><img data-photo="stage" alt="Участники гала-концерта БРХК"><figcaption>Гала-концерт и большая сцена</figcaption></figure>
    <figure class="gallery-item gallery-item-small"><img data-photo="studio" alt="Балетный костюм в учебном зале"><figcaption>Учебный процесс и костюм</figcaption></figure>
  </div>`;
}

function homePage() {
  return `<main id="main">
    <section class="hero">
      <div class="hero-media"><img data-photo="stage" alt="Участники гала-концерта БРХК на сцене"></div>
      <div class="wrap hero-inner">
        <div><div class="eyebrow">Улан-Удэ · профессиональное образование в искусстве</div><h1>Сцена<br><em>начинается здесь</em></h1></div>
        <div class="hero-aside"><p>Классическая балетная традиция, культура Бурятии и современные творческие индустрии.</p><div class="button-row"><a class="button button-light" href="/admission/">Поступить ↗</a><a class="button button-outline" href="/education/">Программы</a></div></div>
      </div>
    </section>
    <div class="ticker"><div class="ticker-track"><span>БРХК · Искусство балета</span><span>Искусство танца</span><span>Сценическая практика</span><span>Культура Бурятии</span><span>Школа креативных индустрий</span><span>БРХК · Искусство балета</span><span>Искусство танца</span><span>Балет для всех</span></div></div>

    <section class="section section-paper"><div class="wrap">
      ${sectionHead('01', 'О колледже', 'Дисциплина.<br>Характер. Искусство.', 'Профессиональная школа начинается задолго до выхода на большую сцену.')}
      <div class="manifest">
        <article class="manifest-quote"><div class="eyebrow">Манифест БРХК</div><p>Не просто научить движению. Научить говорить со зрителем без единого слова.</p><small>Колледж объединяет академическую школу, национальную культуру и живую сценическую практику.</small></article>
        <figure class="photo-card"><img data-photo="studio" alt="Балетный костюм в учебном зале БРХК"><figcaption class="photo-overlay"><span>Ежедневная работа</span><strong>От класса — к большой сцене</strong></figcaption></figure>
      </div>
      <div class="stats"><div class="stat"><b>1961</b><span>год основания училища</span></div><div class="stat"><b>600+</b><span>выпускников профессиональной сцены</span></div><div class="stat"><b>2</b><span>основные программы СПО</span></div><div class="stat"><b>8 лет</b><span>траектория искусства балета</span></div></div>
    </div></section>

    <section class="section"><div class="wrap">
      ${sectionHead('02', 'Образование', 'Программы,<br>которые ведут на сцену', 'Основные программы СПО и дополнительные направления собраны в одном образовательном контуре.')}
      ${primaryProgramCards()}
      ${additionalPrograms()}
    </div></section>

    <section class="section section-paper news-section"><div class="wrap">
      ${sectionHead('03', 'Новости', 'Колледж<br>сегодня', 'Редакционная лента автоматически подстраивается под вертикальные, горизонтальные и квадратные фотографии.')}
      ${newsMagazine(newsItems.slice(0, 5), 'home')}
      <div class="section-action"><a class="button button-dark" href="/news/">Все новости →</a></div>
    </div></section>

    <section class="section section-dark"><div class="wrap">
      ${sectionHead('04', 'Поступление', 'Ваш путь<br>в БРХК', 'Просмотр, медицинская комиссия, творческий отбор и документы — без бюрократического тумана.')}
      <div class="card-grid"><article class="card card-dark"><span class="card-kicker">01</span><h3>Выберите программу</h3><p>Возраст, срок обучения, квалификация и требования к подготовке.</p><a href="/education/">Смотреть программы →</a></article><article class="card card-dark"><span class="card-kicker">02</span><h3>Запишитесь на просмотр</h3><p>Даты, формат, медицинские заключения и контакты приёмной комиссии.</p><a href="/admission/">Порядок поступления →</a></article><article class="card card-dark"><span class="card-kicker">03</span><h3>Пройдите отбор</h3><p>Физические данные, музыкальность, координация и сценический номер.</p><a href="tel:+73012212313">Связаться с приёмной →</a></article></div>
    </div></section>

    <section class="section section-paper"><div class="wrap">
      ${sectionHead('05', 'Галерея', 'Люди, пространство,<br>сцена')}
      ${gallery()}
    </div></section>
  </main>`;
}

function educationPage() {
  const primary = programs.filter(program => program.primary);
  const additional = programs.filter(program => !program.primary);
  return `<main id="main">
    ${pageHero('Образование', 'Профессиональная школа движения', 'Основные программы среднего профессионального образования и дополнительные направления колледжа.', 'stage')}
    ${breadcrumbs('Образование')}
    <section class="page-section"><div class="wrap">
      <div class="education-intro"><span>Образовательная экосистема</span><p>ШКИ и «Балет для всех» больше не вынесены в случайный блок: они встроены в общую структуру программ рядом с основными специальностями.</p></div>
      <div class="education-group"><div class="education-group-head"><span>01</span><div><h2>Основные программы СПО</h2><p>Профессиональная подготовка артистов и преподавателей.</p></div></div><div class="education-program-list">${primary.map(program => educationProgram(program)).join('')}</div></div>
      <div class="education-group"><div class="education-group-head"><span>02</span><div><h2>Дополнительные программы</h2><p>Новые аудитории, современные инструменты и открытый доступ к культуре движения.</p></div></div><div class="education-program-list education-program-list-additional">${additional.map(program => educationProgram(program)).join('')}</div></div>
    </div></section>
  </main>`;
}

function educationProgram(program) {
  return `<a class="education-program" href="${program.href}" data-cms-item="program"><div class="education-program-media"><img data-photo="${program.image}" alt="${esc(program.title)}"></div><div class="education-program-copy"><div class="program-meta"><span>${esc(program.code)}</span><span>${esc(program.type)}</span></div><h3>${esc(program.title)}</h3><p>${esc(program.description)}</p><strong>Открыть программу →</strong></div></a>`;
}

function newsPage() {
  return `<main id="main">
    ${pageHero('Медиа', 'Новости', 'События, достижения, гастроли, конкурсы и повседневная жизнь колледжа.', 'stage')}
    ${breadcrumbs('Новости')}
    <section class="page-section editorial-page"><div class="wrap editorial-layout">
      <aside class="editorial-sidebar"><strong>БРХК</strong><a aria-current="page" href="/news/">Новости</a><a href="/events/">Афиша</a><a href="/gallery/">Галерея</a></aside>
      <div><div class="editorial-page-head"><h2>Последние публикации</h2><p>Карточка получает форму по пропорциям загруженной фотографии. Редактору не нужно вручную перестраивать сетку.</p></div>${newsMagazine(newsItems, 'archive')}</div>
    </div></section>
  </main>`;
}

function newsArticlePage(item) {
  return `<main id="main">
    <article class="article" data-cms-item="news">
      <header class="article-head"><div class="wrap article-head-grid"><div><div class="eyebrow">${esc(item.category)} · ${esc(item.date)}</div><h1 data-cms-field="title">${esc(item.title)}</h1><p data-cms-field="excerpt">${esc(item.excerpt)}</p></div><span class="article-number">БРХК / NEWS</span></div></header>
      <figure class="article-visual"><img data-photo="${item.image}" alt="${esc(item.alt)}" data-cms-field="image"></figure>
      <div class="wrap article-layout"><div class="article-body" data-cms-field="body"><p class="article-lead">Этот шаблон показывает, как будет выглядеть полноценная публикация после подключения действующей CMS колледжа.</p><h2>История, а не формальный отчёт</h2><p>Материал поддерживает подзаголовки, крупные фотографии, цитаты, галереи, подписи, автора, рубрику, связанные документы и ссылки на события.</p><blockquote>Хорошая новость должна не просто сообщать факт, а давать почувствовать жизнь колледжа.</blockquote><h2>Что подключается из CMS</h2><p>Заголовок, лид, дата, рубрика, обложка, основной текст и медиагалерея становятся отдельными редактируемыми полями. Ориентация обложки определяется автоматически.</p></div>${sideNavigation()}</div>
    </article>
  </main>`;
}

function pageHero(kicker, title, description, image = 'stage') {
  return `<section class="page-hero"><div class="page-hero-media"><img data-photo="${image}" alt=""></div><div class="wrap page-hero-inner"><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div></section>`;
}

function breadcrumbs(title) {
  return `<nav class="breadcrumbs" aria-label="Хлебные крошки"><div class="wrap"><ol><li><a href="/">Главная</a></li><li><span aria-current="page">${esc(title)}</span></li></ol></div></nav>`;
}

function cardGrid(sections = []) {
  return `<div class="card-grid">${sections.map(([title, description], index) => `<article class="card"><span class="card-kicker">${String(index + 1).padStart(2, '0')}</span><h3>${esc(title)}</h3><p>${esc(description)}</p></article>`).join('')}</div>`;
}

function sideNavigation() {
  return `<aside class="side-card"><h3>Разделы сайта</h3><a href="/about/">О колледже</a><a href="/education/">Образование</a><a href="/admission/">Абитуриентам</a><a href="/students/">Студентам</a><a href="/news/">Новости</a><a href="/documents/">Документы</a><a href="/sveden/">Сведения об организации</a></aside>`;
}

function genericPage(path, page) {
  let content = '';
  if (page.gallery) {
    content = gallery();
  } else if (page.documents) {
    content = `<div class="document-list">${page.documents.map(title => `<div class="document-item"><span class="document-icon">PDF</span><div><strong>${esc(title)}</strong><br><small>Файл, дата и размер подключаются из CMS</small></div><a href="#" aria-label="Скачать ${esc(title)}">Скачать</a></div>`).join('')}</div><div class="legal-note">В демонстрационной версии ссылки на документы не активны. Финальные файлы переносятся из действующей CMS.</div>`;
  } else if (page.sveden) {
    content = `<div class="sveden-grid">${sveden.map(([slug, title]) => `<a href="/sveden/${slug}/">${esc(title)}</a>`).join('')}</div><div class="legal-note">Структура раздела подготовлена. Значения и документы подлежат сверке колледжем перед публикацией.</div>`;
  } else {
    content = `<section class="prose"><h2>${esc(page.title)}</h2><p>${esc(page.description)}</p></section>${cardGrid(page.sections)}`;
  }

  const image = path.includes('creative') || path.includes('students') ? 'studio' : 'stage';
  return `<main id="main">${pageHero(page.kicker, page.title, page.description, image)}${breadcrumbs(page.title)}<section class="page-section"><div class="wrap page-layout"><div>${content}</div>${sideNavigation()}</div></section></main>`;
}

function render() {
  const path = normalizePath(location.pathname);
  let html;
  if (path === '/') html = homePage();
  else if (path === '/education/') html = educationPage();
  else if (path === '/news/') html = newsPage();
  else if (newsByPath[path]) html = newsArticlePage(newsByPath[path]);
  else html = genericPage(path, pages[path] || {
    kicker: 'Ошибка 404',
    title: 'Страница не найдена',
    description: 'Проверьте адрес или вернитесь на главную.',
    sections: [['Вернуться на главную', 'Используйте основное меню или поиск по сайту.']]
  });

  document.getElementById('app').innerHTML = html;
  hydrateImages().catch(console.error);
  document.querySelectorAll('.primary-nav a').forEach(link => {
    const href = link.getAttribute('href');
    link.toggleAttribute('aria-current', path !== '/' && path.startsWith(href));
  });
}

const nav = document.getElementById('primary-nav');
const menu = document.getElementById('menu-button');
const header = document.querySelector('.site-header');

function setMenu(open) {
  nav.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Закрыть' : 'Меню';
  if (open) nav.style.setProperty('--nav-top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
}

menu.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
addEventListener('resize', () => {
  if (innerWidth > 860) setMenu(false);
});

const access = document.getElementById('access-panel');
const search = document.getElementById('search-modal');
const defaults = { size: 'normal', theme: 'normal', images: 'on', spacing: 'normal', motion: 'on' };
let saved = {};
try { saved = JSON.parse(localStorage.getItem('brhk-access') || '{}'); } catch { saved = {}; }
const settings = { ...defaults, ...saved };

function applySettings() {
  Object.entries(settings).forEach(([key, value]) => { document.documentElement.dataset[key] = value; });
  document.querySelectorAll('[data-setting]').forEach(button => {
    button.setAttribute('aria-pressed', String(settings[button.dataset.setting] === button.dataset.value));
  });
  try { localStorage.setItem('brhk-access', JSON.stringify(settings)); } catch {}
}

applySettings();

document.addEventListener('click', event => {
  const settingButton = event.target.closest('[data-setting]');
  if (settingButton) {
    settings[settingButton.dataset.setting] = settingButton.dataset.value;
    applySettings();
  }
  if (event.target.closest('[data-access-reset]')) {
    Object.assign(settings, defaults);
    applySettings();
  }
  if (event.target.closest('[data-access-open]')) {
    access.classList.add('open');
    access.setAttribute('aria-hidden', 'false');
  }
  if (event.target.closest('[data-access-close]')) {
    access.classList.remove('open');
    access.setAttribute('aria-hidden', 'true');
  }
  if (event.target.closest('[data-search-open]')) {
    search.classList.add('open');
    search.setAttribute('aria-hidden', 'false');
    document.getElementById('site-search').focus();
  }
  if (event.target.closest('[data-search-close]')) {
    search.classList.remove('open');
    search.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setMenu(false);
    access.classList.remove('open');
    search.classList.remove('open');
  }
});

const searchIndex = [
  ['Главная', '/', 'балет танец сцена'],
  ['Образование', '/education/', 'искусство балета искусство танца ШКИ балет для всех'],
  ...Object.entries(pages).map(([url, page]) => [page.title, url, page.description]),
  ...newsItems.map(item => [item.title, item.href, `${item.category} ${item.excerpt}`])
];

document.getElementById('site-search').addEventListener('input', event => {
  const query = event.target.value.toLowerCase().trim();
  const output = document.getElementById('search-results');
  if (query.length < 2) {
    output.innerHTML = '<p>Введите минимум два символа.</p>';
    return;
  }
  const results = searchIndex.filter(item => `${item[0]} ${item[2]}`.toLowerCase().includes(query)).slice(0, 12);
  output.innerHTML = results.length ? results.map(item => `<a href="${item[1]}"><b>${esc(item[0])}</b><br><small>${esc(item[2])}</small></a>`).join('') : '<p>Ничего не найдено.</p>';
});

render();
