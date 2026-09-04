import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { loadContent } from '../src/content/load-content.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const defaultOutput = 'artifacts/content-bundle.reference.json';

function outputArgument(args) {
  const inline = args.find((argument) => argument.startsWith('--output='));
  if (inline) return inline.slice('--output='.length);

  const index = args.indexOf('--output');
  if (index === -1) return defaultOutput;
  if (!args[index + 1]) throw new Error('Pass a path after --output');
  return args[index + 1];
}

function isInside(parent, target) {
  const path = relative(parent, target);
  return path !== '..' && !path.startsWith(`..${sep}`) && !path.startsWith(sep);
}

const output = resolve(projectRoot, outputArgument(process.argv.slice(2)));
if (!isInside(projectRoot, output)) {
  throw new Error('Reference export must stay inside the project directory');
}
if (extname(output).toLowerCase() !== '.json') {
  throw new Error('Reference export must use a .json filename');
}

for (const directory of ['public', 'dist', 'node_modules', '.git']) {
  if (isInside(resolve(projectRoot, directory), output)) {
    throw new Error(`Reference export must not be written inside ${directory}/`);
  }
}

const content = await loadContent({
  cwd: projectRoot,
  env: { CONTENT_ADAPTER: 'local' }
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(content, null, 2)}\n`, 'utf8');

console.log(`Reference ContentBundle written to ${relative(projectRoot, output)}`);
console.log('This file is an integration example; do not treat repository placeholder content as authoritative CMS data.');
