import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { CompactCard } from './mdx/compact-card';
import { Mermaid } from './mdx/mermaid';
import { RunCommand } from './mdx/run-command';

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
		TypeTable,
		...components,
	};
}
