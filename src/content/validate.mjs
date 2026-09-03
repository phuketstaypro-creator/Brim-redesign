import {
  CONTENT_SCHEMA_VERSION,
  ContentContractError,
  MEDIA_RIGHTS_STATUSES,
  isPlainObject
} from './contracts.mjs';
import { SVEDEN_REQUIRED_ROUTES, missingRequiredRoutes } from './required-routes.mjs';
import { DEFAULT_LOCALE, LOCALE_IDS, localeConfig } from '../i18n/config.mjs';

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const rightsStatuses = new Set(MEDIA_RIGHTS_STATUSES);
const editorialVariants = new Set(['featured', 'wide', 'portrait', 'square', 'standard']);
const svedenGroups = new Set(['mandatory', 'legacy']);
const reservedLocaleRoutePrefixes = new Set(LOCALE_IDS
  .filter((locale) => locale !== DEFAULT_LOCALE)
  .map((locale) => localeConfig(locale).prefix.replace(/^\//, '').toLowerCase())
  .filter(Boolean));

export function isSafePublicRoute(value) {
  if (value === '/') return true;
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (!value.startsWith('/') || !value.endsWith('/')) return false;
  if (value.includes('\\') || value.includes('?') || value.includes('#') || value.includes('//')) return false;

  const segments = value.slice(1, -1).split('/');
  if (!segments.length || segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;
  if (reservedLocaleRoutePrefixes.has(segments[0].toLowerCase())) return false;
  return segments.every((segment) => /^[A-Za-z0-9][A-Za-z0-9._~-]*$/.test(segment));
}

export function isIsoDate(value) {
  if (typeof value !== 'string') return false;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf())
      && date.getUTCFullYear() === Number(year)
      && date.getUTCMonth() + 1 === Number(month)
      && date.getUTCDate() === Number(day);
  }

  const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  return dateTime.test(value) && !Number.isNaN(Date.parse(value));
}

function isSafeRelativeFilePath(value) {
  if (typeof value !== 'string' || !value || value.length > 2048) return false;
  if (value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:/.test(value)) return false;
  if (value.includes('\\') || value.includes('\0') || value.includes('?') || value.includes('#') || value.includes(':')) return false;
  if (/%(?:2e|2f|5c)/i.test(value)) return false;
  const segments = value.split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

function isSafePublicAssetUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('\\') || value.includes('\0') || value.includes('?') || value.includes('#')) return false;
  if (/%(?:2e|2f|5c)/i.test(value)) return false;
  const segments = value.slice(1).split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

function isHttpUrl(value, { allowHttpLocalhost = false } = {}) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (url.protocol === 'https:') return true;
    return allowHttpLocalhost
      && url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]');
  } catch {
    return false;
  }
}

function isSafeSource(value) {
  if (isHttpUrl(value)) return true;
  if (typeof value !== 'string' || !value.startsWith('repository:')) return false;
  return isSafeRelativeFilePath(value.slice('repository:'.length));
}

function isHttpOrigin(value, options) {
  if (!isHttpUrl(value, options)) return false;
  const url = new URL(value);
  return url.pathname === '/' && !url.search && !url.hash;
}

function requiredString(value, field, issues) {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push(`${field} must be a non-empty string`);
    return false;
  }
  return true;
}

function positiveInteger(value, field, issues) {
  if (!Number.isInteger(value) || value <= 0) {
    issues.push(`${field} must be a positive integer`);
    return false;
  }
  return true;
}

function requiredObject(value, field, issues) {
  if (!isPlainObject(value)) {
    issues.push(`${field} must be an object`);
    return null;
  }
  return value;
}

function requiredArray(value, field, issues) {
  if (!Array.isArray(value)) {
    issues.push(`${field} must be an array`);
    return null;
  }
  return value;
}

function isSafeContentLink(value) {
  if (isSafePublicRoute(value) || isSafePublicAssetUrl(value) || isHttpUrl(value)) return true;
  return typeof value === 'string'
    && !/[\u0000-\u001f\u007f]/.test(value)
    && /^(?:mailto:|tel:)[^\s]+$/i.test(value);
}

const unsafeRichTextHrefCharacters = /[\\\u0000-\u001f\u007f]/;
const encodedPathSeparator = /%(?:25)*(?:2f|5c)/i;

