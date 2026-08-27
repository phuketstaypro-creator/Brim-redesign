import {
  breadcrumbs,
  cardGrid,
  editorialNews,
  educationProgram,
  esc,
  gallery,
  image,
  pageHero,
  programCard,
  sectionHead,
  sideNavigation
} from './components.mjs';

function primaryProgramCards(programs) {
  return `<div class="program-grid">${programs.filter((program) => program.primary).map(programCard).join('')}</div>`;
}

function additionalPrograms(programs) {
  return `<div class="additional-programs"><div class="additional-programs-label">Дополнительные программы</div>${programs.filter((program) => !program.primary).map((program) => `<a class="additional-program" href="${esc(program.href)}" data-cms-item="program"><div><span>${esc(program.code)}</span><h3 data-cms-field="title">${esc(program.title)}</h3></div><p data-cms-field="excerpt">${esc(program.description)}</p><strong aria-hidden="true">↗</strong></a>`).join('')}</div>`;
}

function newestFirst(items) {
  return [...items].sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
}

export function renderHome({ site, programs, newsItems }) {
  const latestNews = newestFirst(newsItems).slice(0, 5);
  return {
    route: '/',
    title: site.name,
    description: site.description,
    image: '/assets/images/studio-tutu-landscape.webp',
    content: `<main id="main">
      <section class="hero"><div class="hero-media">${image('studioLandscape', '', { eager: true, sizes: '100vw' })}</div><div class="wrap hero-inner"><div><div class="eyebrow">Улан-Удэ · профессиональное образование в искусстве</div><h1>Сцена<br><em>начинается здесь</em></h1></div><div class="hero-aside"><p>Классическая балетная традиция, культура Бурятии и современные творческие индустрии.</p><div class="button-row"><a class="button button-light" href="/admission/">Поступить ↗</a><a class="button button-outline" href="/education/">Программы</a></div></div></div></section>
      <div class="ticker" aria-hidden="true"><div class="ticker-track"><span>БРХК · Искусство балета</span><span>Искусство танца</span><span>Сценическая практика</span><span>Культура Бурятии</span><span>Школа креативных индустрий</span><span>БРХК · Искусство балета</span><span>Искусство танца</span><span>Балет для всех</span></div></div>

      <section class="section section-paper"><div class="wrap">${sectionHead('01', 'О колледже', 'Дисциплина.<br>Характер. Искусство.', 'Профессиональная школа начинается задолго до выхода на большую сцену.')}<div class="manifest"><article class="manifest-quote"><div class="eyebrow">Манифест БРХК</div><p>Не просто научить движению. Научить говорить со зрителем без единого слова.</p><small>Колледж объединяет академическую школу, национальную культуру и живую сценическую практику.</small></article><figure class="photo-card">${image('studio', 'Балетный костюм в учебном зале БРХК', { sizes: '(max-width: 860px) 100vw, 50vw' })}<figcaption class="photo-overlay"><span>Ежедневная работа</span><strong>От класса — к большой сцене</strong></figcaption></figure></div><div class="stats"><div class="stat"><b>1961</b><span>год основания училища</span></div><div class="stat"><b>2</b><span>основные программы СПО</span></div><div class="stat"><b>2</b><span>дополнительные программы</span></div><div class="stat"><b>14</b><span>обязательных подразделов сведений</span></div></div></div></section>

      <section class="section"><div class="wrap">${sectionHead('02', 'Образование', 'Программы,<br>которые ведут на сцену', 'Основные программы СПО и дополнительные направления собраны в одном образовательном контуре.')}${primaryProgramCards(programs)}${additionalPrograms(programs)}</div></section>

      <section class="section section-paper news-section"><div class="wrap">${sectionHead('03', 'Новости', 'Колледж<br>сегодня', 'Редакционная лента автоматически подстраивается под вертикальные, горизонтальные и квадратные фотографии.')}${editorialNews(latestNews, 'home')}<div class="section-action"><a class="button button-dark" href="/news/">Все новости →</a></div></div></section>

      <section class="section section-dark"><div class="wrap">${sectionHead('04', 'Поступление', 'Ваш путь<br>в БРХК', 'Просмотр, медицинская комиссия, творческий отбор и документы — без бюрократического тумана.')}<div class="card-grid"><article class="card card-dark"><span class="card-kicker">01</span><h3>Выберите программу</h3><p>Возраст, срок обучения, квалификация и требования к подготовке.</p><a href="/education/">Смотреть программы →</a></article><article class="card card-dark"><span class="card-kicker">02</span><h3>Запишитесь на просмотр</h3><p>Даты, формат, медицинские заключения и контакты приёмной комиссии.</p><a href="/admission/">Порядок поступления →</a></article><article class="card card-dark"><span class="card-kicker">03</span><h3>Пройдите отбор</h3><p>Физические данные, музыкальность, координация и сценический номер.</p><a href="tel:+73012212313">Связаться с приёмной →</a></article></div></div></section>

      <section class="section section-paper"><div class="wrap">${sectionHead('05', 'Галерея', 'Люди, пространство,<br>сцена')}${gallery()}</div></section>
    </main>`
  };
}

