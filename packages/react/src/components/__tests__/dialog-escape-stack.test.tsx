/**
 * With a dialog open over the consent dialog, Escape closes only the dialog
 * on top.
 */
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentDialog } from '~/components/panel';
import {
	Content as DialogContent,
	Portal as DialogPortal,
	Root as DialogRoot,
	Title as DialogTitle,
} from '~/components/shared/ui/dialog';
import { useActiveUI } from '~/hooks';
import { offline } from '~/transports/offline';

const TopDialog = () => {
	const activeUI = useActiveUI();
	const [topOpen, setTopOpen] = useState(true);
	return (
		<>
			<output data-testid="active-ui">{activeUI}</output>
			<DialogRoot
				open={activeUI === 'dialog' && topOpen}
				onOpenChange={setTopOpen}
			>
				<DialogPortal>
					<DialogContent data-testid="top-dialog">
						<DialogTitle>Top</DialogTitle>
						<button type="button">Inside top</button>
					</DialogContent>
				</DialogPortal>
			</DialogRoot>
		</>
	);
};

const activeUI = () =>
	document.querySelector('[data-testid="active-ui"]')?.textContent;
const topDialog = () => document.querySelector('[data-testid="top-dialog"]');

describe('Escape with stacked dialogs', () => {
	test('closes the dialog on top and leaves the consent dialog open', async () => {
		const view = await render(
			<ConsentProvider
				options={{
					initialUI: 'dialog',
					mode: offline({ acknowledgeNoRecords: true }),
					prefetch: policyFixture(),
				}}
			>
				<ConsentDialog disableAnimation />
				<TopDialog />
			</ConsentProvider>
		);
		await vi.waitFor(() => {
			expect(activeUI()).toBe('dialog');
			expect(topDialog()).toBeInstanceOf(HTMLElement);
		});
		topDialog()?.querySelector('button')?.focus();

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(topDialog()).toBeNull());
		await new Promise((resolve) => {
			setTimeout(resolve, 50);
		});
		expect(activeUI()).toBe('dialog');
		view.unmount();
	});
});
