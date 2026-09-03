import {
  breadcrumbs,
  cardGrid,
  disclosureDirectory,
  editorialNews,
  educationProgram,
  esc,
  gallery,
  image,
  lines,
  mediaById,
  navigationDirectory,
  pageHero,
  programCard,
  sectionHead,
  sideNavigation
} from './components.mjs';
import { renderRichText } from './rich-text.mjs';
import { localHref, message } from '../i18n/render-context.mjs';

function primaryProgramCards(programs) {
  return `<div class="program-grid">${programs.filter((program) => program.primary).map(programCard).join('')}</div>`;
}

function additionalPrograms(programs) {
  return `<div class="additional-programs"><div class="additional-programs-label">${esc(message('additionalPrograms'))}</div>${programs.filter((program) => !program.primary).map((program) => `<a class="additional-program" href="${esc(localHref(program.href))}" data-cms-item="program"><div><span>${esc(program.code)}</span><h3 data-cms-field="title">${esc(program.title)}</h3></div><p data-cms-field="excerpt">${esc(program.description)}</p><strong aria-hidden="true">↗</strong></a>`).join('')}</div>`;
}

function newestFirst(items) {
  return [...items].sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
}

function socialImage(mediaId) {
  return mediaById(mediaId, { optional: true })?.src;
}

function heroHeading(value) {
  const [first, ...rest] = String(value || '').split('\n');
  return rest.length ? `${esc(first)}<br><em>${esc(rest.join(' '))}</em>` : esc(first);
}

function actionLinks(actions = []) {
  return actions.map((action) => {
    const style = action.style === 'outline' ? 'button-outline' : action.style === 'dark' ? 'button-dark' : 'button-light';
    return `<a class="button ${style}" href="${esc(localHref(action.href))}">${esc(action.label)}</a>`;
  }).join('');
}

function stats(items = []) {
  return `<div class="stats">${items.map((item) => `<div class="stat"><b>${esc(item.value)}</b><span>${esc(item.label)}</span></div>`).join('')}</div>`;
}

function admissionSteps(items = []) {
  return `<div class="card-grid">${items.map((item, index) => `<article class="card card-dark"><span class="card-kicker">${String(index + 1).padStart(2, '0')}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><a href="${esc(localHref(item.href))}">${esc(item.linkLabel)}</a></article>`).join('')}</div>`;
}

export function renderHome({ site, programs, newsItems }) {
  const home = site.home;
  const latestNews = newestFirst(newsItems).slice(0, 5);
  return {
    route: '/',
    title: site.name,
    description: site.description,
    image: socialImage(home.hero.image),
    content: `<main id="main">
      <section class="hero"><div class="hero-media">${image(home.hero.image, home.hero.imageAlt ?? '', { eager: true, sizes: '100vw', mobileSizes: '100vw' })}</div><div class="wrap hero-inner"><div><div class="eyebrow">${esc(home.hero.eyebrow)}</div><h1>${heroHeading(home.hero.title)}</h1></div><div class="hero-aside"><p>${esc(home.hero.description)}</p><div class="button-row">${actionLinks(home.hero.actions)}</div></div></div></section>
      <div class="ticker" aria-hidden="true"><div class="ticker-track">${home.ticker.map((item) => `<span>${esc(item)}</span>`).join('')}</div></div>

      <section class="section section-paper"><div class="wrap">${sectionHead(home.about.index, home.about.label, home.about.title, home.about.lead)}<div class="manifest"><article class="manifest-quote"><div class="eyebrow">${esc(home.about.manifestLabel)}</div><p>${esc(home.about.manifest)}</p><small>${esc(home.about.manifestNote)}</small></article><figure class="photo-card">${image(home.about.image, home.about.imageAlt, { sizes: '(max-width: 860px) 100vw, 50vw' })}<figcaption class="photo-overlay"><span>${esc(home.about.imageLabel)}</span><strong>${esc(home.about.imageCaption)}</strong></figcaption></figure></div>${stats(home.about.stats)}</div></section>

      <section class="section"><div class="wrap">${sectionHead(home.education.index, home.education.label, home.education.title, home.education.lead)}${primaryProgramCards(programs)}${additionalPrograms(programs)}</div></section>

      <section class="section section-paper news-section"><div class="wrap">${sectionHead(home.news.index, home.news.label, home.news.title, home.news.lead)}${editorialNews(latestNews, 'home')}<div class="section-action"><a class="button button-dark" href="${esc(localHref('/news/'))}">${esc(message('allNews'))}</a></div></div></section>

      <section class="section section-dark"><div class="wrap">${sectionHead(home.admission.index, home.admission.label, home.admission.title, home.admission.lead)}${admissionSteps(home.admission.steps)}</div></section>

      <section class="section section-paper"><div class="wrap">${sectionHead(home.gallery.index, home.gallery.label, home.gallery.title)}${gallery(site.gallery)}</div></section>
    </main>`
  };
}