export function renderEducation({ programs }) {
  const primary = programs.filter((program) => program.primary);
  const additional = programs.filter((program) => !program.primary);
  return {
    route: '/education/',
    title: 'Образование',
    description: 'Основные программы среднего профессионального образования и дополнительные направления колледжа.',
    image: '/assets/images/studio-tutu-landscape.webp',
    content: `<main id="main">${pageHero('Образование', 'Профессиональная школа движения', 'Основные программы среднего профессионального образования и дополнительные направления колледжа.', 'stage')}${breadcrumbs([{ href: '/', title: 'Главная' }, { title: 'Образование' }])}<section class="page-section"><div class="wrap"><div class="education-intro"><span>Образовательная экосистема</span><p>ШКИ и «Балет для всех» встроены в общую структуру программ рядом с основными специальностями.</p></div><div class="education-group"><div class="education-group-head"><span>01</span><div><h2>Основные программы СПО</h2><p>Профессиональная подготовка артистов и преподавателей.</p></div></div><div class="education-program-list">${primary.map(educationProgram).join('')}</div></div><div class="education-group"><div class="education-group-head"><span>02</span><div><h2>Дополнительные программы</h2><p>Новые аудитории, современные инструменты и открытый доступ к культуре движения.</p></div></div><div class="education-program-list education-program-list-additional">${additional.map(educationProgram).join('')}</div></div></div></section></main>`
  };
}

export function renderNews({ newsItems }) {
  const latestNews = newestFirst(newsItems);
  return {
    route: '/news/',
    title: 'Новости',
    description: 'События, достижения, гастроли, конкурсы и повседневная жизнь колледжа.',
    image: '/assets/images/studio-tutu-landscape.webp',
    content: `<main id="main">${pageHero('Медиа', 'Новости', 'События, достижения, гастроли, конкурсы и повседневная жизнь колледжа.', 'stage')}${breadcrumbs([{ href: '/', title: 'Главная' }, { title: 'Новости' }])}<section class="page-section editorial-page"><div class="wrap editorial-layout"><aside class="editorial-sidebar"><strong>БРХК</strong><a aria-current="page" href="/news/">Новости</a><a href="/events/">Афиша</a><a href="/gallery/">Галерея</a></aside><div><div class="editorial-page-head"><h2>Последние публикации</h2><p>Заголовки и даты сверены с действующим сайтом БРХК. Полные тексты и медиатека подключаются после согласованного экспорта CMS. Форма карточки автоматически учитывает пропорции фотографии.</p></div>${editorialNews(latestNews, 'archive')}</div></div></section></main>`
  };
}

