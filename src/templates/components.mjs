export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

export const xml = esc;

const imageDefinitions = {
  stage: {
    src: '/assets/images/studio-tutu-landscape.webp',
    srcset: '/assets/images/studio-tutu-landscape-320.webp 320w, /assets/images/studio-tutu-landscape.webp 480w',
    width: 480,
    height: 320
  },
  studio: {
    src: '/assets/images/studio-tutu.webp',
    srcset: '/assets/images/studio-tutu-320.webp 320w, /assets/images/studio-tutu.webp 480w',
    width: 480,
    height: 720
  },
  studioPortrait: {
    src: '/assets/images/studio-tutu.webp',
    srcset: '/assets/images/studio-tutu-320.webp 320w, /assets/images/studio-tutu.webp 480w',
    width: 480,
    height: 720
  },
  studioLandscape: {
    src: '/assets/images/studio-tutu-landscape.webp',
    srcset: '/assets/images/studio-tutu-landscape-320.webp 320w, /assets/images/studio-tutu-landscape.webp 480w',
    width: 480,
    height: 320
  },
  studioSquare: {
    src: '/assets/images/studio-tutu-square.webp',
    srcset: '/assets/images/studio-tutu-square-320.webp 320w, /assets/images/studio-tutu-square.webp 480w',
    width: 480,
    height: 480
  }
};

export function image(name, alt, options = {}) {
  const definition = imageDefinitions[name] || imageDefinitions.stage;
  const loading = options.eager ? 'eager' : 'lazy';
  const priority = options.eager ? ' fetchpriority="high"' : '';
  const field = options.cmsField ? ` data-cms-field="${esc(options.cmsField)}"` : '';
  const className = options.className ? ` class="${esc(options.className)}"` : '';
  const sizes = options.sizes || '(max-width: 860px) 92vw, 50vw';
  return `<img${className} src="${definition.src}" srcset="${definition.srcset}" sizes="${esc(sizes)}" width="${definition.width}" height="${definition.height}" loading="${loading}" decoding="async"${priority} alt="${esc(alt)}"${field}>`;
}

export function sectionHead(index, label, title, lead = '') {
  return `<div class="section-head"><div class="section-index">${esc(index)} · ${esc(label)}</div><div><h2>${title}</h2>${lead ? `<p class="section-lead">${esc(lead)}</p>` : ''}</div></div>`;
}

export function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Хлебные крошки"><div class="wrap"><ol>${items.map((item, index) => {
    const current = index === items.length - 1;
    return `<li>${current ? `<span aria-current="page">${esc(item.title)}</span>` : `<a href="${esc(item.href)}">${esc(item.title)}</a>`}</li>`;
  }).join('')}</ol></div></nav>`;
}

export function pageHero(kicker, title, description, imageName = 'stage') {
  return `<section class="page-hero"><div class="page-hero-media">${image(imageName, '', { sizes: '100vw' })}</div><div class="wrap page-hero-inner"><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div></section>`;
}

export function sideNavigation() {
  return `<aside class="side-card"><h2>Разделы сайта</h2><a href="/about/">О колледже</a><a href="/education/">Образование</a><a href="/admission/">Абитуриентам</a><a href="/students/">Студентам</a><a href="/news/">Новости</a><a href="/documents/">Документы</a><a href="/sveden/">Сведения об организации</a></aside>`;
}

export function cardGrid(sections = []) {
  return `<div class="card-grid">${sections.map(([title, description], index) => `<article class="card"><span class="card-kicker">${String(index + 1).padStart(2, '0')}</span><h3>${esc(title)}</h3><p>${esc(description)}</p></article>`).join('')}</div>`;
}

function automaticEditorialVariant(item) {
  const override = item.editorialVariant;
  if (override === 'featured') return 'is-featured is-wide';
  if (override === 'wide') return 'is-wide is-landscape';
  if (override === 'portrait') return 'is-portrait';
  if (override === 'square' || override === 'standard') return 'is-square';
  const width = Number(item.imageWidth || 0);
  const height = Number(item.imageHeight || 0);
  if (!width || !height) return 'is-square';
  const ratio = width / height;
  return ratio < 0.86 ? 'is-portrait' : ratio > 1.22 ? 'is-landscape' : 'is-square';
}

export function editorialNews(items, context = 'page') {
  return `<div class="editorial-news editorial-news-${esc(context)}" data-cms-collection="news">${items.map((item, index) => {
    const classes = automaticEditorialVariant(item);
    const headingId = `news-${esc(item.slug)}-${index}`;
    return `<article class="editorial-card ${classes}" data-news-card data-cms-item="news"><a href="${esc(item.href)}" aria-labelledby="${headingId}"><figure class="editorial-media">${image(item.image || item.coverImage, item.alt || item.coverAlt, { cmsField: 'image', sizes: '(max-width: 860px) 46vw, 50vw' })}</figure><div class="editorial-copy"><div class="editorial-meta"><span data-cms-field="category">${esc(item.category)}</span><time datetime="${esc(item.publishedAt || '')}" data-cms-field="date">${esc(item.date)}</time></div><h3 id="${headingId}" data-cms-field="title">${esc(item.title)}</h3><p data-cms-field="excerpt">${esc(item.excerpt)}</p><span class="editorial-arrow" aria-hidden="true">→</span></div></a></article>`;
  }).join('')}</div>`;
}

export function gallery() {
  return `<div class="gallery-grid"><figure class="gallery-item">${image('studioLandscape', 'Балетный костюм и экран с занятием в учебном зале БРХК', { sizes: '(max-width: 860px) 100vw, 65vw' })}<figcaption>Учебный зал и экран с занятием</figcaption></figure><figure class="gallery-item gallery-item-small">${image('studioPortrait', 'Балетный костюм в учебном зале БРХК', { sizes: '(max-width: 860px) 100vw, 35vw' })}<figcaption>Балетный костюм в учебном пространстве</figcaption></figure></div>`;
}

export function programCard(program) {
  return `<a class="program-card" href="${esc(program.href)}" data-cms-item="program">${image(program.image, program.imageAlt || 'Балетный костюм в учебном зале БРХК', { cmsField: 'image' })}<div class="program-body"><div class="program-meta"><span>${esc(program.code)}</span><span>${esc(program.type)}</span></div><h3 data-cms-field="title">${esc(program.title)}</h3><p data-cms-field="excerpt">${esc(program.description)}</p></div></a>`;
}

export function educationProgram(program) {
  return `<a class="education-program" href="${esc(program.href)}" data-cms-item="program"><div class="education-program-media">${image(program.image, program.imageAlt || 'Балетный костюм в учебном зале БРХК', { sizes: '(max-width: 860px) 100vw, 50vw' })}</div><div class="education-program-copy"><div class="program-meta"><span>${esc(program.code)}</span><span>${esc(program.type)}</span></div><h3 data-cms-field="title">${esc(program.title)}</h3><p data-cms-field="excerpt">${esc(program.description)}</p><strong>Открыть программу →</strong></div></a>`;
}
