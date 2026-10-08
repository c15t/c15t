/**
 * ConsentRoot accepts the pending consent state a streamed root loader
 * returns (`loader: () => ({ consent: getConsentState() })`).
 *
 * Invariants verified:
 * - The server render with a pending state has no consent UI and grants
 *   nothing, and the first client render matches it.
 * - A resolved policy in the promise answers the first init: no init
 *   request, and the first save carries the decision the policy made, so
 *   the same-origin init route's decision assertion accepts it.
 * - A promise that resolves without a policy (the server gave up on the
 *   manifest) falls back to the init route.
 */
import {
	useActiveUI,
	useConsent,
	useModel,
	useSaveConsents,
} from '@c15t/react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot, DEFAULT_INIT_ROUTE } from '../root';
import type { ConsentState } from '../server';
import { policyFixture } from './policy-fixture';

const Status = () => {
	const model = useModel();
	const activeUI = useActiveUI();
	const marketing = useConsent('marketing');
	return (
		<div data-testid="status">
			{`${model ?? 'pending'}/${activeUI}/${String(marketing)}`}
		</div>
	);
};

const SaveButton = () => {
	const save = useSaveConsents();
	return (
		<button
			data-testid="save"
			onClick={() => {
				void save({ marketing: true }).catch(() => undefined);
			}}
			type="button"
		>
			save
		</button>
	);
};

const deferred = function deferred() {
	let settle: (state: ConsentState) => void = () => undefined;
	const promise = new Promise<ConsentState>((resolve) => {
		settle = resolve;
	});
	return { promise, resolve: settle };
};

const initResponse = () =>
	Response.json({
		branding: 'c15t',
		location: { countryCode: 'DE', regionCode: null },
		translations: { language: 'en', translations: { common: {} } },
	});

describe('ConsentRoot: streamed state', () => {
	test('the server render with a pending state shows no consent UI', async () => {
		const { renderToString } = await import('react-dom/server');
		const { promise } = deferred();
		const html = renderToString(
			<ConsentRoot
				backendURL="/api/c15t"
				persistence={false}
				state={promise}
			>
				<Status />
			</ConsentRoot>
		);
		expect(html).toContain('pending/none/false');
	});

	test('a resolved policy answers init and binds the first save', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(() =>
				Promise.resolve(Response.json({ ok: true, subjectId: 'sub_1' }))
			);
		const { promise, resolve: resolveState } = deferred();
		try {
			const { getByTestId } = await render(
				<ConsentRoot
					backendURL="/api/c15t"
					persistence={false}
					state={promise}
				>
					<Status />
					<SaveButton />
				</ConsentRoot>
			);

			await expect
				.element(getByTestId('status'))
				.toHaveTextContent('pending/none/false');

			resolveState(policyFixture());
			await expect
				.element(getByTestId('status'))
				.toHaveTextContent('opt-in/banner/false');
			expect(fetchSpy).not.toHaveBeenCalled();

			await getByTestId('save').click();
			await vi.waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(1);
			});
			const [url, init] = fetchSpy.mock.calls[0] ?? [];
			// The query carries the consent journey.
			expect(String(url).split('?')[0]).toBe('/api/c15t/subjects');
			const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
			expect(body.policyId).toBe('react-test');
		} finally {
			fetchSpy.mockRestore();
		}
	});

	test('a state without a policy falls back to the init route', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(() => Promise.resolve(initResponse()));
		const { promise, resolve: resolveState } = deferred();
		try {
			await render(
				<ConsentRoot
					backendURL="/api/c15t"
					persistence={false}
					state={promise}
				>
					<Status />
				</ConsentRoot>
			);
			// Nothing goes out while the server is still resolving.
			await new Promise((resolve) => {
				setTimeout(resolve, 50);
			});
			expect(fetchSpy).not.toHaveBeenCalled();

			resolveState({ initialOverrides: { country: 'DE' } });
			await vi.waitFor(() => {
				expect(fetchSpy).toHaveBeenCalled();
			});
			expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(DEFAULT_INIT_ROUTE);
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
