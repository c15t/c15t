import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT_DIR } from './config';
import { convertMdxFile } from './convert';
import { generatePackageDocs } from './generate-package-docs';
import { createAgentDocsRemarkPlugins } from './remark-pipeline';

const remarkPlugins = createAgentDocsRemarkPlugins();

describe('convertMdxFile', () => {
	it('prefers framework wrapper pages and merges imported shared sections', async () => {
		const filePath = join(
			ROOT_DIR,
			'docs',
			'frameworks',
			'react',
			'components',
			'consent-banner.mdx'
		);
		const { markdown } = await convertMdxFile(filePath, remarkPlugins);

		expect(markdown).toContain('title: ConsentBanner');
		expect(markdown).toContain('## Basic Usage');
		expect(markdown).toContain('## Customizing Content');
		expect(markdown).toContain('## Props');
		expect(markdown).not.toContain('<section id=');
		expect(markdown).not.toContain('This file is NOT rendered directly');
		expect(markdown).toContain('|Property|Type|Description|Default|Required|');
		expect(markdown).not.toContain('| Property            |');
		expect(markdown).not.toContain('&#xA;');
	});

	it('renders AutoTypeTable output into compact markdown tables', async () => {
		const filePath = join(
			ROOT_DIR,
			'docs',
			'frameworks',
			'react',
			'server-side.mdx'
		);
		const { markdown } = await convertMdxFile(filePath, remarkPlugins);

		expect(markdown).toContain('|Property|Type|');
		expect(markdown).toContain('|headers|Headers|');
		expect(markdown).not.toContain('<AutoTypeTable');
		expect(markdown).not.toContain('AutoTypeTable: Could not extract');
	});

	it('converts package command tabs, steps, and callouts into markdown', async () => {
		const filePath = join(
			ROOT_DIR,
			'docs',
			'frameworks',
			'next',
			'quickstart.mdx'
		);
		const { markdown } = await convertMdxFile(filePath, remarkPlugins);

		expect(markdown).toContain('|npm|`npx @c15t/cli@rc`|');
		expect(markdown).toContain('1. **Install package**');
		expect(markdown).toContain('> ℹ️ Info:');
		expect(markdown).not.toContain('<PackageCommandTabs');
		expect(markdown).not.toContain('<Steps>');
		expect(markdown).not.toContain('<Callout');
	});

	it('generates backend configuration docs with headed nested sections and valid links', async () => {
		await generatePackageDocs('@c15t/backend');
		const markdown = readFileSync(
			join(ROOT_DIR, 'packages', 'backend', 'docs', 'api', 'configuration.md'),
			'utf8'
		);

		expect(markdown).toContain('### C15TOptions');
		expect(markdown).not.toContain('#### `openapi` OpenAPIOptions | undefined');
		expect(markdown).toContain(
			'[FumaDBAdapter](https://v2.c15t.com/docs/self-host/guides/database-setup)'
		);
		expect(markdown).not.toMatch(/\\\[[^\]]+\\\]\((?::\/\/|https?:\/\/)/);
		expect(markdown).not.toContain('](<https://');
		expect(markdown).toContain('|cmpId|number \\|undefined|');
		expect(markdown).toMatch(
			/See List of registered CMPs: https\\?:\/\/iabeurope\.eu\/cmp-list\//
		);
		expect(markdown).toContain(
			'|options|Object \\|undefined|OpenAPI specification options|'
		);
		expect(markdown).toContain('#### `options`');
		expect(markdown).not.toContain('#### `options` {');
		expect(markdown).not.toContain('](://');
		expect(markdown).not.toContain(
			'\n|Property|Type|Description|Default|Required|\n|:--|:--|:--|:--|:--:|\n|enabled|boolean \\|undefined|Enable/disable OpenAPI spec generation|true|Optional|\n\n|Property|Type|Description|Default|Required|'
		);
	}, 20000);

	it('generates readable compact descriptions for integration docs', async () => {
		await generatePackageDocs('c15t');
		const markdown = readFileSync(
			join(
				ROOT_DIR,
				'packages',
				'core',
				'docs',
				'integrations',
				'meta-pixel.md'
			),
			'utf8'
		);

		expect(markdown).toContain(
			'|callbackOnly|boolean \\|undefined|Whether this is a callback-only script'
		);
		expect(markdown).toContain(
			'|target|"head" \\|"body" \\|undefined|Where to inject the script element in the DOM.'
		);
		expect(markdown).not.toContain("Use `'body'` for scripts that:");
		expect(markdown).toContain('|script|Script \\|undefined|');
		expect(markdown).not.toContain('.;');
		expect(markdown).not.toContain(':;');
	}, 20000);

	it('preserves full nested descriptions and cleans mermaid line breaks', async () => {
		await generatePackageDocs('@c15t/nextjs');
		const markdown = readFileSync(
			join(ROOT_DIR, 'packages', 'nextjs', 'docs', 'server-side.md'),
			'utf8'
		);

		expect(markdown).toContain(
			'Cache lifetime in seconds for the Next.js data cache. Set to false to disable Next.js caching for this call.'
		);
		expect(markdown).toContain('Returns a Promise - (not awaited)');
		expect(markdown).not.toContain(' / ');
		expect(markdown).not.toContain('<br/>');
		expect(markdown).not.toContain(
			'### Options\n\n### FetchInitialDataOptions'
		);
	}, 20000);
});
