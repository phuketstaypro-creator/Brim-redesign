import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadLocalContent } from '../src/content/adapters/local.mjs';
import { LOCALIZED_CONTENT_FORMAT, ContentContractError } from '../src/content/contracts.mjs';
import { loadContent, loadContentSet } from '../src/content/load-content.mjs';
import { REQUIRED_ROUTES, SVEDEN_REQUIRED_ROUTES } from '../src/content/required-routes.mjs';
import { assertIndexableMediaRights } from '../src/content/rights.mjs';
import { collectPublicRoutes } from '../src/content/validate.mjs';
import { renderRichText } from '../src/templates/rich-text.mjs';

const projectRoot = resolve(import.meta.dirname, '..');

test('local adapter returns a validated CMS-neutral bundle', async () => {
  const content = await loadContent({ env: { CONTENT_ADAPTER: 'local' }, cwd: projectRoot });
  const routes = new Set(collectPublicRoutes(content));

  assert.equal(content.schemaVersion, '1.0.0');
  assert.equal(content.svedenSections.filter((section) => section.group === 'mandatory').length, 14);
  assert.ok(content.svedenSections.length >= SVEDEN_REQUIRED_ROUTES.length);
  assert.ok(content.media.length >= 10);
  assert.deepEqual(content.site.home.about.stats[2], {
    value: '3',
    label: 'образования одновременно',
    details: ['Школа', 'Музыка', 'Балет']
  });
  assert.deepEqual(
    {
      src: content.site.assets.logo.src,
      width: content.site.assets.logo.width,
      height: content.site.assets.logo.height
    },
    { src: '/assets/images/brhk-logo-full.png', width: 1705, height: 677 }
  );
  for (const route of ['/creative-industries/', '/ballet-for-all/']) {
    assert.equal(content.programs.find((program) => program.href === route)?.primary, false, route);
  }
  for (const route of REQUIRED_ROUTES) assert.ok(routes.has(route), route);
});

test('approved logo and additional education placement are immutable CMS boundaries', async () => {
  const mutations = [
    (raw) => { raw.site.assets.logo.src = '/assets/images/another-logo.png'; },
    (raw) => { raw.site.assets.logo.width = 1704; },
    (raw) => { raw.programs.find((item) => item.href === '/creative-industries/').primary = true; },
    (raw) => { raw.programs = raw.programs.filter((item) => item.href !== '/ballet-for-all/'); }
  ];

  for (const mutate of mutations) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      ContentContractError
    );
  }
});

test('home statistic details must be a non-empty list of labels', async () => {
  const mutations = [
    (raw) => { raw.site.home.about.stats[2].details = 'Школа, Музыка, Балет'; },
    (raw) => { raw.site.home.about.stats[2].details = []; },
    (raw) => { raw.site.home.about.stats[2].details = ['Школа', '', 'Балет']; }
  ];

  for (const mutate of mutations) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      (error) => error instanceof ContentContractError
        && error.message.includes('site.home.about.stats[2].details')
    );
  }
});

test('hierarchical navigation is validated recursively', async () => {
  const valid = structuredClone(await loadLocalContent());
  valid.site.navigation = [{
    label: 'Group',
    children: [{ href: '/about/', label: 'About', group: 'Section' }]
  }];
  await assert.doesNotReject(loadContent({ cwd: projectRoot, adapter: async () => valid }));

  const mutations = [
    (raw) => { raw.site.navigation = [{ label: 'Empty group', children: [] }]; },
    (raw) => { raw.site.navigation[0].children[0].href = 'javascript:alert(1)'; },
    (raw) => { raw.site.navigation[0].children[0].href = '/missing-navigation-target/'; },
    (raw) => { raw.site.navigation[0].children[0].children = [{ href: '/about/', label: 'Too deep' }]; }
  ];
  for (const mutate of mutations) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      ContentContractError
    );
  }
});