/**
 * Rich-text links intentionally support only root-relative public URLs and
 * absolute HTTPS URLs. Browser URL parsers treat backslashes as slashes, so a
 * value such as `/\evil.example` can otherwise become scheme-relative after
 * rendering. Encoded (including repeatedly encoded) separators are rejected
 * for the same reason at the CMS boundary.
 */
export function isSafeRichTextHref(value) {
  if (!isSafeContentLink(value) || unsafeRichTextHrefCharacters.test(value)) {
    return false;
  }
  if (value.startsWith('/')) return !encodedPathSeparator.test(value);
  return isHttpUrl(value);
}

function validateRichText(value, field, issues) {
  if (value === null || value === undefined || typeof value === 'string') return;
  if (!Array.isArray(value)) {
    issues.push(`${field} must be a string, rich-text block array or null`);
    return;
  }

  value.forEach((block, index) => {
    if (!isPlainObject(block) || block.type !== 'link') return;
    if (!isSafeRichTextHref(block.href)) {
      issues.push(`${field}[${index}].href must be a safe public or HTTPS URL`);
    }
  });
}

function validateLinkCollection(value, field, issues, { maxDepth = 0 } = {}) {
  const items = requiredArray(value, field, issues);
  if (!items) return;

  const validateItem = (item, index, parentField, depth) => {
    const prefix = `${parentField}[${index}]`;
    if (!requiredObject(item, prefix, issues)) return;
    requiredString(item.label, `${prefix}.label`, issues);
    if (item.group !== undefined) requiredString(item.group, `${prefix}.group`, issues);
    if (item.cta !== undefined && typeof item.cta !== 'boolean') issues.push(`${prefix}.cta must be a boolean`);

    const hasHref = item.href !== undefined && item.href !== null && item.href !== '';
    if (hasHref && !isSafeContentLink(item.href)) {
      issues.push(`${prefix}.href must be a safe public, HTTPS, mailto or tel URL`);
    }

    if (item.children !== undefined) {
      const children = requiredArray(item.children, `${prefix}.children`, issues);
      if (children && !children.length) issues.push(`${prefix}.children must contain at least one item`);
      if (depth >= maxDepth) {
        issues.push(`${prefix}.children exceeds the supported navigation depth`);
      } else {
        children?.forEach((child, childIndex) => validateItem(child, childIndex, `${prefix}.children`, depth + 1));
      }
    } else if (!hasHref) {
      issues.push(`${prefix} must contain href or non-empty children`);
    }
  };

  items.forEach((item, index) => validateItem(item, index, field, 0));
}

function validateHttpsLinkCollection(value, field, issues) {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (isPlainObject(item) && item.href !== undefined && !isHttpUrl(item.href)) {
      issues.push(`${field}[${index}].href must be an HTTPS URL`);
    }
  });
}

function validateNavigationTargets(items, field, routes, issues) {
  if (!Array.isArray(items)) return;
  items.forEach((item, index) => {
    const prefix = `${field}[${index}]`;
    if (isSafePublicRoute(item?.href) && !routes.has(item.href)) {
      issues.push(`${prefix}.href points to a missing public route ${JSON.stringify(item.href)}`);
    }
    validateNavigationTargets(item?.children, `${prefix}.children`, routes, issues);
  });
}

function validateLinkedItems(value, field, issues) {
  if (value === null || value === undefined) return;
  const items = requiredArray(value, field, issues);
  items?.forEach((item, index) => {
    const prefix = `${field}[${index}]`;
    if (!requiredObject(item, prefix, issues)) return;
    requiredString(item.title, `${prefix}.title`, issues);
    if (!isSafeContentLink(item.href)) issues.push(`${prefix}.href must be a safe public, HTTPS, mailto or tel URL`);
  });
}

function validateSectionPairs(value, field, issues, { nullable = true } = {}) {
  if (value === undefined || (value === null && nullable)) return;
  const sections = requiredArray(value, field, issues);
  sections?.forEach((section, index) => {
    const sectionField = `${field}[${index}]`;
    if (!Array.isArray(section) || section.length < 2) {
      issues.push(`${sectionField} must be a [title, description] pair`);
      return;
    }
    requiredString(section[0], `${sectionField}[0]`, issues);
    requiredString(section[1], `${sectionField}[1]`, issues);
  });
}

