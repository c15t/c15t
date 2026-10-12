import { runInNewContext } from 'node:vm';

import { policyRulePresets } from '@c15t/schema/types';
import { expect, it, vi } from 'vitest';

import { buildScriptResponse, loadScriptBundle } from './script';

it.each([
	{ mode: 'hosted', variant: 'full' },
	{ mode: 'manifest', variant: 'headless' },
	{ mode: 'manifest', variant: 'iab' },
] as const)(
	'initializes the emitted $variant backend script in $mode mode',
	async ({ variant, mode }) => {
		const script = await buildScriptResponse({
			backendURL: 'https://consent.example.test',
			bundle: await loadScriptBundle(variant),
			cache: undefined,
			language: null,
			manifest: {
				policyRules: [
					{ ...policyRulePresets.europeOptIn(), match: { isDefault: true } },
				],
			},
			options: {
				config: { enabled: false, persistence: false, ui: false },
			},
			variant,
		});

		// Execute the served bytes so an incompatible queued mode fails at init.
		const fetch = vi.fn<typeof globalThis.fetch>();
		const initializedMode: unknown = runInNewContext(
			`${script.body}\nwindow.c15t.init().mode;`,
			{ fetch, window: {} },
			{ timeout: 1_000 }
		);
		expect(initializedMode).toBe(mode);
	}
);
