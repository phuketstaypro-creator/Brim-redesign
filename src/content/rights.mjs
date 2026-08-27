const INDEXABLE_RIGHTS = new Set(['owned', 'licensed', 'public-domain']);

/**
 * Keep a noindex review deployment possible while preventing an accidental
 * public launch with unresolved photo, logo or consent rights.
 */
export function assertIndexableMediaRights(media, { allowIndexing = false } = {}) {
  if (!allowIndexing) return;
  const unresolved = (Array.isArray(media) ? media : [])
    .filter((asset) => !INDEXABLE_RIGHTS.has(asset?.rightsStatus));
  if (unresolved.length) {
    throw new Error(`ALLOW_INDEXING=true requires resolved media rights. Review: ${unresolved.map((asset) => `${asset.id} (${asset.rightsStatus})`).join(', ')}`);
  }
}