function validateHomeSection(section, field, issues, { lead = true } = {}) {
  if (!requiredObject(section, field, issues)) return;
  requiredString(section.index, `${field}.index`, issues);
  requiredString(section.label, `${field}.label`, issues);
  requiredString(section.title, `${field}.title`, issues);
  if (lead) requiredString(section.lead, `${field}.lead`, issues);
}

function validateSite(site, issues) {
  requiredString(site.name, 'site.name', issues);
  requiredString(site.shortName, 'site.shortName', issues);
  requiredString(site.title, 'site.title', issues);
  requiredString(site.description, 'site.description', issues);
  requiredString(site.locale, 'site.locale', issues);
  requiredString(site.legalName, 'site.legalName', issues);
  requiredString(site.themeColor, 'site.themeColor', issues);
  requiredString(site.utilityLabel, 'site.utilityLabel', issues);
  if (!isHttpOrigin(site.baseUrl, { allowHttpLocalhost: true })) {
    issues.push('site.baseUrl must be an HTTPS origin without a path, query or fragment (HTTP is allowed only for localhost)');
  }

  const assets = requiredObject(site.assets, 'site.assets', issues);
  const logo = assets && requiredObject(assets.logo, 'site.assets.logo', issues);
  if (logo) {
    if (!isSafePublicAssetUrl(logo.src)) issues.push('site.assets.logo.src must be a safe root-relative asset URL');
    positiveInteger(logo.width, 'site.assets.logo.width', issues);
    positiveInteger(logo.height, 'site.assets.logo.height', issues);
    requiredString(logo.alt, 'site.assets.logo.alt', issues);
  }

  validateLinkCollection(site.navigation, 'site.navigation', issues, { maxDepth: 1 });
  for (const field of ['utilityNavigation', 'quickLinks', 'usefulLinks', 'socialLinks', 'sideNavigation', 'footerNavigation', 'legalNavigation', 'officialNavigation', 'institutionalNavigation']) {
    validateLinkCollection(site[field], `site.${field}`, issues);
  }
  for (const field of ['usefulLinks', 'socialLinks']) {
    validateHttpsLinkCollection(site[field], `site.${field}`, issues);
  }

  const contacts = requiredObject(site.contacts, 'site.contacts', issues);
  if (contacts) {
    requiredString(contacts.city, 'site.contacts.city', issues);
    const addresses = requiredArray(contacts.addresses, 'site.contacts.addresses', issues);
    addresses?.forEach((address, index) => requiredString(address, `site.contacts.addresses[${index}]`, issues));
    requiredString(contacts.phone, 'site.contacts.phone', issues);
    requiredString(contacts.email, 'site.contacts.email', issues);
    for (const field of ['phoneHref', 'emailHref']) {
      if (!isSafeContentLink(contacts[field])) issues.push(`site.contacts.${field} must be a safe public, HTTPS, mailto or tel URL`);
    }
  }

  const footer = requiredObject(site.footer, 'site.footer', issues);
  if (footer) {
    requiredString(footer.status, 'site.footer.status', issues);
    requiredString(footer.disclaimer, 'site.footer.disclaimer', issues);
  }

  const home = requiredObject(site.home, 'site.home', issues);
  if (home) {
    const hero = requiredObject(home.hero, 'site.home.hero', issues);
    if (hero) {
      for (const field of ['eyebrow', 'title', 'description', 'image', 'imageAlt']) {
        requiredString(hero[field], `site.home.hero.${field}`, issues);
      }
      validateLinkCollection(hero.actions, 'site.home.hero.actions', issues);
    }

    const ticker = requiredArray(home.ticker, 'site.home.ticker', issues);
    if (ticker && !ticker.length) issues.push('site.home.ticker must contain at least one item');
    ticker?.forEach((item, index) => requiredString(item, `site.home.ticker[${index}]`, issues));

    const about = requiredObject(home.about, 'site.home.about', issues);
    validateHomeSection(about, 'site.home.about', issues);
    if (about) {
      for (const field of ['manifestLabel', 'manifest', 'manifestNote', 'image', 'imageAlt', 'imageLabel', 'imageCaption']) {
        requiredString(about[field], `site.home.about.${field}`, issues);
      }
      const stats = requiredArray(about.stats, 'site.home.about.stats', issues);
      stats?.forEach((item, index) => {
        const prefix = `site.home.about.stats[${index}]`;
        if (!requiredObject(item, prefix, issues)) return;
        requiredString(item.value, `${prefix}.value`, issues);
        requiredString(item.label, `${prefix}.label`, issues);
      });
    }

    validateHomeSection(home.education, 'site.home.education', issues);
    validateHomeSection(home.news, 'site.home.news', issues);
    validateHomeSection(home.gallery, 'site.home.gallery', issues, { lead: false });

    const admission = requiredObject(home.admission, 'site.home.admission', issues);
    validateHomeSection(admission, 'site.home.admission', issues);
    const steps = admission && requiredArray(admission.steps, 'site.home.admission.steps', issues);
    steps?.forEach((item, index) => {
      const prefix = `site.home.admission.steps[${index}]`;
      if (!requiredObject(item, prefix, issues)) return;
      for (const field of ['title', 'description', 'linkLabel']) requiredString(item[field], `${prefix}.${field}`, issues);
      if (!isSafeContentLink(item.href)) issues.push(`${prefix}.href must be a safe public, HTTPS, mailto or tel URL`);
    });
  }

  const gallery = requiredArray(site.gallery, 'site.gallery', issues);
  gallery?.forEach((item, index) => {
    const prefix = `site.gallery[${index}]`;
    if (!requiredObject(item, prefix, issues)) return;
    requiredString(item.image, `${prefix}.image`, issues);
    requiredString(item.alt, `${prefix}.alt`, issues);
    requiredString(item.caption, `${prefix}.caption`, issues);
  });
}