test('global useful and social links require safe CMS values', async () => {
  const valid = await loadContent({ env: { CONTENT_ADAPTER: 'local' }, cwd: projectRoot });
  assert.equal(valid.site.usefulLinks.length, 5);
  assert.equal(valid.site.socialLinks.length, 2);

  const compatible = structuredClone(await loadLocalContent());
  delete compatible.site.usefulLinks;
  delete compatible.site.socialLinks;
  const normalized = await loadContent({ cwd: projectRoot, adapter: async () => compatible });
  assert.deepEqual(normalized.site.usefulLinks, []);
  assert.deepEqual(normalized.site.socialLinks, []);

  const mutations = [
    (raw) => { raw.site.usefulLinks[0].href = 'http://example.org/insecure'; },
    (raw) => { raw.site.usefulLinks[0].href = '/about/'; },
    (raw) => { raw.site.socialLinks[0].href = 'javascript:alert(1)'; },
    (raw) => { raw.site.socialLinks[0].href = 'mailto:social@example.org'; },
    (raw) => { raw.site.socialLinks[0].label = ''; }
  ];

  for (const mutate of mutations) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      ContentContractError
    );
  }
});

test('mandatory disclosure classification cannot be downgraded', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.svedenSections.find((section) => section.href === '/sveden/common/').group = 'legacy';
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError && error.message.includes('must use group mandatory')
  );
});

test('legacy disclosure compatibility and the exact mandatory set are immutable', async () => {
  const mutations = [
    (raw) => { raw.svedenSections = raw.svedenSections.filter((section) => section.href !== '/sveden/ovz/'); },
    (raw) => { raw.svedenSections.find((section) => section.href === '/sveden/ovz/').group = 'mandatory'; },
    (raw) => {
      raw.svedenSections.push({
        slug: 'extra-mandatory',
        href: '/about/',
        title: 'Not a statutory subsection',
        group: 'mandatory'
      });
    }
  ];

  for (const mutate of mutations) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      ContentContractError
    );
  }
});

test('special route renderer flags cannot be removed or disabled by a CMS export', async () => {
  const mutations = [
    (raw) => { delete raw.pages['/sveden/'].sveden; },
    (raw) => { raw.pages['/gallery/'].gallery = false; },
    (raw) => { raw.pages['/sitemap/'].siteMap = 'true'; }
  ];

  for (const mutate of mutations) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      (error) => error instanceof ContentContractError
        && error.message.includes('must be true for the required renderer')
    );
  }
});

test('published CMS collections may add routes without changing build code', async () => {
  const raw = structuredClone(await loadLocalContent());
  const template = raw.newsItems[0];
  raw.newsItems = Array.from({ length: 20 }, (_, index) => ({
    ...template,
    id: `cms-news-${index}`,
    slug: `cms-news-${index}`,
    href: `/news/cms-news-${index}/`,
    title: `CMS publication ${index}`,
    publishedAt: `2026-07-${String((index % 20) + 1).padStart(2, '0')}`,
    date: `${index + 1} июля 2026`,
    featured: false
  }));
  raw.newsItems.push({ ...raw.newsItems[0], id: 'draft', slug: 'draft', href: '/news/draft/', draft: true });

  const content = await loadContent({ cwd: projectRoot, adapter: async () => raw });
  const routes = collectPublicRoutes(content);
  assert.equal(content.newsItems.length, 20);
  assert.ok(routes.includes('/news/cms-news-19/'));
  assert.ok(!routes.includes('/news/draft/'));
});

test('unknown media, duplicate slugs and unsafe routes fail the contract', async () => {
  const cases = [
    (raw) => { raw.newsItems[0].coverImage = 'missing-media'; raw.newsItems[0].image = 'missing-media'; },
    (raw) => { raw.newsItems[0].gallery = [{ image: 'missing-media', alt: 'Missing' }]; },
    (raw) => { raw.newsItems[1].slug = raw.newsItems[0].slug; },
    (raw) => { raw.newsItems[0].href = '/../escape/'; },
    (raw) => { raw.newsItems[0].href = '/en/reserved-locale-prefix/'; },
    (raw) => { raw.newsItems[0].href = '/zh/reserved-locale-prefix/'; }
  ];

  for (const mutate of cases) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      ContentContractError
    );
  }
});

