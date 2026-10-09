// @vitest-environment jsdom
/**
 * Two visitors with opposite stored consent hit the server at the same time.
 * Their cookies come from real browser saves through the public runtime, the
 * server helpers resolve both requests concurrently against one manifest,
 * and each resulting state is rendered to prove the permissions it grants.
 */
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import type { ConsentManifest } from '@c15t/schema/types';
import type { ConsentSnapshot } from 'c15t';
import { createOfflineTransport, custom } from 'c15t';
import { ConsentRoot as NextConsentRoot } from 'c15t/next';
import type { ConsentState as NextConsentState } from 'c15t/next';
import { resolveConsent as resolveNextConsent } from 'c15t/next/server';
import { createConsentRuntime } from 'c15t/runtime';
import { clearManifestCache } from 'c15t/server';
import { ConsentRoot as TanStackConsentRoot } from 'c15t/tanstack-start';
import { resolveConsent as resolveTanStackConsent } from 'c15t/tanstack-start/server';
import type { ConsentState as TanStackConsentState } from 'c15t/tanstack-start/server';
import { act } from 'react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from 'vitest';

import { OBSERVED_RULE, observedPolicy } from '../src/policy';
import { ConsentProbe } from '../src/react';
import { mount, unmountAll } from './dom';

const BACKEND_URL = 'https://consent.example.test';
const MANIFEST: ConsentManifest = {
	branding: 'c15t',
	policyPacks: [createConsentManifestPolicyPack(OBSERVED_RULE)],
	revision: 'consent-observers',
	schemaVersion: 2,
};