export function renderEducation({ site, programs, page }) {
  const primary = programs.filter((program) => program.primary);
  const additional = programs.filter((program) => !program.primary);
  return {
    route: '/education/',
    title: page.title,
    description: page.description,
    image: socialImage(page.image),
    content: `<main id="main">${pageHero(page.kicker, page.title, page.description, page.image)}${breadcrumbs([{ href: '/', title: message('home') }, { title: page.title }])}<section class="page-section"><div class="wrap"><div class="education-intro"><span>${esc(message('educationEcosystem'))}</span><p>${esc(message('educationIntro'))}</p></div><div class="education-group"><div class="education-group-head"><span>01</span><div><h2>${esc(message('mainVocationalPrograms'))}</h2><p>${esc(message('mainVocationalLead'))}</p></div></div><div class="education-program-list">${primary.map(educationProgram).join('')}</div></div><div class="education-group"><div class="education-group-head"><span>02</span><div><h2>${esc(message('additionalPrograms'))}</h2><p>${esc(message('additionalProgramsLead'))}</p></div></div><div class="education-program-list education-program-list-additional">${additional.map(educationProgram).join('')}</div></div></div></section></main>`
  };
}

export function renderNews({ site, newsItems, page }) {
  const latestNews = newestFirst(newsItems);
  return {
    route: '/news/',
    title: page.title,
    description: page.description,
    image: socialImage(page.image),
    content: `<main id="main">${pageHero(page.kicker, page.title, page.description, page.image)}${breadcrumbs([{ href: '/', title: message('home') }, { title: page.title }])}<section class="page-section editorial-page"><div class="wrap editorial-layout"><aside class="editorial-sidebar"><strong>${esc(message('collegeAbbreviation'))}</strong><a aria-current="page" href="${esc(localHref('/news/'))}">${esc(message('news'))}</a><a href="${esc(localHref('/events/'))}">${esc(message('events'))}</a><a href="${esc(localHref('/gallery/'))}">${esc(message('gallery'))}</a></aside><div><div class="editorial-page-head"><h2>${esc(message('latestPublications'))}</h2><p>${esc(message('latestPublicationsLead'))}</p></div>${editorialNews(latestNews, 'archive')}</div></div></section></main>`
  };
}

function articleVisual(item) {
  const mediaId = item.image || item.coverImage;
  if (!mediaId) return '';
  const caption = item.coverCaption ? `<figcaption>${esc(item.coverCaption)}</figcaption>` : '';
  return `<figure class="article-visual">${image(mediaId, item.alt ?? item.coverAlt, { cmsField: 'image', eager: true, sizes: '100vw' })}${caption}</figure>`;
}

function articleAttachments(items = []) {
  const attachments = Array.isArray(items) ? items : [];
  if (!attachments.length) return '';
  return `<section class="article-attachments"><h2>${esc(message('materials'))}</h2><ul>${attachments.map((item) => `<li><a href="${esc(localHref(item.href))}">${esc(item.title)}</a></li>`).join('')}</ul></section>`;
}

