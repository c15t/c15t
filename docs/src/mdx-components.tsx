import { createGenerator } from 'fumadocs-typescript';
import { AutoTypeTable } from 'fumadocs-typescript/ui';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { CompactCard } from './mdx/compact-card';
import { Mermaid } from './mdx/mermaid';
import { RunCommand } from './mdx/run-command';

const generator = createGenerator();

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultComponents,
		Tab,
		Tabs,
		Steps,
		Step,
		Mermaid,
		CompactCard,
		RunCommand,
		AutoTypeTable: (props) => (
			<AutoTypeTable {...props} generator={generator} />
		),
		...components,
	};
}
