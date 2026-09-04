import {
  CONTENT_SCHEMA_VERSION,
  ContentContractError,
  PUBLISHED_STATUSES,
  createEmptyContentBundle,
  isPlainObject
} from './contracts.mjs';

const publishedStatuses = new Set(PUBLISHED_STATUSES);

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function trimmed(value) {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Records without workflow metadata are treated as published for compatibility
 * with the repository data. Once a CMS sends a status, only an explicit public
 * status is allowed into the generated site.
 */
export function isPublishedRecord(record) {
  if (!isPlainObject(record)) return false;
  if (record.published === false || record.draft === true) return false;

  const statuses = [record.status, record.publicationStatus]
    .filter((status) => status !== undefined && status !== null && status !== '');
  if (!statuses.length) return true;
  return statuses.every((status) => publishedStatuses.has(String(status).trim().toLowerCase()));
}

function normalizeRecord(record) {
  if (!isPlainObject(record)) return clone(record);
  const normalized = clone(record);
  for (const field of ['id', 'slug', 'href', 'route', 'path', 'title', 'publishedAt', 'updatedAt']) {
    if (field in normalized) normalized[field] = trimmed(normalized[field]);
  }
  return normalized;
}

function normalizeCollection(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isPublishedRecord).map(normalizeRecord);
}

function normalizeNestedCollections(record, fields) {
  if (!isPlainObject(record)) return record;
  for (const field of fields) {
    if (Array.isArray(record[field])) record[field] = normalizeCollection(record[field]);
  }
  return record;
}

function normalizePages(value) {
  const entries = Array.isArray(value)
    ? value.map((page) => [page?.route ?? page?.href ?? page?.path, page])
    : isPlainObject(value)
      ? Object.entries(value)
      : [];

  const pages = Object.create(null);
  const duplicateRoutes = [];

  for (const [rawRoute, rawPage] of entries) {
    if (!isPublishedRecord(rawPage)) continue;
    const route = trimmed(rawRoute);
    if (Object.hasOwn(pages, route)) duplicateRoutes.push(route);
    pages[route] = normalizeRecord(rawPage);
  }

  if (duplicateRoutes.length) {
    throw new ContentContractError(
      duplicateRoutes.map((route) => `pages contains duplicate route ${JSON.stringify(route)}`),
      'Content normalization failed'
    );
  }

  return pages;
}

function normalizeMedia(value) {
  const entries = Array.isArray(value)
    ? value.map((asset) => [asset?.id, asset])
    : isPlainObject(value)
      ? Object.entries(value)
      : [];

  return entries
    .filter(([, asset]) => isPlainObject(asset))
    .map(([key, asset]) => {
      const normalized = normalizeRecord(asset);
      normalized.id = trimmed(normalized.id ?? key);
      normalized.defaultAlt = trimmed(normalized.defaultAlt ?? normalized.alt);
      normalized.credit = normalized.credit == null ? null : trimmed(normalized.credit);
      normalized.variants = Array.isArray(normalized.variants)
        ? normalized.variants.map(normalizeRecord)
        : [];
      normalized.srcset = trimmed(normalized.srcset)
        || normalized.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ');
      if (isPlainObject(normalized.mobile)) {
        normalized.mobile = normalizeRecord(normalized.mobile);
        normalized.mobile.variants = Array.isArray(normalized.mobile.variants)
          ? normalized.mobile.variants.map(normalizeRecord)
          : [];
        normalized.mobile.srcset = trimmed(normalized.mobile.srcset)
          || normalized.mobile.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ');
      }
      return normalized;
    });
}

function sortNews(items) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const byFeatured = Number(Boolean(right.item.featured)) - Number(Boolean(left.item.featured));
      if (byFeatured) return byFeatured;
      const byDate = String(right.item.publishedAt ?? '').localeCompare(String(left.item.publishedAt ?? ''));
      return byDate || left.index - right.index;
    })
    .map(({ item }) => item);
}

/**
 * Convert either a local module bundle or a JSON CMS export to one predictable
 * shape. Validation is deliberately a separate step so adapters remain small.
 *
 * @param {Record<string, unknown>} input
 * @param {{siteUrl?: string}} [options]
 * @returns {import('./contracts.mjs').ContentBundle}
 */
export function normalizeContent(input, options = {}) {
  const source = isPlainObject(input) ? input : {};
  const empty = createEmptyContentBundle();
  const site = isPlainObject(source.site) ? clone(source.site) : empty.site;

  // Additive global-link fields stay optional for schema 1.0 CMS exports.
  // Explicit invalid values still reach validation instead of being hidden.
  if (site.usefulLinks === undefined) site.usefulLinks = [];
  if (site.socialLinks === undefined) site.socialLinks = [];

  if (typeof options.siteUrl === 'string' && options.siteUrl.trim()) {
    site.baseUrl = options.siteUrl;
  }
  if (typeof site.baseUrl === 'string') site.baseUrl = site.baseUrl.trim().replace(/\/+$/, '');

  const newsItems = normalizeCollection(source.newsItems ?? source.news)
    .map((item) => normalizeNestedCollections(item, ['attachments', 'gallery']));

  return {
    schemaVersion: trimmed(source.schemaVersion) || CONTENT_SCHEMA_VERSION,
    site,
    pages: normalizePages(source.pages),
    programs: normalizeCollection(source.programs),
    newsItems: sortNews(newsItems),
    events: normalizeCollection(source.events).map((item) => normalizeNestedCollections(item, ['attachments'])),
    employees: normalizeCollection(source.employees),
    documents: normalizeCollection(source.documents),
    svedenSections: normalizeCollection(source.svedenSections ?? source.sveden)
      .map((item) => normalizeNestedCollections(item, ['documents'])),
    media: normalizeMedia(source.media ?? source.mediaAssets)
  };
}
