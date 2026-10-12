// Requires the built `@c15t/ui/postcss-tailwind3` entry with plain-Node
// `require()` semantics — the way Next.js loads string plugin names from
// postcss.config.* — and feeds the returned namespace straight to postcss.
// Spawned by `postcss-tailwind3.test.ts`; not a test file itself.
import { createRequire } from 'node:module';

const requireFromProbe = createRequire(import.meta.url);
const postcss = requireFromProbe('postcss');
// Self-reference resolution: `require()` walks up to packages/ui/package.json
// and maps `@c15t/ui/postcss-tailwind3` through its exports map onto the
// built dist entry — the same lookup a consumer's require() performs.
const pluginNamespace = requireFromProbe('@c15t/ui/postcss-tailwind3');

const [, , css, from] = process.argv;
const result = await postcss([pluginNamespace]).process(css, { from });
process.stdout.write(JSON.stringify({ css: result.css }));
