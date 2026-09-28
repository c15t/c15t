import { chromium } from 'playwright';
import type { Browser, BrowserContext } from 'playwright';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import type { CompatProbeState } from '../probe';
import './provided-context';

const ROUTE = '/network-blocker';
const EARLY = ['child', 'child-xhr', 'module', 'sibling'];

declare global {
	interface Window {
		__c15tCompat?: CompatProbeState;
	}
}

export interface NetworkBlockerSuiteOptions {
	/**
	 * `true` when the bundler evaluates client component modules as soon as
	 * the route's chunk loads (webpack), before `ConsentRoot` renders. The
	 * request `network-beacons.tsx` sends at module evaluation is then out of
	 * the blocker's reach, as the network blocker docs state. Turbopack
	 * evaluates the module while rendering the first element that uses it,
	 * inside the root, so the blocker holds it.
	 */
	modulesEvaluateBeforeRender?: boolean;
}

/**
 * Network-level check that the blocker covers requests sent before its
 * module loads: at client module evaluation inside the root, in a mount
 * effect next to the root, and in a child's mount effect (fetch and XHR).
 * The cell mounts `/network-blocker` with `network-beacons.tsx` and
 * `sibling-beacon.tsx`.
 *
 * @param title - Suite title naming the cell.
 * @param options - What the cell's bundler lets the blocker cover.
 */
export const defineNetworkBlockerSuite = function defineNetworkBlockerSuite(
	title: string,
	{ modulesEvaluateBeforeRender = false }: NetworkBlockerSuiteOptions = {}
) {
	const uncovered = modulesEvaluateBeforeRender ? ['module'] : [];
	describe(title, () => {
		const baseURL = inject('compatBaseURL');
		let browser: Browser;

		beforeAll(async () => {
			browser = await chromium.launch();
		});

		afterAll(async () => {
			await browser?.close();
		});

		/** Visit the route, wait for the policy, and leave time for effects. */
		const visit = async function visit(context: BrowserContext) {
			const sent: string[] = [];
			await context.route('http://tracker.test/**', (route) => {
				sent.push(
					new URL(route.request().url()).searchParams.get('when') ?? ''
				);
				return route.fulfill({
					headers: { 'access-control-allow-origin': '*' },
					status: 204,
				});
			});
			const page = await context.newPage();
			await page.goto(`${baseURL}${ROUTE}`, { waitUntil: 'domcontentloaded' });
			await page.waitForFunction(
				() =>
					window.__c15tCompat?.hasPolicy &&
					!window.__c15tCompat.policyProvisional,
				undefined,
				{ timeout: 30_000 }
			);
			await page.waitForTimeout(1000);
			return { page, sent };
		};

		/** Storage state after answering the banner on a first visit. */
		const savedChoice = async function savedChoice(
			choice: 'accept' | 'reject'
		) {
			const context = await browser.newContext();
			try {
				const { page } = await visit(context);
				await page.getByTestId(`consent-banner-${choice}-button`).click();
				// The choice is stored after the kernel records it.
				await page.waitForFunction(() => document.cookie.includes('c15t='));
				return await context.storageState();
			} finally {
				await context.close();
			}
		};

		const sentOnVisit = async function sentOnVisit(
			choice?: 'accept' | 'reject'
		) {
			const context = await browser.newContext(
				choice ? { storageState: await savedChoice(choice) } : {}
			);
			try {
				const { sent } = await visit(context);
				return sent.filter((when) => !uncovered.includes(when)).sort();
			} finally {
				await context.close();
			}
		};

		it('sends no tracker request on a first visit', async () => {
			expect(await sentOnVisit()).toEqual([]);
		});

		it('sends no tracker request for a visitor who rejected', async () => {
			expect(await sentOnVisit('reject')).toEqual([]);
		});

		it('sends the held requests for a visitor who accepted', async () => {
			expect(await sentOnVisit('accept')).toEqual(
				EARLY.filter((when) => !uncovered.includes(when))
			);
		});
	});
};
