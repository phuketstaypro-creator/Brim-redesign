import { ContentContractError } from './contracts.mjs';
import { collectPublicRoutes } from './validate.mjs';

const identityCollections = Object.freeze([
  ['programs', 'id'],
  ['newsItems', 'id'],
  ['events', 'id'],
  ['employees', 'id'],
  ['documents', 'id'],
  ['svedenSections', 'slug'],
  ['media', 'id']
]);

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value ?? null;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
  );
}

function sameValue(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function compareSets(reference, candidate, field, locale, issues) {
  const referenceSet = new Set(reference);
  const candidateSet = new Set(candidate);
  const missing = sorted([...referenceSet].filter((value) => !candidateSet.has(value)));
  const extra = sorted([...candidateSet].filter((value) => !referenceSet.has(value)));
  if (missing.length || extra.length) {
    issues.push(
      `locales.${locale}.${field} parity mismatch`
      + `${missing.length ? `; missing: ${missing.join(', ')}` : ''}`
      + `${extra.length ? `; extra: ${extra.join(', ')}` : ''}`
    );
  }
}

function keyed(items, field) {
  return new Map(items.map((item) => [item[field], item]));
}

function compareStableField(reference, candidate, field, locale, issues) {
  if (!sameValue(reference, candidate)) {
    issues.push(`locales.${locale}.${field} must match the default locale`);
  }
}

function renditionSignature(rendition) {
  if (!rendition) return null;
  return {
    sourcePath: rendition.sourcePath,
    src: rendition.src,
    width: rendition.width,
    height: rendition.height,
    variants: (rendition.variants ?? []).map((variant) => ({
      sourcePath: variant.sourcePath,
      src: variant.src,
      width: variant.width,
      height: variant.height
    }))
  };
}

function mediaSignature(asset) {
  return {
    ...renditionSignature(asset),
    mobile: renditionSignature(asset.mobile),
    source: asset.source,
    originalName: asset.originalName,
    rightsStatus: asset.rightsStatus
  };
}

function workflowSignature(item) {
  return {
    status: item?.status,
    publicationStatus: item?.publicationStatus,
    published: item?.published,
    draft: item?.draft
  };
}

function linkedItemsSignature(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      id: item?.id ?? null,
      href: item?.href ?? null,
      fileType: item?.fileType ?? null,
      ...workflowSignature(item)
    }))
    .sort((left, right) => `${left.id ?? ''}\0${left.href ?? ''}`.localeCompare(`${right.id ?? ''}\0${right.href ?? ''}`));
}

function linkedResourceSnapshot(content) {
  return {
    newsItems: Object.fromEntries(content.newsItems.map((item) => [item.id, linkedItemsSignature(item.attachments)])),
    events: Object.fromEntries(content.events.map((item) => [item.id, linkedItemsSignature(item.attachments)])),
    svedenSections: Object.fromEntries(content.svedenSections.map((item) => [item.slug, linkedItemsSignature(item.documents)]))
  };
}

function hrefGraph(value, path = 'site', entries = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => hrefGraph(item, `${path}[${index}]`, entries));
    return Object.fromEntries(entries);
  }
  if (!value || typeof value !== 'object') return Object.fromEntries(entries);

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (key === 'href' || key.endsWith('Href')) entries.push([childPath, child ?? null]);
    else hrefGraph(child, childPath, entries);
  }
  return Object.fromEntries(entries);
}

function pageRendererSnapshot(content) {
  return Object.fromEntries(sorted(Object.keys(content.pages)).map((route) => [route, {
    structureOnly: content.pages[route]?.structureOnly ?? null,
    siteMap: content.pages[route]?.siteMap ?? null,
    gallery: content.pages[route]?.gallery ?? null,
    sveden: content.pages[route]?.sveden ?? null
  }]));
}

function mediaReferenceSnapshot(content) {
  return {
    site: {
      hero: content.site.home?.hero?.image ?? null,
      about: content.site.home?.about?.image ?? null,
      gallery: (content.site.gallery ?? []).map((item) => item.image ?? null)
    },
    pages: Object.fromEntries(sorted(Object.keys(content.pages)).map((route) => [route, content.pages[route]?.image ?? null])),
    programs: Object.fromEntries(content.programs.map((item) => [item.id, item.image ?? null])),
    newsItems: Object.fromEntries(content.newsItems.map((item) => [item.id, {
      image: item.image ?? null,
      coverImage: item.coverImage ?? null,
      gallery: (item.gallery ?? []).map((entry) => entry.image ?? null)
    }])),
    events: Object.fromEntries(content.events.map((item) => [item.id, {
      image: item.image ?? null,
      coverImage: item.coverImage ?? null
    }])),
    employees: Object.fromEntries(content.employees.map((item) => [item.id, item.image ?? item.photo ?? null])),
    documents: Object.fromEntries(content.documents.map((item) => [item.id, item.image ?? item.thumbnail ?? null]))
  };
}

