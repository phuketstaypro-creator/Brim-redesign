import { ContentContractError } from './contracts.mjs';
import { loadJsonContent } from './adapters/json.mjs';
import { loadLocalContent } from './adapters/local.mjs';
import { normalizeContent } from './normalize.mjs';
import { validateContent } from './validate.mjs';

export const SUPPORTED_CONTENT_ADAPTERS = Object.freeze(['local', 'json']);

/**
 * Load, normalize and validate all public content before templates run.
 *
 * A trusted integration can pass an adapter function directly. Environment
 * variables can select only built-in adapters, so deployment configuration can
 * never cause arbitrary module execution.
 */
export async function loadContent({ env = process.env, cwd = process.cwd(), adapter } = {}) {
  let rawContent;

  if (adapter !== undefined) {
    if (typeof adapter !== 'function') {
      throw new ContentContractError('Custom content adapter must be a function');
    }
    rawContent = await adapter({ env, cwd });
  } else {
    const adapterName = String(env.CONTENT_ADAPTER || 'local').trim().toLowerCase();
    if (adapterName === 'local') {
      rawContent = await loadLocalContent();
    } else if (adapterName === 'json') {
      rawContent = await loadJsonContent({ file: env.CMS_CONTENT_FILE, cwd });
    } else {
      throw new ContentContractError(
        `Unsupported CONTENT_ADAPTER ${JSON.stringify(adapterName)}; expected ${SUPPORTED_CONTENT_ADAPTERS.join(' or ')}`
      );
    }
  }

  const content = normalizeContent(rawContent, { siteUrl: env.SITE_URL });
  return validateContent(content);
}

export default loadContent;
