import { createGenerator } from 'fumadocs-typescript';
import { AutoTypeTable } from 'fumadocs-typescript/ui';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

const generator = createGenerator();

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultComponents,
		Tab,
		Tabs,
		AutoTypeTable: (props) => (
			<AutoTypeTable {...props} generator={generator} />
		),
		...components,
	};
}