function compareRecordStructure(reference, candidate, locale, issues) {
  const specs = [
    ['programs', 'id', ['href', 'primary', 'status', 'publicationStatus', 'published', 'draft']],
    ['newsItems', 'id', ['slug', 'href', 'publishedAt', 'updatedAt', 'featured', 'editorialVariant', 'imageWidth', 'imageHeight', 'contentStatus', 'source', 'status', 'publicationStatus', 'published', 'draft']],
    ['events', 'id', ['slug', 'href', 'publishedAt', 'updatedAt', 'startsAt', 'endsAt', 'status', 'publicationStatus', 'published', 'draft']],
    ['employees', 'id', ['status', 'publicationStatus', 'published', 'draft']],
    ['documents', 'id', ['href', 'fileType', 'publishedAt', 'updatedAt', 'status', 'publicationStatus', 'published', 'draft']],
    ['svedenSections', 'slug', ['href', 'group', 'status', 'publicationStatus', 'published', 'draft']]
  ];

  for (const [collection, identity, fields] of specs) {
    const referenceItems = keyed(reference[collection], identity);
    const candidateItems = keyed(candidate[collection], identity);
    for (const id of referenceItems.keys()) {
      if (!candidateItems.has(id)) continue;
      for (const field of fields) {
        compareStableField(
          referenceItems.get(id)?.[field],
          candidateItems.get(id)?.[field],
          `${collection}[${JSON.stringify(id)}].${field}`,
          locale,
          issues
        );
      }
    }
  }
}

/**
 * Locale bundles may translate editorial strings, but they must describe the
 * same public site graph and the same first-party media. This prevents a locale
 * from silently losing a statutory route or pointing a translated record at a
 * different asset.
 */
export function assertLocalizedContentParity(locales, defaultLocale = 'ru') {
  const reference = locales[defaultLocale];
  const issues = [];

  for (const [locale, candidate] of Object.entries(locales)) {
    if (locale === defaultLocale) continue;

    compareStableField(reference.site.baseUrl, candidate.site.baseUrl, 'site.baseUrl', locale, issues);
    compareStableField(
      {
        phone: reference.site.contacts?.phone,
        phoneHref: reference.site.contacts?.phoneHref,
        email: reference.site.contacts?.email,
        emailHref: reference.site.contacts?.emailHref
      },
      {
        phone: candidate.site.contacts?.phone,
        phoneHref: candidate.site.contacts?.phoneHref,
        email: candidate.site.contacts?.email,
        emailHref: candidate.site.contacts?.emailHref
      },
      'site.contacts technical fields',
      locale,
      issues
    );
    compareStableField(
      {
        src: reference.site.assets?.logo?.src,
        width: reference.site.assets?.logo?.width,
        height: reference.site.assets?.logo?.height
      },
      {
        src: candidate.site.assets?.logo?.src,
        width: candidate.site.assets?.logo?.width,
        height: candidate.site.assets?.logo?.height
      },
      'site.assets.logo technical metadata',
      locale,
      issues
    );
    compareSets(Object.keys(reference.pages), Object.keys(candidate.pages), 'pages routes', locale, issues);
    compareSets(collectPublicRoutes(reference), collectPublicRoutes(candidate), 'public routes', locale, issues);
    compareStableField(hrefGraph(reference.site), hrefGraph(candidate.site), 'site href graph', locale, issues);
    compareStableField(
      pageRendererSnapshot(reference),
      pageRendererSnapshot(candidate),
      'pages renderer flags',
      locale,
      issues
    );

    for (const [collection, identity] of identityCollections) {
      compareSets(
        reference[collection].map((item) => item[identity]),
        candidate[collection].map((item) => item[identity]),
        `${collection} ${identity}s`,
        locale,
        issues
      );
    }

    compareRecordStructure(reference, candidate, locale, issues);
    compareStableField(
      mediaReferenceSnapshot(reference),
      mediaReferenceSnapshot(candidate),
      'media reference graph',
      locale,
      issues
    );
    compareStableField(
      linkedResourceSnapshot(reference),
      linkedResourceSnapshot(candidate),
      'linked document graph',
      locale,
      issues
    );

    const referenceMedia = keyed(reference.media, 'id');
    const candidateMedia = keyed(candidate.media, 'id');
    for (const id of referenceMedia.keys()) {
      if (!candidateMedia.has(id)) continue;
      compareStableField(
        mediaSignature(referenceMedia.get(id)),
        mediaSignature(candidateMedia.get(id)),
        `media[${JSON.stringify(id)}] technical metadata`,
        locale,
        issues
      );
    }
  }

  if (issues.length) throw new ContentContractError(issues, 'Localized content parity failed');
  return locales;
}
