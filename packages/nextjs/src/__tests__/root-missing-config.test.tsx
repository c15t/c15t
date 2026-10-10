/**
 * Without `c15t.config.ts` (no alias, so the package stub exports
 * `undefined`) and without a `config` prop, `ConsentRoot` warns once
 * outside production, and throws when nothing gives it a backend URL
 * instead of running a mode the app never chose.
 */
import { offline } from '@c15t/core/modes';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
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
	// Next.js inlines the variable; this browser test reads it from `process`.
	vi.stubGlobal('process', {
		env: {
			NEXT_PUBLIC_C15T_BACKEND_URL: 'https://consent.example.com',
			NODE_ENV: 'development',
		},
	});
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	await renderRoot();
	await renderRoot();

	const calls = warn.mock.calls.filter(([message]) =>
		String(message).includes('c15t.config.ts')
	);
	expect(calls).toHaveLength(1);
	expect(String(calls[0]?.[0])).toContain('withConsentManifest');
});

test('throws with no config and no NEXT_PUBLIC_C15T_BACKEND_URL', () => {
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	// The server render, as `next build` prerenders the layout.
	expect(() =>
		renderToString(
			<ConsentRoot state={policyFixture()}>
				<div>root</div>
			</ConsentRoot>
		)
	).toThrow(
		'@c15t/nextjs: manifest() needs a backend URL. Set NEXT_PUBLIC_C15T_BACKEND_URL, or `backendURL` in c15t.config.ts.'
	);
});

test('renders an explicit offline() without a backend URL', () => {
	const html = renderToString(
		<ConsentRoot
			config={{ mode: offline() }}
			state={policyFixture()}
		>
			<div>offline root</div>
		</ConsentRoot>
	);
	expect(html).toContain('offline root');
});
