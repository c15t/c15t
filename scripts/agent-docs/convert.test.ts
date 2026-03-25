import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT_DIR } from './config';
import { convertMdxFile } from './convert';
import { remarkCalloutToMarkdown } from './mdx-components/components/callout/callout.remark';
import { remarkCardsToMarkdown } from './mdx-components/components/card/remark-cards';
import { remarkPackageCommandTabsToMarkdown } from './mdx-components/components/code-blocks/package-command-tabs.remark';
import { remarkMermaidToMarkdown } from './mdx-components/components/mermaid/mermaid.remark';
import { remarkStepsToMarkdown } from './mdx-components/components/steps/steps.remark';
import { remarkTabsToMarkdown } from './mdx-components/components/tabs/tabs.remark';
import { remarkTypeTableToMarkdown } from './mdx-components/components/type-table/type-table.remark';
import { remarkInclude } from './remark-include';
import { remarkUnwrapSections } from './remark-unwrap-sections';

const remarkPlugins = [
	remarkInclude,
	remarkUnwrapSections,
	remarkCalloutToMarkdown,
	remarkCardsToMarkdown,
	remarkMermaidToMarkdown,
	remarkPackageCommandTabsToMarkdown,
	remarkStepsToMarkdown,
	remarkTabsToMarkdown,
	[remarkTypeTableToMarkdown, { basePath: ROOT_DIR }],
];

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
});
