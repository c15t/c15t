/* oxlint-disable require-unicode-regexp -- esbuild uses Go regular expressions without the Unicode flag. */
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

const schemaDirectory = fileURLToPath(
	new URL('../packages/schema/', import.meta.url)
);
const external = ['@c15t/translations', '@c15t/translations/en'];

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
					// Translation packages are side-effect-free, as their manifests declare.
					builder.onResolve({ filter: /^@c15t\/translations/ }, ({ path }) => ({
						external: true,
						path,
						sideEffects: false,
					}));
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

	it('removes the unused entity-ID codec from policy consumers', async () => {
		const output = await bundleSchemaConsumer('safeFallbackPolicyInput');
		expect(output).not.toContain('Non-zero carry');
		expect(output).not.toContain(
			'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
		);
	});

	it('retains the entity-ID codec when an ID function is imported', async () => {
		const output = await bundleSchemaConsumer('generateDeterministicId');
		expect(output).toContain('Non-zero carry');
		expect(output).toContain(
			'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
		);
	});

	it('preserves deterministic IDs in a bundled ID consumer', async () => {
		const output = await bundleSchemaConsumer('generateDeterministicId');
		const url = `data:text/javascript;base64,${Buffer.from(output ?? '').toString('base64')}`;
		const { generateDeterministicId } = await import(url);
		const alphabet =
			'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
		const prefixes = {
			auditLog: 'log',
			consent: 'cns',
			consentPolicy: 'pol',
			consentPurpose: 'pur',
			domain: 'dom',
			runtimePolicyDecision: 'rpd',
			subject: 'sub',
		};
		const checks: Promise<void>[] = [];
		for (const timestamp of [
			0,
			1_699_999_999_999,
			1_700_000_000_000,
			1_700_000_000_001,
			1_800_000_000_000,
			Number.NaN,
			Number.POSITIVE_INFINITY,
		]) {
			for (const identity of [
				[],
				[null],
				['subject', 'domain', null],
				['é', '東京', '🙂'],
			]) {
				const offset = Number.isFinite(timestamp)
					? Math.max(0, timestamp - 1_700_000_000_000)
					: 0;
				const bytes = Buffer.alloc(20);
				bytes.writeBigUInt64BE(BigInt(offset));
				createHash('sha256')
					.update(JSON.stringify(identity))
					.digest()
					.copy(bytes, 8, 0, 12);
				let number = BigInt(`0x${bytes.toString('hex')}`);
				let encoded = '';
				while (number > 0n) {
					encoded = alphabet[Number(number % 58n)] + encoded;
					number /= 58n;
				}
				for (const byte of bytes) {
					if (byte !== 0) {
						break;
					}
					encoded = `1${encoded}`;
				}
				for (const [kind, prefix] of Object.entries(prefixes)) {
					const expected = `${prefix}_${encoded}`;
					checks.push(
						generateDeterministicId(kind, timestamp, identity).then(
							(actual: string) => {
								expect(actual).toBe(expected);
							}
						)
					);
				}
			}
		}
		await Promise.all(checks);
	});

	it('retains GVL validators when a consumer imports them', async () => {
		const output = await bundleSchemaConsumer('globalVendorListSchema');
		expect(output).toContain('gvlSpecificationVersion');
		expect(output).toContain('deviceStorageDisclosureUrl');
	});
});