function validateId(value, field, issues) {
  if (!requiredString(value, field, issues)) return false;
  if (!identifierPattern.test(value)) {
    issues.push(`${field} must use only letters, numbers, dot, underscore or hyphen`);
    return false;
  }
  return true;
}

function validateRoute(value, field, issues) {
  if (!isSafePublicRoute(value)) {
    issues.push(`${field} must be a safe root-relative route with a trailing slash`);
    return false;
  }
  return true;
}

function validateDateFields(record, fields, prefix, issues) {
  for (const field of fields) {
    const value = record[field];
    if (value !== undefined && value !== null && value !== '' && !isIsoDate(value)) {
      issues.push(`${prefix}.${field} must be an ISO 8601 date or timezone-qualified datetime`);
    }
  }
}

function validateUniqueField(items, field, collection, issues) {
  const seen = new Set();
  for (const [index, item] of items.entries()) {
    const value = item?.[field];
    if (!validateId(value, `${collection}[${index}].${field}`, issues)) continue;
    if (seen.has(value)) issues.push(`${collection} contains duplicate ${field} ${JSON.stringify(value)}`);
    seen.add(value);
  }
}

function validateRendition(rendition, prefix, issues) {
  if (!isPlainObject(rendition)) {
    issues.push(`${prefix} must be an object`);
    return;
  }

  if (!isSafeRelativeFilePath(rendition.sourcePath)) {
    issues.push(`${prefix}.sourcePath must be a safe path relative to public/`);
  }
  if (!isSafePublicAssetUrl(rendition.src)) {
    issues.push(`${prefix}.src must be a safe root-relative asset URL`);
  }
  positiveInteger(rendition.width, `${prefix}.width`, issues);
  positiveInteger(rendition.height, `${prefix}.height`, issues);
}