test('incomplete site data and events without routes fail at the content boundary', async () => {
  const incompleteSite = structuredClone(await loadLocalContent());
  incompleteSite.site = {
    name: incompleteSite.site.name,
    title: incompleteSite.site.title,
    baseUrl: incompleteSite.site.baseUrl
  };
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => incompleteSite }),
    (error) => error instanceof ContentContractError && error.message.includes('site.home')
  );

  const eventWithoutRoute = structuredClone(await loadLocalContent());
  eventWithoutRoute.events = [{ id: 'cms-event', title: 'CMS event', status: 'live' }];
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => eventWithoutRoute }),
    (error) => error instanceof ContentContractError && error.message.includes('events[0].href')
  );

  const eventWithInvalidBody = structuredClone(await loadLocalContent());
  eventWithInvalidBody.events = [{ id: 'cms-event', title: 'CMS event', href: '/events/cms-event/', body: { html: '<b>unsafe</b>' } }];
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => eventWithInvalidBody }),
    (error) => error instanceof ContentContractError && error.message.includes('events[0].body')
  );
});

test('live CMS documents remain available after normalization', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.documents = [{
    id: 'cms-document',
    title: 'CMS document',
    href: '/assets/documents/cms-document.pdf',
    fileType: 'PDF',
    status: 'live'
  }];
  const content = await loadContent({ cwd: projectRoot, adapter: async () => raw });
  assert.equal(content.documents.length, 1);
  assert.equal(content.documents[0].href, '/assets/documents/cms-document.pdf');
});

test('unsafe CMS attachment, sveden document and source URLs are rejected', async () => {
  const cases = [
    (raw) => { raw.newsItems[0].attachments = [{ title: 'Unsafe', href: 'javascript:alert(1)' }]; },
    (raw) => { raw.newsItems[0].attachments = [{ title: 'Not a file', href: 'tel:+73012212313' }]; },
    (raw) => { raw.newsItems[0].contentStatus = null; raw.newsItems[0].source = 'javascript:alert(1)'; },
    (raw) => { raw.svedenSections[0].documents = [{ title: 'Unsafe', href: 'data:text/html,unsafe' }]; },
    (raw) => { raw.documents = [{ id: 'not-a-document', title: 'Not a document', href: 'mailto:docs@example.org' }]; }
  ];

  for (const mutate of cases) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      ContentContractError
    );
  }
});

test('events and documents require the title field consumed by their renderers', async () => {
  const cases = [
    (raw) => { raw.events = [{ id: 'name-only-event', name: 'Name only', href: '/events/name-only/' }]; },
    (raw) => { raw.documents = [{ id: 'name-only-document', name: 'Name only', href: 'https://example.org/document.pdf' }]; }
  ];

  for (const mutate of cases) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      (error) => error instanceof ContentContractError && error.message.includes('.title')
    );
  }
});

test('published document links require an explicit file type', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.documents = [{ id: 'unknown-type', title: 'Document', href: 'https://example.org/document' }];
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError
      && error.message.includes('documents[0].fileType')
  );
});

test('malformed page sections fail before template rendering', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.pages['/about/'].sections = null;
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError && error.message.includes('/about/')
  );
});

test('draft nested attachments and sveden documents are filtered', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.newsItems[0].attachments = [
    { id: 'public-attachment', title: 'Public attachment', href: 'https://example.org/public.pdf', status: 'live' },
    { id: 'draft-attachment', title: 'Draft attachment', href: 'https://example.org/draft.pdf', status: 'draft' }
  ];
  raw.svedenSections[0].documents = [
    { id: 'public-document', title: 'Public document', href: 'https://example.org/public.pdf', fileType: 'PDF', status: 'published' },
    { id: 'draft-document', title: 'Draft document', href: 'https://example.org/draft.pdf', draft: true }
  ];

  const content = await loadContent({ cwd: projectRoot, adapter: async () => raw });
  assert.deepEqual(content.newsItems.find((item) => item.id === raw.newsItems[0].id).attachments.map((item) => item.id), ['public-attachment']);
  assert.deepEqual(content.svedenSections[0].documents.map((item) => item.id), ['public-document']);
});

