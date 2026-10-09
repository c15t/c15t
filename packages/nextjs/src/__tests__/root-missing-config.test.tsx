/**
 * Without `c15t.config.ts` (no alias, so the package stub exports
 * `undefined`) and without a `config` prop, `ConsentRoot` warns once
 * outside production.
 */
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

afterEach(() => {
	vi.restoreAllMocks();
});

const renderRoot = (props: Partial<Parameters<typeof ConsentRoot>[0]> = {}) =>
	render(
		<ConsentRoot
			state={policyFixture()}
			persistence={false}
			{...props}
		>
			<div>root</div>
		</ConsentRoot>
	);

test('stays quiet with a config prop', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	await renderRoot({ config: { backendURL: 'https://consent.example.com' } });

	expect(warn).not.toHaveBeenCalled();
});

test('warns once in development when no config is found', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	await renderRoot();
	await renderRoot();

	const calls = warn.mock.calls.filter(([message]) =>
		String(message).includes('c15t.config.ts')
	);
	expect(calls).toHaveLength(1);
	expect(String(calls[0]?.[0])).toContain('withConsentManifest');
});