function validateMedia(media, issues) {
  validateUniqueField(media, 'id', 'media', issues);

  for (const [index, asset] of media.entries()) {
    const prefix = `media[${index}]`;
    if (!isPlainObject(asset)) {
      issues.push(`${prefix} must be an object`);
      continue;
    }

    validateRendition(asset, prefix, issues);
    requiredString(asset.defaultAlt, `${prefix}.defaultAlt`, issues);
    requiredString(asset.originalName, `${prefix}.originalName`, issues);

    if (!isSafeSource(asset.source)) {
      issues.push(`${prefix}.source must be an HTTPS URL or safe repository: path`);
    }
    if (!rightsStatuses.has(asset.rightsStatus)) {
      issues.push(`${prefix}.rightsStatus must be one of ${MEDIA_RIGHTS_STATUSES.join(', ')}`);
    }
    if (asset.credit !== null && asset.credit !== undefined && typeof asset.credit !== 'string') {
      issues.push(`${prefix}.credit must be a string or null`);
    }
    if (!Array.isArray(asset.variants)) {
      issues.push(`${prefix}.variants must be an array`);
    } else {
      if (!asset.variants.length) issues.push(`${prefix}.variants must contain at least one rendition`);
      const widths = new Set();
      asset.variants.forEach((variant, variantIndex) => {
        validateRendition(variant, `${prefix}.variants[${variantIndex}]`, issues);
        if (widths.has(variant?.width)) {
          issues.push(`${prefix}.variants contains duplicate width ${JSON.stringify(variant?.width)}`);
        }
        widths.add(variant?.width);
      });
    }

    if (asset.mobile !== null && asset.mobile !== undefined) {
      validateRendition(asset.mobile, `${prefix}.mobile`, issues);
      if (!Array.isArray(asset.mobile?.variants)) {
        issues.push(`${prefix}.mobile.variants must be an array`);
      } else {
        if (!asset.mobile.variants.length) issues.push(`${prefix}.mobile.variants must contain at least one rendition`);
        asset.mobile.variants.forEach((variant, variantIndex) => {
          validateRendition(variant, `${prefix}.mobile.variants[${variantIndex}]`, issues);
        });
      }
    }
  }
}

function validateMediaReferences(content, issues) {
  const knownMedia = new Set(content.media.map((asset) => asset.id));
  const references = [];
  const add = (value, field) => {
    if (value !== undefined && value !== null && value !== '') references.push([value, field]);
  };

  add(content.site?.home?.hero?.image, 'site.home.hero.image');
  add(content.site?.home?.about?.image, 'site.home.about.image');
  content.site?.gallery?.forEach?.((item, index) => add(item?.image, `site.gallery[${index}].image`));
  Object.entries(content.pages).forEach(([route, page]) => add(page?.image, `pages[${JSON.stringify(route)}].image`));
  content.programs.forEach((item, index) => add(item?.image, `programs[${index}].image`));
  content.newsItems.forEach((item, index) => {
    add(item?.image, `newsItems[${index}].image`);
    add(item?.coverImage, `newsItems[${index}].coverImage`);
    item?.gallery?.forEach?.((galleryItem, galleryIndex) => {
      add(galleryItem?.image, `newsItems[${index}].gallery[${galleryIndex}].image`);
    });
  });
  content.events.forEach((item, index) => {
    add(item?.image, `events[${index}].image`);
    add(item?.coverImage, `events[${index}].coverImage`);
  });
  content.employees.forEach((item, index) => add(item?.image ?? item?.photo, `employees[${index}].image`));
  content.documents.forEach((item, index) => add(item?.image ?? item?.thumbnail, `documents[${index}].image`));

  for (const [id, field] of references) {
    if (typeof id !== 'string' || !knownMedia.has(id)) {
      issues.push(`${field} references unknown media id ${JSON.stringify(id)}`);
    }
  }
}

export function collectPublicRoutes(content) {
  const routes = ['/'];
  routes.push(...Object.keys(content.pages ?? {}));
  for (const item of [...(content.newsItems ?? []), ...(content.events ?? [])]) {
    if (typeof item?.href === 'string' && item.href) routes.push(item.href);
  }
  return routes;
}

/**
 * Validate the normalized content boundary and return the same bundle on
 * success. All detected issues are reported together to keep CMS imports easy
 * to diagnose in CI.
 */
