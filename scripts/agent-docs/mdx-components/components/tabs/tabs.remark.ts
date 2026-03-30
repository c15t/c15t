import type { Root, RootContent } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Transformer } from 'unified';
import {
	createJsxComponentProcessor,
	createStrongParagraph,
	getAttributeValue,
	hasName,
	type MdxNode,
	parseItemsArray,
} from '../../remark-libs';

type TabSection = {
	title: string;
	nodes: RootContent[];
	orderKey: number; // for ordering against Tabs.items if provided
};

// ---------- core transform ----------

function extractTabsSections(tabsNode: MdxNode): TabSection[] {
	const itemsAttr = parseItemsArray(getAttributeValue(tabsNode, 'items'));
	const sections: TabSection[] = [];
	const children = (tabsNode.children ?? []) as RootContent[];
	let tabIndex = 0;

	// Helper functions to reduce complexity
	const checkHasNonEmptyContent = (nodes: RootContent[]): boolean =>
		nodes.some((node) => {
			const textContent = mdastToString(node);
			return textContent.trim().length > 0;
		});

	// TODO: implement nested tabs support — recursively process nested Tabs components within tab content

	const getTabTitle = (tabNode: MdxNode): string => {
		// Prefer explicit <Tab value="…">
		const titleFromAttr = getAttributeValue(tabNode, 'value')?.trim() || null;

		// Fallback: if Tabs has items, map by index
		const titleFromItems = itemsAttr?.[tabIndex] ?? null;

		return titleFromAttr || titleFromItems || `Tab ${tabIndex + 1}`;
	};

	const processTabContent = (tabChildren: RootContent[]): RootContent[] => {
		// Return children as-is since spacing will be handled by shared processor
		return tabChildren;
	};

	// Helper function to calculate order key for a tab
	const calculateOrderKey = (tabNode: MdxNode): number => {
		const valueAttr = getAttributeValue(tabNode, 'value')?.trim() ?? null;
		if (itemsAttr) {
			const inItemsIndex =
				valueAttr !== null ? itemsAttr.indexOf(valueAttr) : -1;
			return inItemsIndex >= 0 ? inItemsIndex : tabIndex;
		}
		return sections.length;
	};

	// Helper function to create a tab section
	const createTabSection = (tabNode: MdxNode): TabSection | null => {
		const title = getTabTitle(tabNode);
		const tabChildren = (tabNode.children ?? []) as RootContent[];
		const processedChildren = processTabContent(tabChildren);

		if (!checkHasNonEmptyContent(processedChildren)) {
			return null;
		}

		return {
			title,
			nodes: processedChildren,
			orderKey: calculateOrderKey(tabNode),
		};
	};

	// Helper function to process a Tab node
	const processTabNode = (tabNode: MdxNode) => {
		const section = createTabSection(tabNode);
		if (section) {
			sections.push(section);
		}
		tabIndex += 1;
	};

	for (const child of children) {
		if (hasName(child, 'Tab')) {
			// Direct Tab child
			processTabNode(child as MdxNode);
		} else if (child.type === 'paragraph') {
			// Check if paragraph contains Tab elements
			const paragraphChildren =
				(child as { children?: RootContent[] }).children ?? [];
			for (const paragraphChild of paragraphChildren) {
				if (hasName(paragraphChild, 'Tab')) {
					processTabNode(paragraphChild as MdxNode);
				}
			}
		}
	}

	// If itemsAttr exists, sections are already in DOM order which should match,
	// but we still sort by orderKey to be explicit.
	sections.sort((a, b) => a.orderKey - b.orderKey);

	return sections;
}

// ---------- plugin ----------

// Helper function to add content nodes with proper spacing
const addContentNodes = (
	replacement: RootContent[],
	nodes: RootContent[]
): void => {
	// Add each content node separately to maintain separation
	for (const node of nodes) {
		replacement.push(node);
	}
};

const createReplacement = (sections: TabSection[]): RootContent[] => {
	const replacement: RootContent[] = [];

	// Collect all content from all sections with section headers
	for (const section of sections) {
		// Add section header
		const headerParagraph = createStrongParagraph(section.title);
		replacement.push(headerParagraph);

		// Add the section content (content nodes already have their own spacing)
		addContentNodes(replacement, section.nodes);
	}

	return replacement;
};

export function remarkTabsToMarkdown(): Transformer<Root, Root> {
	return createJsxComponentProcessor('Tabs', (node) => {
		const sections = extractTabsSections(node);

		if (sections.length === 0) {
			return [];
		}

		return createReplacement(sections);
	});
}
