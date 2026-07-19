import { build } from 'esbuild';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const outfile = join(root, 'dist', 'leadpulse-tracker.min.js');

// Hard ceiling from the phase brief. The build fails rather than silently
// shipping a bundle that has crept over budget — this file gets pasted into
// a theme where every kilobyte is on the critical path.
const SIZE_BUDGET_BYTES = 5 * 1024;

await build({
  entryPoints: [join(root, 'src', 'tracker.ts')],
  outfile,
  bundle: true,
  minify: true,
  // IIFE, not ESM: the artifact is pasted into a theme as a plain <script>.
  // An ESM bundle would need type="module", which changes load semantics and
  // silently breaks on older themes.
  format: 'iife',
  // es2017 keeps async/await native (no regenerator bloat) while staying
  // compatible with every browser that supports fetch — the actual floor,
  // since a browser without fetch cannot send events at all.
  target: ['es2017'],
  platform: 'browser',
  legalComments: 'none',
  banner: {
    js: '/* leadpulse tracker 0.1.0 | no external runtime deps */',
  },
});

const { size } = await stat(outfile);
const source = await readFile(outfile, 'utf8');

const kb = (size / 1024).toFixed(2);
process.stdout.write(`built dist/leadpulse-tracker.min.js — ${size} bytes (${kb} kb)\n`);

// A bundler misconfiguration that emitted `require(` or `import ` would only
// surface as a runtime error inside a live storefront. Catch it here.
if (/\brequire\s*\(/.test(source) || /^\s*import\s/m.test(source)) {
  process.stderr.write('FAIL: bundle contains module syntax — it is not standalone\n');
  process.exit(1);
}

if (size > SIZE_BUDGET_BYTES) {
  process.stderr.write(
    `FAIL: bundle is ${kb} kb, over the ${SIZE_BUDGET_BYTES / 1024} kb budget\n`,
  );
  process.exit(1);
}

process.stdout.write(`within budget (${SIZE_BUDGET_BYTES / 1024} kb)\n`);
