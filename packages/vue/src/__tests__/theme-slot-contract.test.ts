import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSENT_COMPONENT_SLOT_KEYS } from '@c15t/schema/config';
import { describe, expect, test } from 'vitest';

const runtimeComponentsDir = join(
	dirname(fileURLToPath(import.meta.url)),
	'../runtime/components'
);

const DYNAMIC_CONTEXT_SLOTS = {
	description: ['banner', 'dialog', 'manager'],
	tag: ['banner', 'dialog', 'manager', 'iab-banner', 'iab-dialog'],
	link: ['banner', 'dialog', 'manager'],
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

function getVueComponentSources() {
	return readdirSync(runtimeComponentsDir)
		.filter((file) => file.endsWith('.vue'))
		.map((file) => readFileSync(join(runtimeComponentsDir, file), 'utf8'));
}

function extractStaticSlotPaths(source: string) {
	const paths = new Set<string>();
	const componentPathPattern =
		/config(?:\.value)?\.components\?\.(?:\[['"]([^'"]+)['"]\]|([A-Za-z_$][\w$-]*))\?\.(?:\[['"]([^'"]+)['"]\]|([A-Za-z_$][\w$-]*))/g;
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
}

function extractDynamicContextSlotPaths(source: string) {
	const paths = new Set<string>();
	const dynamicContextPattern =
		/config(?:\.value)?\.components\?\.(description|tag|link)\?\.\[context\]/g;
	let match = dynamicContextPattern.exec(source);

	while (match) {
		const group = match[1] as keyof typeof DYNAMIC_CONTEXT_SLOTS;
		for (const slot of DYNAMIC_CONTEXT_SLOTS[group]) {
			paths.add(`${group}.${slot}`);
		}
		match = dynamicContextPattern.exec(source);
	}

	return paths;
}

function extractReachableSlotPaths() {
	const paths = new Set<string>();
	for (const source of getVueComponentSources()) {
		for (const path of extractStaticSlotPaths(source)) {
			paths.add(path);
		}
		for (const path of extractDynamicContextSlotPaths(source)) {
			paths.add(path);
		}
	}
	return [...paths].sort();
}

describe('Vue theme slot contract', () => {
	test('every declared schema slot has an exact reachable Vue binding', () => {
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
