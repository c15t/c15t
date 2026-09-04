import { CONSENT_COMPONENT_SLOT_KEYS } from '@c15t/schema/config';
import { describe, expect, test } from 'vitest';

// Raw source text of every v3 component/primitive module, inlined by Vite so
// the scan also works in browser-mode vitest (no node:fs available there).
const rawSources: Record<string, string> = {
	...import.meta.glob(
		[
			'../../components/**/*.{ts,tsx}',
			'!../../components/**/__tests__/**',
			'!../../components/**/__screenshots__/**',
			'!../../components/**/*.test.*',
			'!../../components/**/*.spec.*',
		],
		{ eager: true, import: 'default', query: '?raw' }
	),
	...import.meta.glob(
		[
			'../../primitives/**/*.{ts,tsx}',
			'!../../primitives/**/__tests__/**',
			'!../../primitives/**/*.test.*',
			'!../../primitives/**/*.spec.*',
		],
		{ eager: true, import: 'default', query: '?raw' }
	),
} as Record<string, string>;

const DYNAMIC_CONTEXT_SLOTS = {
	description: ['banner', 'dialog', 'manager'],
	link: ['banner', 'dialog', 'manager'],
	tag: ['banner', 'dialog', 'manager', 'iab-banner', 'iab-dialog'],
} as const;

const MUST_BE_REACHABLE_SLOTS = [
	'banner.cardShell',
	'dialog.container',
	'accordion.triggerRow',
	'accordion.arrow',
	'accordion.header',
	'accordion.title',
	'accordion.control',
	'accordion.contentViewport',
	'accordion.contentInner',
	'switch.track',
	'switch.thumb',
	'trigger.root',
	'trigger.icon',
	'trigger.text',
	'tag.content',
	'legal-links.root',
	'iab-banner.cardShell',
	'iab-banner.description',
	'iab-banner.partnersLink',
	'iab-banner.purposeList',
	'iab-banner.purposeMore',
	'iab-banner.legitimateInterestNotice',
	'iab-dialog.tabsList',
	'iab-dialog.tabTrigger',
	'iab-dialog.tabPanel',
	'iab-dialog.footer',
	'iab-dialog.actions',
	'iab-dialog.actionGroup',
	'iab-purpose-item.root',
	'iab-purpose-item.header',
	'iab-purpose-item.content',
	'iab-vendor-list.root',
	'iab-vendor-list.row',
	'iab-stack-item.root',
] as const;

const getReactSources = function getReactSources(): string[] {
	return Object.values(rawSources);
};

const extractSlotKeyPaths = function extractSlotKeyPaths(source: string) {
	const paths = new Set<string>();
	const slotKeyPattern =
		/(?:slotKey|[A-Za-z_$][\w$]*SlotKey)=["'](?<capture1>[^"']+\.[^"']+)["']/gu;
	let match = slotKeyPattern.exec(source);

	while (match) {
		if (match[1]) {
			paths.add(match[1]);
		}
		match = slotKeyPattern.exec(source);
	}

	return paths;
};

const extractStaticSlotPaths = function extractStaticSlotPaths(source: string) {
	const paths = new Set<string>();
	const componentPathPattern =
		/components\?\.(?:\[['"](?<capture1>[^'"]+)['"]\]|(?<capture2>[A-Za-z_$][\w$-]*))\?\.(?:\[['"](?<capture3>[^'"]+)['"]\]|(?<capture4>[A-Za-z_$][\w$-]*))/gu;
	let match = componentPathPattern.exec(source);

	while (match) {
		const group = match[1] ?? match[2];
		const slot = match[3] ?? match[4];
		if (group && slot && slot !== 'context') {
			paths.add(`${group}.${slot}`);
		}
		match = componentPathPattern.exec(source);
	}

	return paths;
};

const extractDynamicContextSlotPaths = function extractDynamicContextSlotPaths(
	source: string
) {
	const paths = new Set<string>();
	const dynamicContextPattern =
		/(?:components\?\.(?<capture1>description|tag|link)\?\.\[context\]|slotKey=\{`(?<capture2>description|tag|link)\.\$\{context\}`\})/gu;
	let match = dynamicContextPattern.exec(source);

	while (match) {
		const group = (match[1] ?? match[2]) as keyof typeof DYNAMIC_CONTEXT_SLOTS;
		for (const slot of DYNAMIC_CONTEXT_SLOTS[group]) {
			paths.add(`${group}.${slot}`);
		}
		match = dynamicContextPattern.exec(source);
	}

	return paths;
};

const extractReachableSlotPaths = function extractReachableSlotPaths() {
	const paths = new Set<string>();
	for (const source of getReactSources()) {
		for (const path of extractSlotKeyPaths(source)) {
			paths.add(path);
		}
		for (const path of extractStaticSlotPaths(source)) {
			paths.add(path);
		}
		for (const path of extractDynamicContextSlotPaths(source)) {
			paths.add(path);
		}
	}
	return [...paths].sort();
};

describe('React theme slot contract', () => {
	test('every declared schema slot has an exact reachable React binding', () => {
		const declared = [...CONSENT_COMPONENT_SLOT_KEYS].sort();
		const reachable = extractReachableSlotPaths();

		expect(reachable).toEqual(declared);
	});

	test('major rendered regions stay reachable by slot', () => {
		const reachable = new Set(extractReachableSlotPaths());

		for (const slot of MUST_BE_REACHABLE_SLOTS) {
			expect(reachable.has(slot), slot).toBe(true);
		}
	});
});
