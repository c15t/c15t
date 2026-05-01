import { expect, test } from 'bun:test';
import {
	frameworkOf,
	pairStories,
	type StoryEntry,
	storyKey,
} from './pair-stories';

test('frameworkOf extracts framework from title', () => {
	expect(frameworkOf('COMPONENTS - REACT/Button')).toBe('react');
	expect(frameworkOf('COMPONENTS - SVELTE/Consent Banner')).toBe('svelte');
	expect(frameworkOf('COMPONENTS - VUE/Dialog')).toBe('vue');
	expect(frameworkOf('COMPONENTS - SOLID/Switch')).toBe('solid');
});

test('frameworkOf tolerates varied whitespace', () => {
	expect(frameworkOf('COMPONENTS-REACT/Button')).toBe('react');
	expect(frameworkOf('components - svelte/Button')).toBe('svelte');
});

test('frameworkOf returns null for unrecognized titles', () => {
	expect(frameworkOf('Button')).toBeNull();
	expect(frameworkOf('PRIMITIVES/Switch')).toBeNull();
});

test('storyKey strips framework segment and appends story name', () => {
	const entry: StoryEntry = {
		id: 'components-react-button--primary',
		title: 'COMPONENTS - REACT/Button',
		name: 'Primary',
	};
	expect(storyKey(entry)).toBe('Button/Primary');
});

test('pairStories groups equivalent entries across frameworks', () => {
	const react: StoryEntry[] = [
		{
			id: 'components-react-button--primary',
			title: 'COMPONENTS - REACT/Button',
			name: 'Primary',
		},
		{
			id: 'components-react-banner--default',
			title: 'COMPONENTS - REACT/Banner',
			name: 'Default',
		},
	];
	const svelte: StoryEntry[] = [
		{
			id: 'components-svelte-button--primary',
			title: 'COMPONENTS - SVELTE/Button',
			name: 'Primary',
		},
	];

	const paired = pairStories({ react, svelte });

	expect(paired).toHaveLength(2);
	const button = paired.find((p) => p.key === 'Button/Primary');
	expect(button?.entries.react?.id).toBe('components-react-button--primary');
	expect(button?.entries.svelte?.id).toBe('components-svelte-button--primary');
	const banner = paired.find((p) => p.key === 'Banner/Default');
	expect(banner?.entries.react?.id).toBe('components-react-banner--default');
	expect(banner?.entries.svelte).toBeUndefined();
});

test('pairStories returns stable, sorted output', () => {
	const react: StoryEntry[] = [
		{
			id: 'a',
			title: 'COMPONENTS - REACT/Z-Comp',
			name: 'Default',
		},
		{
			id: 'b',
			title: 'COMPONENTS - REACT/A-Comp',
			name: 'Default',
		},
	];
	const paired = pairStories({ react });
	expect(paired.map((p) => p.key)).toEqual([
		'A-Comp/Default',
		'Z-Comp/Default',
	]);
});
