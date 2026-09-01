export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

export const xml = esc;

let mediaRegistry = null;

export function configureMediaRegistry(registry) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    throw new Error('A materialized media registry is required');
  }
  mediaRegistry = registry;
}

export function mediaById(mediaId, { optional = false } = {}) {
  if (!mediaId && optional) return null;
  if (!mediaRegistry) throw new Error('Media registry was not configured before rendering');
  const asset = mediaRegistry[mediaId];
  if (!asset && optional) return null;
  if (!asset) throw new Error(`Unknown media id: ${mediaId || '(empty)'}`);
  return asset;
}

function mediaAttributes(asset) {
  const credit = asset.credit ? ` data-media-credit="${esc(asset.credit)}"` : '';
  const rights = asset.rightsStatus ? ` data-media-rights="${esc(asset.rightsStatus)}"` : '';
  return `${credit}${rights}`;
}

export function image(mediaId, alt, options = {}) {
  const asset = mediaById(mediaId, { optional: options.optional });
  if (!asset) return '';
  const loading = options.eager ? 'eager' : 'lazy';
  const priority = options.eager ? ' fetchpriority="high"' : '';
  const field = options.cmsField ? ` data-cms-field="${esc(options.cmsField)}"` : '';
  const className = options.className ? ` class="${esc(options.className)}"` : '';
  const sizes = options.sizes || '(max-width: 860px) 92vw, 50vw';
  const alternative = alt === undefined ? asset.defaultAlt : alt;
  if (typeof alternative !== 'string') throw new Error(`${mediaId}: image alt must be a string`);
  const tag = `<img${className} src="${esc(asset.src)}" srcset="${esc(asset.srcset)}" sizes="${esc(sizes)}" width="${asset.width}" height="${asset.height}" loading="${loading}" decoding="async"${priority} alt="${esc(alternative)}" data-media-id="${esc(mediaId)}"${mediaAttributes(asset)}${field}>`;
  if (!asset.mobile) return tag;
  return `<picture><source media="(max-width: 600px)" srcset="${esc(asset.mobile.srcset)}" sizes="${esc(options.mobileSizes || sizes)}">${tag}</picture>`;
}

export function lines(value) {
  return esc(value).replace(/\n/g, '<br>');
}

export function sectionHead(index, label, title, lead = '') {
  return `<div class="section-head"><div class="section-index">${esc(index)} · ${esc(label)}</div><div><h2>${lines(title)}</h2>${lead ? `<p class="section-lead">${esc(lead)}</p>` : ''}</div></div>`;
}