const clearBrowserStorage = function clearBrowserStorage(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; Max-Age=0; Path=/`;
		}
	}
	localStorage.clear();
};

/**
 * The `Cookie` header a visitor sends after accepting or rejecting in the
 * browser: a runtime with default persistence saves, and the test reads the
 * cookie it wrote.
 */
const visitorCookie = async function visitorCookie(
	action: 'all' | 'none'
): Promise<string> {
	clearBrowserStorage();
	const runtime = createConsentRuntime({
		iframeBlocker: false,
		mode: custom(createOfflineTransport({ policyRules: [OBSERVED_RULE] })),
		prefetch: { initialPolicyResolution: observedPolicy() },
		windowDebug: false,
	});
	try {
		runtime.start();
		await runtime.kernel.commands.save(action);
		await act(async () => {
			await new Promise<void>((resolve) => {
				setTimeout(resolve, 0);
			});
		});
		const cookie = document.cookie
			.split(';')
			.map((entry) => entry.trim())
			.find((entry) => entry.startsWith('c15t='));
		if (!cookie) {
			throw new Error(`save('${action}') wrote no c15t cookie`);
		}
		return cookie;
	} finally {
		runtime.dispose();
		clearBrowserStorage();
	}
};

const manifestResponse = function manifestResponse(): Response {
	return new Response(JSON.stringify(MANIFEST), {
		headers: { 'content-type': 'application/json' },
	});
};

/** How long `release()` waits for the expected fetches, well under the test timeout. */
const RELEASE_TIMEOUT_MS = 2000;

/**
 * A manifest endpoint that holds its answers until `expected` fetches are
 * waiting, then answers the newest first, so the first visitor's resolution
 * finishes after the second one's. Later fetches are answered at once.
 */
const reversedManifestFetch = function reversedManifestFetch(expected: number) {
	const pending: (() => void)[] = [];
	const requested: string[] = [];
	let released = false;
	const fetch = (input: RequestInfo | URL): Promise<Response> => {
		requested.push(String(input));
		if (released) {
			return Promise.resolve(manifestResponse());
		}
		return new Promise((resolve) => {
			pending.push(() => {
				resolve(manifestResponse());
			});
		});
	};
	/** Waits until `count` fetches are held, or fails with the observed count. */
	const inFlight = async function inFlight(count: number): Promise<void> {
		const deadline = Date.now() + RELEASE_TIMEOUT_MS;
		while (pending.length < count) {
			if (Date.now() > deadline) {
				throw new Error(
					`expected ${count} manifest fetches in flight, saw ${pending.length}`
				);
			}
			// oxlint-disable-next-line no-await-in-loop -- Poll until the fetches are in flight.
			await new Promise<void>((resolve) => {
				setTimeout(resolve, 1);
			});
		}
	};
	const release = async function release(): Promise<void> {
		try {
			await inFlight(expected);
		} finally {
			// Answer every held fetch even when the wait failed, so no
			// resolution is left pending after the test ends.
			released = true;
			for (const answer of pending.splice(0).toReversed()) {
				answer();
			}
		}
	};
	return {
		fetch: fetch as typeof globalThis.fetch,
		inFlight,
		release,
		requested,
	};
};

type VisitorState =
	| { adapter: 'next'; state: NextConsentState }
	| { adapter: 'tanstack'; state: TanStackConsentState };

/** Each adapter's root, as an app would render it for one request. */
const VisitorRoot = ({
	visitor,
	children,
}: {
	visitor: VisitorState;
	children: ReactNode;
}) =>
	visitor.adapter === 'next' ? (
		<NextConsentRoot
			persistence={false}
			state={visitor.state}
		>
			{children}
		</NextConsentRoot>
	) : (
		<TanStackConsentRoot
			persistence={false}
			state={visitor.state}
		>
			{children}
		</TanStackConsentRoot>
	);

/** What the server render and a client mount grant for one state. */
const renderPermissions = async function renderPermissions(
	visitor: VisitorState
) {
	let serverSnapshot: ConsentSnapshot | null = null;
	const html = renderToString(
		<VisitorRoot visitor={visitor}>
			<ConsentProbe
				name="visitor"
				onRender={(snapshot) => {
					serverSnapshot = snapshot;
				}}
			/>
		</VisitorRoot>
	);
	const server = /data-granted="(?<granted>true|false)"/u.exec(html)?.groups
		?.granted;

	const root = await mount(
		<VisitorRoot visitor={visitor}>
			<ConsentProbe name="visitor" />
		</VisitorRoot>
	);
	const client = root.probe('visitor');
	await root.unmount();

	return {
		client: client?.granted,
		server,
		serverRevision: (serverSnapshot as ConsentSnapshot | null)?.revision,
	};
};

let grantedCookie = '';
let deniedCookie = '';

beforeAll(async () => {
	grantedCookie = await visitorCookie('all');
	deniedCookie = await visitorCookie('none');
});

// Each test starts from a cold manifest cache, as v3's own adapter tests do.
beforeEach(() => {
	clearManifestCache();
});

afterEach(async () => {
	await unmountAll();
	clearBrowserStorage();
});

describe('Next.js request isolation', () => {
	const nextRequest = (cookie: string) => ({
		cookies: () => Promise.resolve({ toString: () => cookie }),
		headers: () =>
			Promise.resolve(
				new Headers({
					cookie,
					host: 'shop.example',
					'x-vercel-ip-country': 'DE',
				})
			),
	});

	// `resolveConsent` reads the manifest through the in-process cache, so
	// concurrent renders share one upstream fetch. The manifest is the same
	// for every visitor; only the cookie differs. The second case clears the
	// cache between the two requests so each waits on its own fetch, and the
	// fetches are answered newest first.
	test.each([
		{ fetches: 1, name: 'sharing one manifest fetch' },
		{ fetches: 2, name: 'on separate manifest fetches answered out of order' },
	])(
		'concurrent visitors with opposite consent keep their own permissions, $name',
		async ({ fetches }) => {
			expect(grantedCookie).not.toBe(deniedCookie);
			const upstream = reversedManifestFetch(fetches);
			const resolve = (cookie: string) =>
				resolveNextConsent({
					backendURL: BACKEND_URL,
					fetch: upstream.fetch,
					manifestURL: `${BACKEND_URL}/manifest`,
					reportSessions: false,
					request: nextRequest(cookie),
					// Isolation, not the render budget, is under test here.
					timeoutMs: false,
				});

			const grantedResolving = resolve(grantedCookie);
			if (fetches === 2) {
				await upstream.inFlight(1);
				clearManifestCache();
			}
			const resolving = Promise.all([grantedResolving, resolve(deniedCookie)]);
			await upstream.release();
			const [granted, denied] = await resolving;

			expect(upstream.requested).toHaveLength(fetches);
			expect(granted.initialPolicyResolution?.status).toBe('matched');
			expect(denied.initialPolicyResolution?.status).toBe('matched');

			const grantedResult = await renderPermissions({
				adapter: 'next',
				state: granted,
			});
			const deniedResult = await renderPermissions({
				adapter: 'next',
				state: denied,
			});

			expect(grantedResult.serverRevision).toBe(deniedResult.serverRevision);
			expect(grantedResult).toMatchObject({ client: 'true', server: 'true' });
			expect(deniedResult).toMatchObject({ client: 'false', server: 'false' });
		}
	);
});

describe('TanStack Start request isolation', () => {
	const tanStackRequest = (cookie: string) =>
		new Request('https://shop.example/', {
			headers: { cookie, 'x-vercel-ip-country': 'DE' },
		});

	test('concurrent visitors with opposite consent keep their own permissions', async () => {
		// Both requests read through the module-level manifest cache, so the
		// second waits on the first one's fetch instead of starting its own.
		const upstream = reversedManifestFetch(1);
		const resolve = (cookie: string) =>
			resolveTanStackConsent({
				backendURL: BACKEND_URL,
				fetch: upstream.fetch,
				reportSessions: false,
				request: tanStackRequest(cookie),
				// Isolation, not the render budget, is under test here.
				timeoutMs: false,
			});

		const resolving = Promise.all([
			resolve(grantedCookie),
			resolve(deniedCookie),
		]);
		await upstream.release();
		const [granted, denied] = await resolving;

		expect(granted.initialPolicyResolution?.status).toBe('matched');
		expect(denied.initialPolicyResolution?.status).toBe('matched');

		const grantedResult = await renderPermissions({
			adapter: 'tanstack',
			state: granted,
		});
		const deniedResult = await renderPermissions({
			adapter: 'tanstack',
			state: denied,
		});

		expect(grantedResult.serverRevision).toBe(deniedResult.serverRevision);
		expect(grantedResult).toMatchObject({ client: 'true', server: 'true' });
		expect(deniedResult).toMatchObject({ client: 'false', server: 'false' });
	});
});
