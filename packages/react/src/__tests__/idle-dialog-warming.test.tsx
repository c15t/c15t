import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentDialog } from '~/aggregate-components';
import {
	registerDialogChunkWarmer,
	resetDialogChunkWarmingForTests,
} from '~/chunk-warming';
import { ConsentDialogLink } from '~/components/panel-link';
import { ConsentBanner } from '~/components/prompt';
import { ConsentProvider } from '~/provider';
import type { ConsentProviderOptions } from '~/provider';
import { offline } from '~/transports/offline';

import { policyFixture } from './policy-fixture';

const fresh = {
	mode: offline(),
	persistence: false,
	prefetch: policyFixture(),
} satisfies ConsentProviderOptions;
const saved = {
	...fresh,
	prefetch: policyFixture({ marketing: false }),
} satisfies ConsentProviderOptions;

interface ConnectionStub {
	effectiveType?: string;
	saveData?: boolean;
}

// Idle callbacks the page scheduled, run on demand instead of by the browser.
let idleCallbacks: IdleRequestCallback[] = [];
let warmer = vi.fn();
let unregister = () => {};

const idleDeadline: IdleDeadline = {
	didTimeout: false,
	timeRemaining: () => 50,
};
const runIdleCallbacks = () => {
	const pending = idleCallbacks;
	idleCallbacks = [];
	for (const runIdle of pending) {
		runIdle(idleDeadline);
	}
};
const button = (testId: string) =>
	document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
const settle = async () => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 50);
	});
};
const stubConnection = (connection: ConnectionStub) => {
	Object.defineProperty(navigator, 'connection', {
		configurable: true,
		value: connection,
	});
};

beforeEach(() => {
	expect(document.readyState).toBe('complete');
	resetDialogChunkWarmingForTests();
	idleCallbacks = [];
	const requestIdle = (scheduled: IdleRequestCallback) => {
		idleCallbacks.push(scheduled);
		return idleCallbacks.length;
	};
	vi.stubGlobal('requestIdleCallback', requestIdle);
	warmer = vi.fn();
	unregister = registerDialogChunkWarmer(warmer);
});

afterEach(() => {
	unregister();
	vi.unstubAllGlobals();
	Reflect.deleteProperty(navigator, 'connection');
});

test('loads the dialog in idle time while the banner is shown', async () => {
	await render(
		<ConsentProvider options={fresh}>
			<ConsentDialog />
		</ConsentProvider>
	);
	await vi.waitFor(() => expect(idleCallbacks).toHaveLength(1));
	expect(warmer).not.toHaveBeenCalled();

	runIdleCallbacks();
	expect(warmer).toHaveBeenCalledOnce();
});

test('loads the dialog in idle time for a mounted trigger after consent was saved', async () => {
	await render(
		<ConsentProvider options={saved}>
			<ConsentBanner />
			<ConsentDialog />
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</ConsentProvider>
	);
	await vi.waitFor(() => expect(button('consent-dialog-link')).not.toBeNull());
	expect(button('consent-banner-customize-button')).toBeNull();
	await vi.waitFor(() => expect(idleCallbacks).toHaveLength(1));

	runIdleCallbacks();
	expect(warmer).toHaveBeenCalledOnce();
});

test('does not load the dialog after consent was saved when nothing can open it', async () => {
	await render(
		<ConsentProvider options={saved}>
			<ConsentBanner />
			<ConsentDialog />
			<p>Page content</p>
		</ConsentProvider>
	);
	await settle();
	expect(button('consent-banner-customize-button')).toBeNull();
	runIdleCallbacks();
	await settle();
	expect(warmer).not.toHaveBeenCalled();
});

test('does not load the dialog when the banner closed before idle time', async () => {
	await render(
		<ConsentProvider options={fresh}>
			<ConsentBanner disableAnimation />
			<ConsentDialog />
		</ConsentProvider>
	);
	await vi.waitFor(() => expect(idleCallbacks).toHaveLength(1));
	button('consent-banner-accept-button')?.click();
	await vi.waitFor(() =>
		expect(button('consent-banner-customize-button')).toBeNull()
	);

	runIdleCallbacks();
	expect(warmer).not.toHaveBeenCalled();
});

test.each([
	['Save-Data is on', { connection: { saveData: true }, options: fresh }],
	[
		'the connection is 2G',
		{ connection: { effectiveType: '2g' }, options: fresh },
	],
	[
		'preloadDialog is intent',
		{ connection: {}, options: { ...fresh, preloadDialog: 'intent' as const } },
	],
])('skips idle loading when %s but still loads on focus', async (_, cell) => {
	stubConnection(cell.connection);
	await render(
		<ConsentProvider options={cell.options}>
			<ConsentBanner disableAnimation />
			<ConsentDialog />
		</ConsentProvider>
	);
	await vi.waitFor(() =>
		expect(button('consent-banner-customize-button')).not.toBeNull()
	);
	await settle();
	expect(idleCallbacks).toHaveLength(0);
	expect(warmer).not.toHaveBeenCalled();

	button('consent-banner-customize-button')?.focus();
	expect(warmer).toHaveBeenCalledOnce();
});