function articleGallery(items = []) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<section class="wrap article-gallery" data-cms-field="gallery"><h2>${esc(message('gallery'))}</h2>${gallery(items)}</section>`;
}

export function renderNewsArticle(item, site) {
  const published = item.publishedAt || '';
  const sourceBlock = item.source
    ? `<p class="legal-note"><strong>${esc(message('source'))}</strong> ${esc(message('sourceContext'))} <a href="${esc(item.source)}" rel="external">${esc(item.sourceLabel || message('archiveSource'))} ↗</a></p>`
    : `<p class="legal-note"><strong>${esc(message('pendingReviewTitle'))}</strong> ${esc(message('pendingReviewBody'))}</p>`;
  const body = renderRichText(item.body) || `<p class="article-lead">${esc(item.excerpt)}</p><h2>${esc(message('fullPublication'))}</h2><p>${esc(message('fullPublicationPending'))}</p>`;
  const mediaId = item.image || item.coverImage;
  return {
    route: item.href,
    title: item.seoTitle || item.title,
    description: item.seoDescription || item.excerpt,
    type: 'article',
    image: socialImage(mediaId),
    content: `<main id="main"><article class="article" data-cms-item="news"><header class="article-head"><div class="wrap article-head-grid"><div><div class="eyebrow">${esc(item.category)} · <time datetime="${esc(published)}">${esc(item.date || published)}</time></div><h1 data-cms-field="title">${esc(item.title)}</h1><p data-cms-field="excerpt">${esc(item.excerpt)}</p></div><span class="article-number">${esc(message('collegeAbbreviation'))} / ${esc(message('articleNewsCode'))}</span></div></header>${articleVisual(item)}${breadcrumbs([{ href: '/', title: message('home') }, { href: '/news/', title: message('news') }, { title: item.title }])}<div class="wrap article-layout"><div class="article-body" data-cms-field="body">${sourceBlock}${body}${articleAttachments(item.attachments)}</div>${sideNavigation(site.sideNavigation)}</div>${articleGallery(item.gallery)}</article></main>`
  };
}

export function renderEventArticle(item, site) {
  const dateLabel = item.date || item.startsAt || '';
  const body = renderRichText(item.body)
    || `<p class="article-lead">${esc(item.description || '')}</p><p class="legal-note">${esc(message('schedulePending'))}</p>`;
  const mediaId = item.image || item.coverImage;
  return {
    route: item.href,
    title: item.seoTitle || item.title,
    description: item.seoDescription || item.description || item.title,
    type: 'article',
    image: socialImage(mediaId),
    content: `<main id="main"><article class="article" data-cms-item="event"><header class="article-head"><div class="wrap article-head-grid"><div><div class="eyebrow">${esc(item.category || message('events'))}${dateLabel ? ` · <time datetime="${esc(item.startsAt || item.publishedAt || '')}">${esc(dateLabel)}</time>` : ''}</div><h1 data-cms-field="title">${esc(item.title)}</h1>${item.description ? `<p data-cms-field="excerpt">${esc(item.description)}</p>` : ''}</div><span class="article-number">${esc(message('collegeAbbreviation'))} / ${esc(message('articleEventCode'))}</span></div></header>${articleVisual(item)}${breadcrumbs([{ href: '/', title: message('home') }, { href: '/events/', title: message('events') }, { title: item.title }])}<div class="wrap article-layout"><div class="article-body" data-cms-field="body">${body}${articleAttachments(item.attachments)}</div>${sideNavigation(site.sideNavigation)}</div></article></main>`
  };
}

function documentList(page, documents = []) {
  const published = documents.filter((document) => document.href);
  if (published.length) {
    return `<div class="document-list">${published.map((document) => `<a class="document-item" href="${esc(localHref(document.href))}"><span class="document-icon" aria-hidden="true">${esc(document.fileType || 'PDF')}</span><div><strong>${esc(document.title)}</strong>${document.updatedAt ? `<br><small>${esc(message('updated'))} ${esc(document.updatedAt)}</small>` : ''}</div><span>${esc(message('download'))}</span></a>`).join('')}</div>`;
  }
  const expected = Array.isArray(page.documents) ? page.documents : [];
  return `<div class="document-list">${expected.map((title) => `<div class="document-item"><span class="document-icon" aria-hidden="true">PDF</span><div><strong>${esc(title)}</strong><br><small>${esc(message('fileMetadataPending'))}</small></div><span class="document-pending">${esc(message('awaitingFile'))}</span></div>`).join('')}</div><div class="legal-note">${esc(message('unpublishedDocuments'))}</div>`;
}

function eventList(events = []) {
  if (!events.length) return '';
  return `<div class="card-grid" data-cms-collection="events">${newestFirst(events).map((event, index) => `<article class="card" data-cms-item="event"><span class="card-kicker">${esc(event.category || message('events'))} · ${String(index + 1).padStart(2, '0')}</span><h3>${esc(event.title)}</h3>${event.description ? `<p>${esc(event.description)}</p>` : ''}<a href="${esc(localHref(event.href))}">${esc(message('more'))}</a></article>`).join('')}</div>`;
}

function employeeList(employees = []) {
  if (!employees.length) return '';
  return `<div class="card-grid" data-cms-collection="employees">${employees.map((employee, index) => `<article class="card" data-cms-item="employee"><span class="card-kicker">${String(index + 1).padStart(2, '0')}</span>${employee.image || employee.photo ? image(employee.image || employee.photo, employee.alt || employee.name || '', { sizes: '(max-width: 860px) 100vw, 33vw' }) : ''}<h3>${esc(employee.name || employee.title)}</h3>${employee.role || employee.position ? `<p>${esc(employee.role || employee.position)}</p>` : ''}${employee.department ? `<small>${esc(employee.department)}</small>` : ''}</article>`).join('')}</div>`;
}

function svedenContent(section) {
  if (!section) return '';
  const richText = renderRichText(section.body || section.content);
  const sections = Array.isArray(section.sections) && section.sections.length ? cardGrid(section.sections) : '';
  const documents = Array.isArray(section.documents) && section.documents.length
    ? documentList({ documents: [] }, section.documents)
    : '';
  return `${richText}${sections}${documents}`;
}

function structureOnlyNotice(page) {
  if (!page.structureOnly) return '';
  return `<div class="legal-note"><strong>${esc(message('approvedMaterialsMissingTitle'))}</strong> ${esc(message('approvedMaterialsMissingBody'))}</div>`;
}

function svedenIndex(svedenSections, institutionalNavigation = []) {
  const mandatory = svedenSections.filter((section) => section.group === 'mandatory');
  const legacy = svedenSections.filter((section) => section.group === 'legacy');
  const cards = (items) => `<div class="sveden-grid">${items.map((section) => `<a href="${esc(localHref(section.href))}">${esc(section.title || section.label)}</a>`).join('')}</div>`;
  return `<section class="disclosure-group" aria-labelledby="mandatory-disclosure-title"><div class="disclosure-group-head"><span>01</span><div><h2 id="mandatory-disclosure-title">${esc(message('mandatorySubsections'))}</h2><p>${esc(message('mandatoryDescription'))}</p></div></div>${cards(mandatory)}</section><section class="disclosure-group" aria-labelledby="supplemental-disclosure-title"><div class="disclosure-group-head"><span>02</span><div><h2 id="supplemental-disclosure-title">${esc(message('servicesTransparency'))}</h2><p>${esc(message('servicesDescription'))}</p></div></div>${cards([...institutionalNavigation, ...legacy])}</section><div class="legal-note"><strong>${esc(message('legalBasisTitle'))}</strong> ${esc(message('legalBasisText'))} <a href="https://publication.pravo.gov.ru/document/0001202311290017" rel="external">${esc(message('order1493'))}</a> · <a href="https://publication.pravo.gov.ru/document/0001202510140008" rel="external">${esc(message('amendments1353'))}</a> · <a href="https://minjust.consultant.ru/documents/60145" rel="external">${esc(message('amendments920'))}</a>. ${esc(message('disclosureCaveat'))}</div>`;
}

export function renderGeneric({ route, page, site, svedenSections, documents = [], events = [], employees = [] }) {
  const svedenSection = svedenSections.find((section) => section.href === route);
  const verifiedSvedenContent = svedenContent(svedenSection);
  let body;
  if (route === '/events/' && events.length) body = eventList(events);
  else if (route === '/sveden/employees/' && employees.length) body = employeeList(employees);
  else if (verifiedSvedenContent) body = verifiedSvedenContent;
  else if (page.siteMap) body = navigationDirectory(site.navigation, route);
  else if (page.gallery) body = gallery(site.gallery);
  else if (page.documents) body = documentList(page, documents);
  else if (page.sveden) body = svedenIndex(svedenSections, site.institutionalNavigation);
  else body = `<section class="prose"><h2>${esc(page.title)}</h2><p>${esc(page.description)}</p></section>${structureOnlyNotice(page)}${cardGrid(page.sections)}`;

  const isDisclosureRoute = route.startsWith('/sveden/')
    || site.institutionalNavigation?.some((item) => item.href === route);
  const crumbItems = isDisclosureRoute && route !== '/sveden/'
    ? [{ href: '/', title: message('home') }, { href: '/sveden/', title: message('organizationInformation') }, { title: page.title }]
    : [{ href: '/', title: message('home') }, { title: page.title }];
  const directory = isDisclosureRoute
    ? disclosureDirectory(svedenSections, site.institutionalNavigation, route)
    : sideNavigation(site.sideNavigation, { route });

  return {
    route,
    title: page.seoTitle || page.title,
    description: page.description,
    image: socialImage(page.image),
    content: `<main id="main">${pageHero(page.kicker, page.title, page.description, page.image)}${breadcrumbs(crumbItems)}<section class="page-section"><div class="wrap page-layout"><div>${body}</div>${directory}</div></section></main>`
  };
}

export function renderNotFound(site) {
  const mediaId = site?.notFoundImage || 'stage';
  return {
    route: '/404.html',
    title: message('pageNotFound'),
    description: message('pageNotFoundDescription'),
    image: socialImage(mediaId),
    noindex: true,
    content: `<main id="main">${pageHero(message('error404'), message('pageNotFound'), message('pageNotFoundHelp'), mediaId)}${breadcrumbs([{ href: '/', title: message('home') }, { title: message('pageNotFound') }])}<section class="page-section"><div class="wrap"><p><a class="button button-dark" href="${esc(localHref('/'))}">${esc(message('returnHome'))}</a></p></div></section></main>`
  };
}