export function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Хлебные крошки"><div class="wrap"><ol>${items.map((item, index) => {
    const current = index === items.length - 1;
    return `<li>${current ? `<span aria-current="page">${esc(item.title)}</span>` : `<a href="${esc(item.href)}">${esc(item.title)}</a>`}</li>`;
  }).join('')}</ol></div></nav>`;
}

export function pageHero(kicker, title, description, mediaId) {
  const visual = mediaId
    ? `<div class="page-hero-media">${image(mediaId, '', { sizes: '100vw' })}</div>`
    : '<div class="page-hero-media page-hero-media-empty" aria-hidden="true"></div>';
  return `<section class="page-hero">${visual}<div class="wrap page-hero-inner"><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div></section>`;
}

function currentAttribute(route, href) {
  return route && href && route === href ? ' aria-current="page"' : '';
}

function groupedNavigationItems(items = []) {
  const groups = new Map();
  for (const item of items) {
    const label = typeof item?.group === 'string' && item.group.trim() ? item.group.trim() : '';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }
  return groups;
}

export function sideNavigation(items = [], { title = 'Разделы сайта', route = '' } = {}) {
  return `<aside class="side-card"><nav aria-label="${esc(title)}"><h2>${esc(title)}</h2>${items.map((item) => `<a href="${esc(item.href)}"${currentAttribute(route, item.href)}>${esc(item.label)}</a>`).join('')}</nav></aside>`;
}

export function disclosureDirectory(svedenSections = [], institutionalNavigation = [], route = '') {
  const mandatory = svedenSections.filter((section) => section.group === 'mandatory');
  const legacy = svedenSections.filter((section) => section.group === 'legacy');
  const links = (items) => `<ul>${items.map((item) => `<li><a href="${esc(item.href)}"${currentAttribute(route, item.href)}>${esc(item.title || item.label)}</a></li>`).join('')}</ul>`;
  const supplemental = [
    ...institutionalNavigation.map((item) => ({ ...item, title: item.label })),
    ...legacy
  ];
  const supplementalOpen = supplemental.some((item) => item.href === route) ? ' open' : '';

  return `<aside class="side-card disclosure-directory"><nav aria-label="Разделы сведений"><h2>Сведения об организации</h2><a class="directory-overview" href="/sveden/"${currentAttribute(route, '/sveden/')}>Все сведения</a><details open><summary>Обязательные подразделы</summary>${links(mandatory)}</details><details${supplementalOpen}><summary>Сервисы и открытость</summary>${links(supplemental)}</details></nav></aside>`;
}

export function navigationDirectory(items = [], route = '') {
  return `<div class="site-map-grid">${items.map((item, index) => {
    const children = Array.isArray(item.children) ? item.children : [];
    const heading = item.href
      ? `<h2><a href="${esc(item.href)}"${currentAttribute(route, item.href)}>${esc(item.label)}</a></h2>`
      : `<h2>${esc(item.label)}</h2>`;
    if (!children.length) return `<section class="site-map-section"><span class="site-map-index">${String(index + 1).padStart(2, '0')}</span>${heading}</section>`;
    const groups = [...groupedNavigationItems(children).entries()];
    return `<section class="site-map-section"><span class="site-map-index">${String(index + 1).padStart(2, '0')}</span>${heading}<div class="site-map-groups">${groups.map(([group, links]) => `<div>${group ? `<h3>${esc(group)}</h3>` : ''}<ul>${links.map((link) => `<li><a href="${esc(link.href)}"${currentAttribute(route, link.href)}>${esc(link.label)}</a></li>`).join('')}</ul></div>`).join('')}</div></section>`;
  }).join('')}</div>`;
}

export function cardGrid(sections = []) {
  const items = Array.isArray(sections) ? sections : [];
  return `<div class="card-grid">${items.map(([title, description], index) => `<article class="card"><span class="card-kicker">${String(index + 1).padStart(2, '0')}</span><h3>${esc(title)}</h3><p>${esc(description)}</p></article>`).join('')}</div>`;
}

function automaticEditorialVariant(item) {
  const override = item.editorialVariant;
  if (override === 'featured') return 'is-featured is-wide';
  if (override === 'wide') return 'is-wide is-landscape';
  if (override === 'portrait') return 'is-portrait';
  if (override === 'square' || override === 'standard') return 'is-square';
  const asset = mediaById(item.coverImage || item.image, { optional: true });
  const width = Number(item.imageWidth || asset?.width || 0);
  const height = Number(item.imageHeight || asset?.height || 0);
  if (!width || !height) return 'is-square';
  const ratio = width / height;
  return ratio < 0.86 ? 'is-portrait' : ratio > 1.22 ? 'is-landscape' : 'is-square';
}

function editorialMedia(item, index) {
  const mediaId = item.coverImage || item.image;
  if (!mediaId) {
    return '<div class="editorial-media editorial-media-empty" data-state="empty" aria-hidden="true"></div>';
  }
  const alt = item.coverAlt ?? item.alt;
  const caption = item.coverCaption ? `<figcaption class="editorial-credit">${esc(item.coverCaption)}</figcaption>` : '';
  return `<figure class="editorial-media">${image(mediaId, alt, {
    cmsField: 'image',
    eager: index < 4,
    sizes: '(max-width: 860px) 46vw, 50vw'
  })}${caption}</figure>`;
}

export function editorialNews(items, context = 'page') {
  return `<div class="editorial-news editorial-news-${esc(context)}" data-cms-collection="news">${items.map((item, index) => {
    const classes = automaticEditorialVariant(item);
    const noMedia = item.coverImage || item.image ? '' : ' is-no-media';
    const headingId = `news-${esc(item.slug)}-${index}`;
    return `<article class="editorial-card ${classes}${noMedia}" data-news-card data-cms-item="news"><a href="${esc(item.href)}" aria-labelledby="${headingId}">${editorialMedia(item, index)}<div class="editorial-copy"><div class="editorial-meta"><span data-cms-field="category">${esc(item.category)}</span><time datetime="${esc(item.publishedAt || '')}" data-cms-field="date">${esc(item.date || item.publishedAt)}</time></div><h3 id="${headingId}" data-cms-field="title">${esc(item.title)}</h3><p data-cms-field="excerpt">${esc(item.excerpt)}</p><span class="editorial-arrow" aria-hidden="true">→</span></div></a></article>`;
  }).join('')}</div>`;
}

export function gallery(items = []) {
  if (!items.length) return '<p class="legal-note">Фотоматериалы подключаются из утверждённого медиакаталога.</p>';
  return `<div class="gallery-grid">${items.map((item) => `<figure class="gallery-item${item.compact ? ' gallery-item-small' : ''}">${image(item.image, item.alt, { sizes: item.compact ? '(max-width: 860px) 100vw, 35vw' : '(max-width: 860px) 100vw, 65vw' })}<figcaption>${esc(item.caption)}</figcaption></figure>`).join('')}</div>`;
}

function programVisual(program, sizes) {
  if (!program.image) return '<div class="program-media-empty" aria-hidden="true"><span>БРХК</span></div>';
  return image(program.image, program.imageAlt, { cmsField: 'image', sizes });
}

export function programCard(program) {
  return `<a class="program-card" href="${esc(program.href)}" data-cms-item="program">${programVisual(program, '(max-width: 860px) 100vw, 50vw')}<div class="program-body"><div class="program-meta"><span>${esc(program.code)}</span><span>${esc(program.type)}</span></div><h3 data-cms-field="title">${esc(program.title)}</h3><p data-cms-field="excerpt">${esc(program.description)}</p></div></a>`;
}

export function educationProgram(program) {
  return `<a class="education-program" href="${esc(program.href)}" data-cms-item="program"><div class="education-program-media">${programVisual(program, '(max-width: 860px) 100vw, 50vw')}</div><div class="education-program-copy"><div class="program-meta"><span>${esc(program.code)}</span><span>${esc(program.type)}</span></div><h3 data-cms-field="title">${esc(program.title)}</h3><p data-cms-field="excerpt">${esc(program.description)}</p><strong>Открыть программу →</strong></div></a>`;
}
