import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadLocalContent } from '../src/content/adapters/local.mjs';
import { ContentContractError } from '../src/content/contracts.mjs';
import { loadContent } from '../src/content/load-content.mjs';
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
  for (const route of REQUIRED_ROUTES) assert.ok(routes.has(route), route);
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
    status: 'live'
  }];
  const content = await loadContent({ cwd: projectRoot, adapter: async () => raw });
  assert.equal(content.documents.length, 1);
  assert.equal(content.documents[0].href, '/assets/documents/cms-document.pdf');
});

test('unsafe CMS attachment, sveden document and source URLs are rejected', async () => {
  const cases = [
    (raw) => { raw.newsItems[0].attachments = [{ title: 'Unsafe', href: 'javascript:alert(1)' }]; },
    (raw) => { raw.newsItems[0].contentStatus = null; raw.newsItems[0].source = 'javascript:alert(1)'; },
    (raw) => { raw.svedenSections[0].documents = [{ title: 'Unsafe', href: 'data:text/html,unsafe' }]; }
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
    { id: 'public-document', title: 'Public document', href: 'https://example.org/public.pdf', status: 'published' },
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
