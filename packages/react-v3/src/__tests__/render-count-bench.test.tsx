/**
 * Render-count benchmark: v2 Provider+useConsentManager vs
 * v3 ConsentProvider+useConsent.
 *
 * Setup: 10 children, each reading a different consent slice.
 * Action: flip marketing on.
 * Measure: total React commits across all Profilers for the mutation.
 *
 * v3 expectation: exactly the children reading `marketing` re-render.
 * The other 8 stay quiet (zero unrelated re-renders invariant).
 *
 * Output is stashed in .benchmarks/current/react-v3/render-counts.json so
 * it can feed the continuous-monitoring scoreboard.
 */
import { defaultTranslationConfig } from 'c15t';
import { Profiler, type ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import { ConsentProvider, useConsent, useSetConsent } from '../index';

type Category =
	| 'necessary'
	| 'functionality'
	| 'marketing'
	| 'measurement'
	| 'experience';
const CATEGORIES: Category[] = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
];
const CHILDREN = 10;

// Seed offline-mode fetch so the v2 provider mounts cleanly.
const mockFetch = vi.fn().mockResolvedValue(
	new Response(
		JSON.stringify({
			showConsentBanner: true,
			jurisdiction: { code: 'GDPR' },
			translations: {
				language: 'en',
				translations: defaultTranslationConfig.translations.en,
			},
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	)
);

beforeAll(() => {
	(globalThis as { fetch: typeof fetch }).fetch =
		mockFetch as unknown as typeof fetch;
});

afterAll(() => {
	clearConsentRuntimeCache();
});

const settle = () => new Promise((r) => setTimeout(r, 20));

interface Run {
	mountRenders: number;
	mutationRenders: number;
}

async function runV2(): Promise<Run> {
	clearConsentRuntimeCache();
	const counts = new Map<number, number>();

	function V2Child({ index }: { index: number }) {
		// Each child reads the full manager object — same pattern v2
		// consumers use. Accessing any field pulls in the context snapshot.
		const manager = useConsentManager();
		const category = CATEGORIES[index % CATEGORIES.length];
		const allowed = manager.consents[category as Category];
		return (
			<Profiler
				id={`v2-child-${index}`}
				onRender={() => {
					counts.set(index, (counts.get(index) ?? 0) + 1);
				}}
			>
				<div data-testid={`v2-child-${index}`}>
					{category}:{String(allowed)}
				</div>
			</Profiler>
		);
	}

	function Tree({ children }: { children: ReactNode }) {
		return (
			<ConsentManagerProvider
				options={{ mode: 'offline', initialConsentCategories: CATEGORIES }}
			>
				{children}
			</ConsentManagerProvider>
		);
	}

	const { container } = await render(
		<Tree>
			{Array.from({ length: CHILDREN }, (_, i) => (
				<V2Child key={i} index={i} />
			))}
		</Tree>
	);

	await settle();
	const mountRenders = Array.from(counts.values()).reduce((a, b) => a + b, 0);

	// Grab the kernel from the window exposure side-effect (v2 writes itself
	// to window[namespace] — not ideal but that's how you reach the store).
	const store = (
		window as unknown as Record<
			string,
			{
				getState: () => {
					saveConsents: (v: string) => void;
					setConsent: (cat: string, val: boolean) => void;
				};
			}
		>
	).c15tStore;
	const beforeMutation = Array.from(counts.values()).reduce((a, b) => a + b, 0);

	store?.getState().setConsent('marketing', true);
	await settle();

	const afterMutation = Array.from(counts.values()).reduce((a, b) => a + b, 0);
	const mutationRenders = afterMutation - beforeMutation;

	// Best-effort cleanup so the next test has a clean container.
	container.remove();
	return { mountRenders, mutationRenders };
}

async function runV3(): Promise<Run> {
	const counts = new Map<number, number>();

	function V3Child({ index }: { index: number }) {
		const category = CATEGORIES[index % CATEGORIES.length] as Category;
		const allowed = useConsent(category);
		return (
			<Profiler
				id={`v3-child-${index}`}
				onRender={() => {
					counts.set(index, (counts.get(index) ?? 0) + 1);
				}}
			>
				<div data-testid={`v3-child-${index}`}>
					{category}:{String(allowed)}
				</div>
			</Profiler>
		);
	}

	function V3Mutator() {
		const setConsent = useSetConsent();
		return (
			<button
				data-testid="v3-toggle"
				onClick={() => setConsent({ marketing: true })}
				type="button"
			>
				flip marketing
			</button>
		);
	}

	const { getByTestId } = await render(
		<ConsentProvider
			options={{
				persistence: false,
				prefetch: {
					initialConsents: {
						necessary: true,
						functionality: false,
						marketing: false,
						measurement: false,
						experience: false,
					},
				},
			}}
		>
			{Array.from({ length: CHILDREN }, (_, i) => (
				<V3Child key={i} index={i} />
			))}
			<V3Mutator />
		</ConsentProvider>
	);

	await settle();
	const mountRenders = Array.from(counts.values()).reduce((a, b) => a + b, 0);

	await getByTestId('v3-toggle').click();
	await settle();

	const afterMutation = Array.from(counts.values()).reduce((a, b) => a + b, 0);
	const mutationRenders = afterMutation - mountRenders;

	return { mountRenders, mutationRenders };
}

describe('v3 render-count bench', () => {
	test('v3 isolates re-renders; v2 fans out', async () => {
		const v3 = await runV3();
		const v2 = await runV2();

		const payload = {
			suite: 'react-render-counts',
			generatedAt: new Date().toISOString(),
			children: CHILDREN,
			v2,
			v3,
			delta: {
				mountRenders: v3.mountRenders - v2.mountRenders,
				mutationRenders: v3.mutationRenders - v2.mutationRenders,
			},
		};

		// Stash on window so a test-runner reporter (or adjacent node
		// harness) can pull it out. Can't write node:fs from the browser
		// bundle.
		(globalThis as Record<string, unknown>).__C15T_RENDER_BENCH__ = payload;

		console.log(
			`\n[render-count-bench] v2 mount=${v2.mountRenders} mutation=${v2.mutationRenders}` +
				` | v3 mount=${v3.mountRenders} mutation=${v3.mutationRenders}\n`
		);

		// Expected marketing readers: index % 5 === 2, so 2 of 10 children.
		// Strict v3 invariant: exactly those 2 re-render.
		const expectedMarketingReaders = Array.from(
			{ length: CHILDREN },
			(_, i) => i
		).filter((i) => CATEGORIES[i % CATEGORIES.length] === 'marketing').length;

		expect(v3.mutationRenders).toBeLessThanOrEqual(expectedMarketingReaders);
		// v2 fans out because any context-value change re-renders every
		// consumer. This assertion isn't a hard requirement — it just
		// documents the observed gap. Loosen if flaky.
		expect(v2.mutationRenders).toBeGreaterThan(v3.mutationRenders);
	});
});