export function renderNewsArticle(item) {
  const published = item.publishedAt || '';
  const sourceBlock = item.source
    ? `<p class="legal-note"><strong>Источник:</strong> заголовок и дата сверены с действующим сайтом колледжа. <a href="${esc(item.source)}" rel="external">${esc(item.sourceLabel || 'Открыть официальный материал')} ↗</a></p>`
    : '<p class="legal-note"><strong>Шаблон без источника.</strong> Материал не публикуется как подтверждённая новость до сверки с CMS колледжа.</p>';
  return {
    route: item.href,
    title: item.seoTitle || item.title,
    description: item.seoDescription || item.excerpt,
    type: 'article',
    image: item.image === 'studioPortrait' || item.image === 'studio' ? '/assets/images/studio-tutu.webp' : item.image === 'studioSquare' ? '/assets/images/studio-tutu-square.webp' : '/assets/images/studio-tutu-landscape.webp',
    content: `<main id="main"><article class="article" data-cms-item="news"><header class="article-head"><div class="wrap article-head-grid"><div><div class="eyebrow">${esc(item.category)} · <time datetime="${esc(published)}">${esc(item.date)}</time></div><h1 data-cms-field="title">${esc(item.title)}</h1><p data-cms-field="excerpt">${esc(item.excerpt)}</p></div><span class="article-number">БРХК / NEWS</span></div></header><figure class="article-visual">${image(item.image, item.alt, { cmsField: 'image', eager: true, sizes: '100vw' })}</figure>${breadcrumbs([{ href: '/', title: 'Главная' }, { href: '/news/', title: 'Новости' }, { title: item.title }])}<div class="wrap article-layout"><div class="article-body" data-cms-field="body">${sourceBlock}<p class="article-lead">${esc(item.excerpt)}</p><h2>Полная публикация</h2><p>До согласованного экспорта CMS здесь сохраняется краткая карточка с проверяемой ссылкой. Основной текст, авторство и медиагалерея не копируются и не дополняются без подтверждённого источника.</p></div>${sideNavigation()}</div></article></main>`
  };
}

function documents(page) {
  return `<div class="document-list">${page.documents.map((title) => `<div class="document-item"><span class="document-icon" aria-hidden="true">PDF</span><div><strong>${esc(title)}</strong><br><small>Файл, дата и размер подключаются из CMS после сверки.</small></div><span class="document-pending">Ожидает файла</span></div>`).join('')}</div><div class="legal-note">В демонстрационной версии неподтверждённые документы не публикуются как активные ссылки.</div>`;
}

function svedenIndex(svedenSections) {
  return `<div class="sveden-grid">${svedenSections.map((section) => `<a href="${esc(section.href)}">${esc(section.title)}</a>`).join('')}</div><div class="legal-note">Структура раздела подготовлена. Значения и документы подлежат сверке колледжем перед публикацией.</div>`;
}

export function renderGeneric(route, page, svedenSections) {
  let body;
  if (page.gallery) body = gallery();
  else if (page.documents) body = documents(page);
  else if (page.sveden) body = svedenIndex(svedenSections);
  else body = `<section class="prose"><h2>${esc(page.title)}</h2><p>${esc(page.description)}</p></section>${cardGrid(page.sections)}`;

  const imageName = route.includes('creative') || route.includes('students') ? 'studio' : 'stage';
  const crumbItems = route.startsWith('/sveden/') && route !== '/sveden/'
    ? [{ href: '/', title: 'Главная' }, { href: '/sveden/', title: 'Сведения об организации' }, { title: page.title }]
    : [{ href: '/', title: 'Главная' }, { title: page.title }];

  return {
    route,
    title: page.seoTitle || page.title,
    description: page.description,
    image: imageName === 'studio' ? '/assets/images/studio-tutu.webp' : '/assets/images/studio-tutu-landscape.webp',
    content: `<main id="main">${pageHero(page.kicker, page.title, page.description, imageName)}${breadcrumbs(crumbItems)}<section class="page-section"><div class="wrap page-layout"><div>${body}</div>${sideNavigation()}</div></section></main>`
  };
}

export function renderNotFound() {
  return {
    route: '/404/',
    title: 'Страница не найдена',
    description: 'Запрошенная страница не найдена.',
    noindex: true,
    content: `<main id="main">${pageHero('Ошибка 404', 'Страница не найдена', 'Проверьте адрес или вернитесь на главную.', 'stage')}${breadcrumbs([{ href: '/', title: 'Главная' }, { title: 'Страница не найдена' }])}<section class="page-section"><div class="wrap"><p><a class="button button-dark" href="/">Вернуться на главную</a></p></div></section></main>`
  };
}
