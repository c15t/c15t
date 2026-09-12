import { expect, test } from 'vitest';

import { withPackageSetupLinks } from './package-doc-entry-points';

const index =
	'# Package\n\n## Start here\n\n- [Customize](./docs/customization/overview.md)\n\n## Frameworks\n';

test('Next.js agents get setup and router choices before customization', () => {
	const files = new Set([
		'frameworks/next/quickstart.md',
		'frameworks/next/app-router.md',
		'frameworks/next/pages-router.md',
		'frameworks/next/static-export.md',
	]);
	const result = withPackageSetupLinks(index, files);
	for (const file of files) {
		expect(result).toContain(`(./docs/${file})`);
	}
	expect(result.indexOf('[Next.js quickstart]')).toBeLessThan(
		result.indexOf('[Customize]')
	);
	expect(result).not.toContain('frameworks/react');
	expect(result).not.toContain('frameworks/index.md');
});

test('umbrella bundles use the framework picker instead of every adapter', () => {
	const result = withPackageSetupLinks(
		index,
		new Set([
			'frameworks/index.md',
			'frameworks/next/quickstart.md',
			'frameworks/react/quickstart.md',
		])
	);
	expect(result).toContain(
		'[Choose your framework](./docs/frameworks/index.md)'
	);
	expect(result).not.toContain('/quickstart.md');
});

test('backend bundles link their own setup without frontend guides', () => {
	const result = withPackageSetupLinks(
		index,
		new Set(['self-host/quickstart.md'])
	);
	expect(result).toContain(
		'[Backend quickstart](./docs/self-host/quickstart.md)'
	);
	expect(result).not.toContain('frameworks/');
});

test('preserves setup links already selected by the shared docs index', () => {
	const files = new Set(['frameworks/index.md']);
	const existing = index.replace(
		'## Start here\n\n',
		'## Start here\n\n- [Framework setup](./docs/frameworks/index.md)\n'
	);
	expect(withPackageSetupLinks(existing, files)).toBe(existing);
});
