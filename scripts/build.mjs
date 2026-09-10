import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
await mkdir(join(root, 'dist'), { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  external: ['openclaw/*'],
  metafile: true,
  preserveSymlinks: true,
  minify: true,
  legalComments: 'eof',
});
await writeFile(
  join(root, 'dist/index.d.ts'),
  'declare const plugin: import("openclaw/plugin-sdk/plugin-entry").OpenClawPluginDefinition;\nexport default plugin;\n',
);
await writeLicenses(result.metafile);

async function writeLicenses(meta) {
  const packages = new Map();
  for (const input of Object.keys(meta.inputs)) {
    if (!input.includes('node_modules')) continue;
    let directory = dirname(resolve(root, input));
    while (directory !== dirname(directory)) {
      try {
        const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
        if (pkg.name) {
          packages.set(pkg.name, { directory, pkg });
          break;
        }
      } catch {}
      directory = dirname(directory);
    }
  }
  const notices = [];
  for (const [name, { directory, pkg }] of [...packages].sort()) {
    let license;
    for (const file of [
      'LICENSE',
      'LICENSE.md',
      'LICENSE.txt',
      'license',
      'license.md',
      'LICENSE-MIT',
    ]) {
      try {
        license = await readFile(join(directory, file), 'utf8');
        break;
      } catch {}
    }
    if (!license) throw new Error(`Missing bundled dependency license: ${name}`);
    notices.push(`${name} ${pkg.version}\n${license}`);
  }
  await writeFile(
    join(root, 'dist/THIRD_PARTY_LICENSES.txt'),
    notices.join('\n\n----------------\n\n'),
  );
}
