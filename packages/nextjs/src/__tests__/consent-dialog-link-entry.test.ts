import { ConsentDialogLink as ReactConsentDialogLink } from '@c15t/react';
import { describe, expect, test } from 'vitest';

import manifest from '../../package.json';

describe('@c15t/nextjs/components/consent-dialog-link', () => {
	test('resolves to a module that exports only the dialog link', async () => {
		const target = manifest.exports['./components/consent-dialog-link'];
		expect(target).toEqual({
			default: './dist/components/consent-dialog-link.js',
			import: './dist/components/consent-dialog-link.js',
			types: './dist-types/components/consent-dialog-link.d.ts',
		});

		const entry = await import('../components/consent-dialog-link');

		expect(Object.keys(entry)).toEqual(['ConsentDialogLink']);
		expect(entry.ConsentDialogLink).toBe(ReactConsentDialogLink);
	});
});
