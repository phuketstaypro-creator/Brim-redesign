import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { ContentContractError, isPlainObject } from '../contracts.mjs';

const MAX_JSON_BYTES = 25 * 1024 * 1024;

function isWithinDirectory(directory, target) {
  const relative = path.relative(directory, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveContentFile(file, cwd) {
  if (typeof file !== 'string' || !file.trim()) {
    throw new ContentContractError('CMS_CONTENT_FILE is required when CONTENT_ADAPTER=json');
  }
  if (file.includes('\0')) {
    throw new ContentContractError('CMS_CONTENT_FILE contains a null byte');
  }

  const resolved = path.resolve(cwd, file.trim());
  const contentRoot = path.resolve(cwd);
  if (!isWithinDirectory(contentRoot, resolved)) {
    throw new ContentContractError('CMS_CONTENT_FILE must stay inside the project directory');
  }
  if (path.extname(resolved).toLowerCase() !== '.json') {
    throw new ContentContractError('CMS_CONTENT_FILE must point to a .json file');
  }
  return resolved;
}

/**
 * Load a complete ContentBundle-compatible JSON export. The adapter reads data
 * only; it never evaluates JavaScript supplied through an environment variable.
 */
export async function loadJsonContent({ file, cwd = process.cwd() } = {}) {
  const resolved = resolveContentFile(file, cwd);
  let fileStat;
  try {
    fileStat = await stat(resolved);
  } catch (error) {
    throw new ContentContractError(`CMS content file cannot be read: ${error.message}`);
  }

  if (!fileStat.isFile()) throw new ContentContractError('CMS_CONTENT_FILE must point to a regular file');
  if (fileStat.size > MAX_JSON_BYTES) {
    throw new ContentContractError(`CMS content file exceeds the ${MAX_JSON_BYTES}-byte limit`);
  }

  const [realRoot, realFile] = await Promise.all([realpath(path.resolve(cwd)), realpath(resolved)]);
  if (!isWithinDirectory(realRoot, realFile)) {
    throw new ContentContractError('CMS_CONTENT_FILE cannot resolve outside the project directory');
  }

  let parsed;
  try {
    const source = await readFile(resolved, 'utf8');
    parsed = JSON.parse(source.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new ContentContractError(`CMS content file is not valid UTF-8 JSON: ${error.message}`);
  }

  if (!isPlainObject(parsed)) throw new ContentContractError('CMS content JSON root must be an object');
  return parsed;
}

export default loadJsonContent;
