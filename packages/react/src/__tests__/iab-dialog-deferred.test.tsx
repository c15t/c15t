import { MINIMAL_GVL } from '@c15t/conformance';
import { custom } from '@c15t/core';
import type { GlobalVendorList } from '@c15t/schema/types';
import { createRef } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToReadableStream } from 'react-dom/server';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider } from './component-fixture-provider';
import type { ComponentFixtureOptions } from './component-fixture-provider';
import { moduleRequested } from './module-requests';
import { policyFixture } from './policy-fixture';

// Imported once request recording is running.
const { IABConsentBanner, IABConsentDialog } = await import('~/iab');

const IAB_DIALOG_MODULE = '/src/components/iab-panel/iab-panel.tsx';
const dialogModuleLoaded = () => moduleRequested(IAB_DIALOG_MODULE);

const iabOptions = (
	extra: Partial<ComponentFixtureOptions> = {}
): ComponentFixtureOptions => ({
	iab: { cmpId: 123, gvl: MINIMAL_GVL as unknown as GlobalVendorList },
	mode: custom({}),
	persistence: false,
	prefetch: policyFixture({}, { model: 'iab' }),
	...extra,
});

const byTestId = <ElementType extends HTMLElement = HTMLElement>(
	testId: string,
	root: ParentNode = document
) => root.querySelector<ElementType>(`[data-testid="${testId}"]`);
const nextFrame = () => new Promise(requestAnimationFrame);

beforeEach(() => {
	// Idle-time warming would load the dialog on its own; these tests are
	// about what rendering and opening it load. Warming has its own file.
	vi.stubGlobal('requestIdleCallback', () => 0);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// Runs first: once a test loads the dialog module, this document keeps it.
test('the IAB banner loads none of the dialog until Customize opens it', async () => {
	const screen = await render(
		<ComponentFixtureProvider options={iabOptions({ disableAnimation: true })}>
			<IABConsentBanner />
			<IABConsentDialog />
		</ComponentFixtureProvider>
	);
	const customize = await vi.waitFor(() => {
		const button = byTestId<HTMLButtonElement>(
			'iab-consent-banner-customize-button'
		);
		expect(button).not.toBeNull();
		return button as HTMLButtonElement;
	});
	expect(dialogModuleLoaded()).toBe(false);
	expect(byTestId('iab-consent-dialog-root')).toBeNull();

	// A DOM click runs the action without hover or focus warming first.
	customize.click();
	// A cold module request can exceed Vitest's one-second default when the
	// full browser suite is compiling modules with coverage.
	await vi.waitFor(
		() => expect(byTestId('iab-consent-dialog-card')).not.toBeNull(),
		{ timeout: 5000 }
	);
	expect(dialogModuleLoaded()).toBe(true);
	await screen.unmount();
});

test('the partners link opens a freshly mounted dialog on the vendor list', async () => {
	const screen = await render(
		<ComponentFixtureProvider options={iabOptions({ disableAnimation: true })}>
			<IABConsentBanner />
			<IABConsentDialog />
		</ComponentFixtureProvider>
	);
	const partners = await vi.waitFor(() => {
		const link = byTestId<HTMLButtonElement>(
			'iab-consent-banner-partners-link'
		);
		expect(link).not.toBeNull();
		return link as HTMLButtonElement;
	});
	partners.click();
	await vi.waitFor(
		() => {
			const card = byTestId('iab-consent-dialog-card');
			expect(
				card?.querySelector('[role="tab"][aria-selected="true"]')?.textContent
			).toMatch(/vendor|partner/iu);
		},
		{ timeout: 5000 }
	);
	await screen.unmount();
});

test('closing the dialog plays its exit animation instead of removing it at once', async () => {
	const screen = await render(
		<ComponentFixtureProvider options={iabOptions()}>
			<IABConsentDialog open />
		</ComponentFixtureProvider>
	);
	await vi.waitFor(() =>
		expect(byTestId('iab-consent-dialog-card')).not.toBeNull()
	);
	await screen.rerender(
		<ComponentFixtureProvider options={iabOptions()}>
			<IABConsentDialog open={false} />
		</ComponentFixtureProvider>
	);
	await nextFrame();
	// The eager dialog kept its markup for the exit transition.
	expect(byTestId('iab-consent-dialog-root')).not.toBeNull();
	await vi.waitFor(() =>
		expect(byTestId('iab-consent-dialog-root')).toBeNull()
	);
	await screen.unmount();
});

test('the dialog stays closed under another model, even with open set', async () => {
	const screen = await render(
		<ComponentFixtureProvider
			options={iabOptions({ initialUI: 'dialog', prefetch: policyFixture() })}
		>
			<IABConsentDialog open />
		</ComponentFixtureProvider>
	);
	await new Promise((resolve) => {
		setTimeout(resolve, 100);
	});
	expect(byTestId('iab-consent-dialog-root')).toBeNull();
	await screen.unmount();
});

test('compound parts render from the deferred export', async () => {
	const card = createRef<HTMLDivElement>();
	const screen = await render(
		<ComponentFixtureProvider options={iabOptions({ disableAnimation: true })}>
			<IABConsentDialog.Root open>
				<IABConsentDialog.Card ref={card}>
					<IABConsentDialog.Footer />
				</IABConsentDialog.Card>
			</IABConsentDialog.Root>
		</ComponentFixtureProvider>
	);
	await vi.waitFor(() =>
		expect(byTestId('iab-consent-dialog-card')).not.toBeNull()
	);
	expect(IABConsentDialog.Root).toBe(IABConsentDialog.Root);
	expect(card.current).toBe(byTestId('iab-consent-dialog-card'));
	await screen.unmount();
});

test.each([
	['open', { open: true }],
	['showTrigger', { showTrigger: true }],
] as const)(
	'renders nothing on the server and hydrates without errors with %s',
	async (_, props) => {
		const page = (
			<ComponentFixtureProvider
				options={iabOptions({ disableAnimation: true })}
			>
				<main>Page</main>
				<IABConsentDialog {...props} />
			</ComponentFixtureProvider>
		);
		const stream = await renderToReadableStream(page);
		await stream.allReady;
		const html = await new Response(stream).text();
		// The eager dialog rendered nothing before it mounted, either.
		expect(html).toContain('Page');
		expect(html).not.toContain('iab-consent-dialog');
		expect(html).not.toContain('consent-dialog-trigger');

		const container = document.createElement('div');
		container.innerHTML = html;
		document.body.append(container);
		const recoverableErrors: unknown[] = [];
		const root = hydrateRoot(container, page, {
			onRecoverableError: (error) => recoverableErrors.push(error),
		});
		try {
			await vi.waitFor(
				() => {
					const shown =
						'open' in props
							? byTestId('iab-consent-dialog-card')
							: byTestId('consent-dialog-trigger');
					expect(shown).not.toBeNull();
				},
				{ timeout: 5000 }
			);
			expect(recoverableErrors).toEqual([]);
		} finally {
			root.unmount();
			container.remove();
		}
	}
);
