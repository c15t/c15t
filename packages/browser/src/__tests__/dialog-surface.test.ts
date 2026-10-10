import { policyRulePresets } from '@c15t/core';
import type { ConsentSnapshot } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createScriptTagConsentClient as createConsentClient } from '../script-tag-client';
import type { ConsentClient } from '../types';
// Not `./dialog-surface`: the suites alias that specifier to the dialog
// itself, as the script-tag builds do.
import { createDialog } from '../ui/dialog-surface';
import type { SurfaceContext } from '../ui/surface';

const clients: ConsentClient[] = [];

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	document.body.replaceChildren();
});

const setup = async function setup(): Promise<{
	client: ConsentClient;
	ctx: SurfaceContext;
	root: HTMLElement;
}> {
	const client = createConsentClient(
		{
			consentCategories: ['measurement'],
			policyRules: [
				{
					...policyRulePresets.europeOptIn(),
					categories: ['measurement'],
					match: { isDefault: true },
				},
			],
			ui: false,
		},
		{ pkg: '@c15t/browser/test' }
	);
	clients.push(client);
	client.start();
	await client.ready();
	const root = document.createElement('div');
	document.body.append(root);
	return {
		client,
		ctx: {
			client,
			disableAnimation: true,
			legalLinks: undefined,
			noStyle: false,
			root,
			slot: (element) => element,
		},
		root,
	};
};

const dialogRoot = (root: HTMLElement) =>
	root.querySelector('[data-testid="consent-dialog-root"]');

describe('on-demand preference centre', () => {
	it('loads when the dialog opens and renders the newest snapshot', async () => {
		const { client, ctx, root } = await setup();
		const surface = createDialog(ctx, {});
		surface.sync(client.getSnapshot());
		expect(dialogRoot(root)).toBeNull();

		client.openDialog();
		const opened: ConsentSnapshot = client.getSnapshot();
		surface.sync(opened);
		// Not rendered in the task that opened it: the chunk is still loading.
		expect(dialogRoot(root)).toBeNull();
		await vi.waitFor(() => {
			expect(dialogRoot(root)).not.toBeNull();
		});

		client.closeDialog();
		surface.sync(client.getSnapshot());
		expect(
			dialogRoot(root)?.closest('[data-state]')?.getAttribute('data-state')
		).not.toBe('open');
		surface.destroy();
	});

	it('does not render after it is destroyed while loading', async () => {
		const { client, ctx, root } = await setup();
		const surface = createDialog(ctx, {});
		client.openDialog();
		surface.sync(client.getSnapshot());
		surface.destroy();
		// Let the chunk land.
		await import('../ui/dialog');
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(dialogRoot(root)).toBeNull();
	});

	it('closes without rendering when the dialog closes before the chunk lands', async () => {
		const { client, ctx, root } = await setup();
		const surface = createDialog(ctx, {});
		client.openDialog();
		surface.sync(client.getSnapshot());
		client.closeDialog();
		surface.sync(client.getSnapshot());
		await import('../ui/dialog');
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(dialogRoot(root)).toBeNull();
		surface.destroy();
	});
});
