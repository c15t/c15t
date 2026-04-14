import { ROOT_DIR } from './config';
import { remarkCalloutToMarkdown } from './mdx-components/components/callout/callout.remark';
import { remarkCardsToMarkdown } from './mdx-components/components/card/remark-cards';
import { remarkPackageCommandTabsToMarkdown } from './mdx-components/components/code-blocks/package-command-tabs.remark';
import { remarkMermaidToMarkdown } from './mdx-components/components/mermaid/mermaid.remark';
import { remarkStepsToMarkdown } from './mdx-components/components/steps/steps.remark';
import { remarkTabsToMarkdown } from './mdx-components/components/tabs/tabs.remark';
import { remarkTypeTableToMarkdown } from './mdx-components/components/type-table/type-table.remark';
import { remarkInclude } from './remark-include';
import { remarkUnwrapSections } from './remark-unwrap-sections';

export function createAgentDocsRemarkPlugins() {
	return [
		remarkInclude,
		remarkUnwrapSections,
		remarkCalloutToMarkdown,
		remarkCardsToMarkdown,
		remarkMermaidToMarkdown,
		remarkPackageCommandTabsToMarkdown,
		remarkStepsToMarkdown,
		remarkTabsToMarkdown,
		[remarkTypeTableToMarkdown, { basePath: ROOT_DIR }],
	] as const;
}