test('indexing is blocked until every media right is resolved', async () => {
  const content = await loadContent({ env: { CONTENT_ADAPTER: 'local' }, cwd: projectRoot });
  assert.doesNotThrow(() => assertIndexableMediaRights(content.media, { allowIndexing: false }));
  assert.throws(
    () => assertIndexableMediaRights(content.media, { allowIndexing: true }),
    /requires resolved media rights/
  );
  assert.doesNotThrow(() => assertIndexableMediaRights([
    { id: 'owned', rightsStatus: 'owned' },
    { id: 'licensed', rightsStatus: 'licensed' },
    { id: 'public', rightsStatus: 'public-domain' }
  ], { allowIndexing: true }));
});

test('site base URL must be a bare origin', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.site.baseUrl = 'https://example.org/cms-preview/?token=unsafe#fragment';
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError && error.message.includes('without a path, query or fragment')
  );
});

test('program hierarchy fields are explicit and type-safe', async () => {
  const cases = [
    (raw) => { raw.programs[0].primary = 'false'; },
    (raw) => { raw.programs[0].image = null; },
    (raw) => { raw.programs[0].imageAlt = ''; }
  ];
  for (const mutate of cases) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      ContentContractError
    );
  }
});

test('rich text is escaped and unsafe links are omitted', () => {
  const html = renderRichText([
    { type: 'heading', level: 2, text: '<script>alert(1)</script>' },
    { type: 'paragraph', text: '<img src=x onerror=alert(1)>' },
    { type: 'link', href: 'javascript:alert(1)', label: 'bad' },
    { type: 'link', href: '/\\evil.example/path', label: 'backslash' },
    { type: 'link', href: '/\tevil.example/path', label: 'control' },
    { type: 'link', href: '/%2f%2fevil.example/path', label: 'encoded slash' },
    { type: 'link', href: '/%255c%255cevil.example/path', label: 'double encoded backslash' },
    { type: 'link', href: '/documents/', label: 'Документы' },
    { type: 'link', href: 'https://example.org/archive/a%2Fb', label: 'External HTTPS' }
  ]);

  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('evil.example'));
  assert.match(html, /href="\/documents\/"/);
  assert.match(html, /href="https:\/\/example\.org\/archive\/a%2Fb"/);
});

test('unsafe rich-text hrefs are rejected at the CMS content boundary', async () => {
  const unsafeHrefs = [
    '//evil.example/path',
    '/\\evil.example/path',
    '/\nevil.example/path',
    '/%2F%2Fevil.example/path',
    '/%5Cevil.example/path',
    '/%252f%252fevil.example/path'
  ];

  for (const href of unsafeHrefs) {
    const raw = structuredClone(await loadLocalContent());
    raw.newsItems[0].body = [{ type: 'link', href, label: 'Unsafe' }];
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      (error) => error instanceof ContentContractError
        && error.message.includes('newsItems[0].body[0].href')
    );
  }

  const event = structuredClone(await loadLocalContent());
  event.events = [{
    id: 'unsafe-rich-text-event',
    slug: 'unsafe-rich-text-event',
    title: 'Unsafe rich text event',
    href: '/events/unsafe-rich-text-event/',
    body: [{ type: 'link', href: '/\\evil.example/path', label: 'Unsafe' }]
  }];
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => event }),
    (error) => error instanceof ContentContractError
      && error.message.includes('events[0].body[0].href')
  );

  const sveden = structuredClone(await loadLocalContent());
  sveden.svedenSections[0].body = [{ type: 'link', href: '/%2f%2fevil.example/path', label: 'Unsafe' }];
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => sveden }),
    (error) => error instanceof ContentContractError
      && error.message.includes('svedenSections[0].body[0].href')
  );
});