export function validateContent(content) {
  const issues = [];

  if (!isPlainObject(content)) {
    throw new ContentContractError('root must be an object');
  }
  if (content.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${CONTENT_SCHEMA_VERSION}`);
  }
  if (!isPlainObject(content.site)) {
    issues.push('site must be an object');
  } else {
    validateSite(content.site, issues);
  }
  if (!isPlainObject(content.pages)) issues.push('pages must be an object keyed by route');

  for (const collection of ['programs', 'newsItems', 'events', 'employees', 'documents', 'svedenSections', 'media']) {
    if (!Array.isArray(content[collection])) issues.push(`${collection} must be an array`);
  }

  if (issues.length) throw new ContentContractError(issues);

  for (const [route, page] of Object.entries(content.pages)) {
    validateRoute(route, `pages route ${JSON.stringify(route)}`, issues);
    if (!isPlainObject(page)) {
      issues.push(`pages[${JSON.stringify(route)}] must be an object`);
      continue;
    }
    requiredString(page.title, `pages[${JSON.stringify(route)}].title`, issues);
    requiredString(page.description, `pages[${JSON.stringify(route)}].description`, issues);
    if (page.structureOnly !== undefined && typeof page.structureOnly !== 'boolean') {
      issues.push(`pages[${JSON.stringify(route)}].structureOnly must be a boolean`);
    }
    if (page.siteMap !== undefined && typeof page.siteMap !== 'boolean') {
      issues.push(`pages[${JSON.stringify(route)}].siteMap must be a boolean`);
    }
    validateSectionPairs(page.sections, `pages[${JSON.stringify(route)}].sections`, issues, { nullable: false });
    if (page.documents !== null && page.documents !== undefined) {
      const documentNames = requiredArray(page.documents, `pages[${JSON.stringify(route)}].documents`, issues);
      documentNames?.forEach((title, index) => requiredString(title, `pages[${JSON.stringify(route)}].documents[${index}]`, issues));
    }
  }

  validateUniqueField(content.programs, 'id', 'programs', issues);
  validateUniqueField(content.newsItems, 'id', 'newsItems', issues);
  validateUniqueField(content.newsItems, 'slug', 'newsItems', issues);
  validateUniqueField(content.events, 'id', 'events', issues);
  validateUniqueField(content.employees, 'id', 'employees', issues);
  validateUniqueField(content.documents, 'id', 'documents', issues);
  validateUniqueField(content.svedenSections, 'slug', 'svedenSections', issues);

  for (const collection of ['programs', 'newsItems', 'events', 'employees', 'documents']) {
    content[collection].forEach((item, index) => {
      if (!isPlainObject(item)) {
        issues.push(`${collection}[${index}] must be an object`);
        return;
      }
      requiredString(item.title ?? item.name, `${collection}[${index}].title`, issues);
    });
  }

  content.programs.forEach((item, index) => {
    const prefix = `programs[${index}]`;
    validateRoute(item.href, `${prefix}.href`, issues);
    requiredString(item.code, `${prefix}.code`, issues);
    requiredString(item.type, `${prefix}.type`, issues);
    requiredString(item.description, `${prefix}.description`, issues);
    requiredString(item.image, `${prefix}.image`, issues);
    requiredString(item.imageAlt, `${prefix}.imageAlt`, issues);
    if (typeof item.primary !== 'boolean') issues.push(`${prefix}.primary must be a boolean`);
  });

  content.newsItems.forEach((item, index) => {
    const prefix = `newsItems[${index}]`;
    validateRoute(item.href, `${prefix}.href`, issues);
    requiredString(item.excerpt, `${prefix}.excerpt`, issues);
    requiredString(item.category, `${prefix}.category`, issues);
    requiredString(item.publishedAt, `${prefix}.publishedAt`, issues);
    validateDateFields(item, ['publishedAt', 'updatedAt'], prefix, issues);
    if (!Object.hasOwn(item, 'body')) issues.push(`${prefix}.body must be present (null is allowed)`);
    validateRichText(item.body, `${prefix}.body`, issues);
    if (typeof item.featured !== 'boolean') issues.push(`${prefix}.featured must be a boolean`);
    if (item.editorialVariant !== null && item.editorialVariant !== undefined && !editorialVariants.has(item.editorialVariant)) {
      issues.push(`${prefix}.editorialVariant is not supported`);
    }
    if (item.gallery !== null && item.gallery !== undefined) {
      const galleryItems = requiredArray(item.gallery, `${prefix}.gallery`, issues);
      galleryItems?.forEach((galleryItem, galleryIndex) => {
        const galleryPrefix = `${prefix}.gallery[${galleryIndex}]`;
        if (!requiredObject(galleryItem, galleryPrefix, issues)) return;
        requiredString(galleryItem.image, `${galleryPrefix}.image`, issues);
        requiredString(galleryItem.alt, `${galleryPrefix}.alt`, issues);
        if (galleryItem.caption !== undefined && galleryItem.caption !== null && typeof galleryItem.caption !== 'string') {
          issues.push(`${galleryPrefix}.caption must be a string or null`);
        }
      });
    }
    validateLinkedItems(item.attachments, `${prefix}.attachments`, issues);
    for (const field of ['seoTitle', 'seoDescription']) {
      if (item[field] !== null && item[field] !== undefined && typeof item[field] !== 'string') {
        issues.push(`${prefix}.${field} must be a string or null`);
      }
    }
    if (item.image || item.coverImage) {
      requiredString(item.alt ?? item.coverAlt, `${prefix}.coverAlt`, issues);
      positiveInteger(item.imageWidth, `${prefix}.imageWidth`, issues);
      positiveInteger(item.imageHeight, `${prefix}.imageHeight`, issues);
    }
    if (item.source !== null && item.source !== undefined && item.source !== '' && !isHttpUrl(item.source)) {
      issues.push(`${prefix}.source must be an HTTPS URL when present`);
    }
    if (item.contentStatus === 'source-linked') {
      if (!isHttpUrl(item.source)) issues.push(`${prefix}.source must be an HTTPS URL for source-linked content`);
      requiredString(item.sourceLabel, `${prefix}.sourceLabel`, issues);
    }
  });

  content.events.forEach((item, index) => {
    const prefix = `events[${index}]`;
    if (item.slug !== undefined) validateId(item.slug, `${prefix}.slug`, issues);
    validateRoute(item.href, `${prefix}.href`, issues);
    validateDateFields(item, ['publishedAt', 'updatedAt', 'startsAt', 'endsAt'], prefix, issues);
    validateRichText(item.body, `${prefix}.body`, issues);
    validateLinkedItems(item.attachments, `${prefix}.attachments`, issues);
  });

  content.documents.forEach((item, index) => {
    const prefix = `documents[${index}]`;
    validateDateFields(item, ['publishedAt', 'updatedAt'], prefix, issues);
    if (item.href !== undefined && item.href !== null && item.href !== '' && !isSafeContentLink(item.href)) {
      issues.push(`${prefix}.href must be a safe public, HTTPS, mailto or tel URL`);
    }
  });

  const seenSvedenRoutes = new Set();
  content.svedenSections.forEach((item, index) => {
    const prefix = `svedenSections[${index}]`;
    requiredString(item.title, `${prefix}.title`, issues);
    if (!svedenGroups.has(item.group)) issues.push(`${prefix}.group must be mandatory or legacy`);
    if (validateRoute(item.href, `${prefix}.href`, issues)) {
      if (seenSvedenRoutes.has(item.href)) {
        issues.push(`svedenSections contains duplicate href ${JSON.stringify(item.href)}`);
      }
      seenSvedenRoutes.add(item.href);
    }
    validateLinkedItems(item.documents, `${prefix}.documents`, issues);
    validateSectionPairs(item.sections, `${prefix}.sections`, issues);
    validateRichText(item.body, `${prefix}.body`, issues);
  });
  for (const route of SVEDEN_REQUIRED_ROUTES) {
    const section = content.svedenSections.find((item) => item.href === route);
    if (!section) issues.push(`svedenSections is missing required item ${route}`);
    else if (section.group !== 'mandatory') issues.push(`svedenSections required item ${route} must use group mandatory`);
  }

  const routes = collectPublicRoutes(content);
  const seenRoutes = new Set();
  for (const route of routes) {
    if (!validateRoute(route, `public route ${JSON.stringify(route)}`, issues)) continue;
    if (seenRoutes.has(route)) issues.push(`public route is duplicated: ${route}`);
    seenRoutes.add(route);
  }
  for (const route of missingRequiredRoutes(seenRoutes)) {
    issues.push(`required public route is missing: ${route}`);
  }

  for (const field of ['navigation', 'utilityNavigation', 'quickLinks', 'usefulLinks', 'socialLinks', 'sideNavigation', 'footerNavigation', 'legalNavigation', 'officialNavigation', 'institutionalNavigation']) {
    validateNavigationTargets(content.site[field], `site.${field}`, seenRoutes, issues);
  }
  validateNavigationTargets(content.site.home?.hero?.actions, 'site.home.hero.actions', seenRoutes, issues);

  validateMedia(content.media, issues);
  validateMediaReferences(content, issues);

  if (issues.length) throw new ContentContractError(issues);
  return content;
}
