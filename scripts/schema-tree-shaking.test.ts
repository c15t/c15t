/* oxlint-disable require-unicode-regexp -- esbuild uses Go regular expressions without the Unicode flag. */
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

const schemaDirectory = fileURLToPath(
	new URL('../packages/schema/', import.meta.url)
);
const external = ['@c15t/translations', '@c15t/translations/en', 'base-x'];

const bundleSchemaConsumer = async (entry: string) => {
	// Publish-style concatenation puts schemas and policy helpers in one module.
	// A consumer must still be able to remove the unused schema constructors.
	const schema = await build({
		bundle: true,
		external: [...external, 'valibot'],
		format: 'esm',
		stdin: {
			contents: "export * from './src/types';",
			resolveDir: schemaDirectory,
		},
		write: false,
	});
	const result = await build({
		bundle: true,
		external,
		format: 'esm',
		minify: true,
		plugins: [
			{
				name: 'published-schema',
				setup(builder) {
					builder.onResolve({ filter: /^schema-under-test$/ }, () => ({
						namespace: 'schema',
						path: 'schema-under-test',
					}));
					builder.onLoad({ filter: /.*/, namespace: 'schema' }, () => ({
						contents: schema.outputFiles[0]?.text,
						resolveDir: schemaDirectory,
					}));
				},
			},
		],
		stdin: {
			contents: `export { ${entry} } from 'schema-under-test';`,
			resolveDir: schemaDirectory,
		},
		write: false,
	});
	return result.outputFiles[0]?.text;
};

describe('published schema tree shaking', () => {
	it('removes unused GVL validators from policy-only consumers', async () => {
		const output = await bundleSchemaConsumer('safeFallbackPolicyInput');
		expect(output).toContain('safeFallbackPolicyInput');
		expect(output).not.toContain('gvlSpecificationVersion');
		expect(output).not.toContain('deviceStorageDisclosureUrl');
	});

	it('retains GVL validators when a consumer imports them', async () => {
		const output = await bundleSchemaConsumer('globalVendorListSchema');
		expect(output).toContain('gvlSpecificationVersion');
		expect(output).toContain('deviceStorageDisclosureUrl');
	});
});