test('bundle-per-locale exports preserve the plain bundle API and expose reviewed locale data', async () => {
  const ru = structuredClone(await loadLocalContent());
  ru.schemaVersion = '1.0.0';
  const en = structuredClone(ru);
  en.site.locale = 'en';
  en.site.title = 'Reviewed CMS title that is not present in an exact-string catalog';
  en.programs.reverse();
  en.media.reverse();

  const plainSet = await loadContentSet({ cwd: projectRoot, adapter: async () => ru });
  assert.equal(plainSet.localized, false);
  assert.deepEqual(Object.keys(plainSet.locales), ['ru']);
  assert.equal((await loadContent({ cwd: projectRoot, adapter: async () => ru })).site.locale, 'ru');

  const envelope = {
    format: LOCALIZED_CONTENT_FORMAT,
    defaultLocale: 'ru',
    locales: { en, ru }
  };
  const localizedSet = await loadContentSet({ cwd: projectRoot, adapter: async () => envelope });
  assert.equal(localizedSet.localized, true);
  assert.deepEqual(Object.keys(localizedSet.locales), ['ru', 'en']);
  assert.equal(localizedSet.locales.en.site.title, en.site.title);
  assert.equal((await loadContent({ cwd: projectRoot, adapter: async () => envelope })).site.locale, 'ru');
});

test('bundle-per-locale exports enforce locale, route, identity and media parity', async () => {
  async function rejectedByParity(mutate, message) {
    const ru = structuredClone(await loadLocalContent());
    ru.schemaVersion = '1.0.0';
    const en = structuredClone(ru);
    en.site.locale = 'en';
    mutate(en);
    const envelope = {
      format: LOCALIZED_CONTENT_FORMAT,
      defaultLocale: 'ru',
      locales: { ru, en }
    };
    await assert.rejects(
      loadContentSet({ cwd: projectRoot, adapter: async () => envelope }),
      (error) => error instanceof ContentContractError && error.message.includes(message)
    );
  }

  await rejectedByParity((en) => { en.site.locale = 'ru'; }, 'site.locale must equal en');
  await rejectedByParity((en) => { en.newsItems[0].href = '/news/locale-only-route/'; }, 'public routes parity mismatch');
  await rejectedByParity((en) => { en.newsItems[0].id = 'locale-only-id'; }, 'newsItems ids parity mismatch');
  await rejectedByParity((en) => { en.newsItems[0].image = en.newsItems[1].image; }, 'media reference graph');
  await rejectedByParity((en) => { en.media[0].width += 1; }, 'technical metadata');
  await rejectedByParity((en) => { en.site.contacts.email = 'other@example.org'; }, 'site.contacts technical fields');
  await rejectedByParity((en) => { en.media[0].rightsStatus = 'owned'; }, 'technical metadata');
  await rejectedByParity((en) => { en.site.navigation[0].children[0].href = '/contacts/'; }, 'site href graph');
  await rejectedByParity((en) => { en.pages['/about/'].structureOnly = true; }, 'pages renderer flags');

  const linkedRu = structuredClone(await loadLocalContent());
  linkedRu.newsItems[0].attachments = [{ id: 'program', title: 'Программа', href: 'https://example.org/program.pdf' }];
  const linkedEn = structuredClone(linkedRu);
  linkedEn.site.locale = 'en';
  linkedEn.newsItems[0].attachments = [{ id: 'program', title: 'Programme', href: 'https://example.org/another.pdf' }];
  await assert.rejects(
    loadContentSet({
      cwd: projectRoot,
      adapter: async () => ({
        format: LOCALIZED_CONTENT_FORMAT,
        defaultLocale: 'ru',
        locales: { ru: linkedRu, en: linkedEn }
      })
    }),
    (error) => error instanceof ContentContractError && error.message.includes('linked document graph')
  );

  const ru = structuredClone(await loadLocalContent());
  ru.schemaVersion = '1.0.0';
  const en = structuredClone(ru);
  en.site.locale = 'en';
  delete en.schemaVersion;
  await assert.rejects(
    loadContentSet({
      cwd: projectRoot,
      adapter: async () => ({
        format: LOCALIZED_CONTENT_FORMAT,
        defaultLocale: 'ru',
        locales: { ru, en }
      })
    }),
    (error) => error instanceof ContentContractError
      && error.message.includes('locales.en is missing required field schemaVersion')
  );
});

test('plain ContentBundle is Russian; translated source data requires a locale envelope', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.site.locale = 'en';
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError
      && error.message.includes('site.locale must equal ru for a plain ContentBundle')
  );
});

test('sveden content compatibility field is validated before rendering', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.svedenSections[0].content = [{ type: 'unsupported-cms-block', value: 'hidden otherwise' }];
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError
      && error.message.includes('svedenSections[0].content[0].type is not supported')
  );
});

test('raw CMS collection shapes and workflow booleans fail before normalization can drop data', async () => {
  const mutations = [
    (raw) => { raw.events = { event: { id: 'lost-event' } }; },
    (raw) => { raw.documents = [null]; },
    (raw) => { raw.pages['/about/'] = null; },
    (raw) => { raw.media[0] = null; },
    (raw) => { raw.newsItems[0].attachments = [null]; },
    (raw) => { raw.newsItems[0].draft = 'true'; },
    (raw) => { raw.newsItems[0].published = 'false'; },
    (raw) => { raw.newsItems[0].status = ''; },
    (raw) => {
      raw.newsItems[0].status = 'published';
      raw.newsItems[0].publicationStatus = 'draft';
    }
  ];

  for (const mutate of mutations) {
    const raw = structuredClone(await loadLocalContent());
    mutate(raw);
    await assert.rejects(
      loadContent({ cwd: projectRoot, adapter: async () => raw }),
      (error) => error instanceof ContentContractError && error.message.includes('Raw content validation failed')
    );
  }
});

test('raw adapters cannot silently replace missing top-level collections with empty arrays', async () => {
  const raw = structuredClone(await loadLocalContent());
  delete raw.documents;

  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError
      && error.message.includes('missing required field documents')
  );
});

test('optional CMS scalars consumed by templates cannot render object coercions', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.pages['/about/'].kicker = {};
  raw.pages['/about/'].seoTitle = {};
  raw.newsItems[0].date = {};
  raw.newsItems[0].coverCaption = {};
  raw.newsItems[0].sourceLabel = {};
  raw.newsItems[0].gallery = [{ image: raw.media[0].id, alt: 'Malformed compact fixture', compact: 'true' }];
  raw.events = [{
    id: 'malformed-event-scalars',
    title: 'Malformed event scalar fixture',
    href: '/events/malformed-event-scalars/',
    coverImage: raw.media[0].id,
    description: {},
    category: {},
    date: {},
    seoTitle: {},
    coverCaption: {},
    alt: {}
  }];
  raw.employees = [{
    id: 'malformed-employee-scalars',
    name: 'Malformed employee scalar fixture',
    role: {},
    department: {},
    alt: {}
  }];

  const expectedIssues = [
    'pages["/about/"].kicker',
    'pages["/about/"].seoTitle',
    'newsItems[0].date',
    'newsItems[0].coverCaption',
    'newsItems[0].sourceLabel',
    'newsItems[0].gallery[0].compact',
    'events[0].description',
    'events[0].category',
    'events[0].date',
    'events[0].seoTitle',
    'events[0].coverCaption',
    'events[0].alt',
    'employees[0].role',
    'employees[0].department',
    'employees[0].alt'
  ];

  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError
      && expectedIssues.every((field) => error.message.includes(field))
  );

  const malformedSiteGallery = structuredClone(await loadLocalContent());
  malformedSiteGallery.site.gallery[0].compact = 'true';
  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => malformedSiteGallery }),
    (error) => error instanceof ContentContractError
      && error.message.includes('site.gallery[0].compact')
  );
});

test('unknown rich-text blocks fail instead of disappearing from CMS output', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.newsItems[0].body = [{ type: 'cmsWidget', payload: 'not supported' }];

  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError
      && error.message.includes('newsItems[0].body[0].type is not supported')
  );
});

test('every disclosure record must have a page route that the generator can render', async () => {
  const raw = structuredClone(await loadLocalContent());
  raw.svedenSections.push({
    slug: 'cms-only-section',
    href: '/sveden/cms-only-section/',
    title: 'CMS-only section',
    group: 'legacy'
  });

  await assert.rejects(
    loadContent({ cwd: projectRoot, adapter: async () => raw }),
    (error) => error instanceof ContentContractError
      && error.message.includes('must have a matching pages entry')
  );
});
