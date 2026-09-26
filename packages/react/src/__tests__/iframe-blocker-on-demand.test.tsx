/**
 * The provider loads the iframe blocker when a gated iframe is on the page.
 *
 * Every page used to download and run the blocker at mount, iframes or
 * not. It now loads on the first `data-category` or `data-vendor` iframe.
 * A gated frame that arrives with a `src` while the chunk is on its way is
 * paused the way the blocker pauses a denied one, so it cannot load before
 * consent allows it.
 *
 * The tests share one module registry and run in order: the first checks
 * that nothing loaded; the second holds the chunk back to test the window
 * before it arrives.
 */
import type { ConsentKernel } from '@c15t/core';
import { useContext, useEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const blockerModule = vi.hoisted(() => {
	let release = () => {
		/* replaced below */
	};
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { gate, loads: 0, release: () => release() };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when the provider evaluates this module. The factory counts loads, can hold the chunk back, and returns the real module.
vi.mock('@c15t/core/modules/iframe-blocker', async (importOriginal) => {
	blockerModule.loads += 1;
	await blockerModule.gate;
	return await importOriginal();
});

const FRAME_URL = 'https://frames.c15t.test/embed';

const sleep = (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

let kernel: ConsentKernel | null = null;
const Capture = () => {
	const value = useContext(KernelContext);
	useEffect(() => {
		kernel = value;
	}, [value]);
	return null;
};

const renderProvider = async (
	prefetch: ReturnType<typeof policyFixture>
): Promise<ConsentKernel> => {
	kernel = null;
	await render(
		<ConsentProvider
			options={{
				mode: Object.assign(
					() => ({ save: () => Promise.resolve({ ok: true }) }),
					{ kind: 'custom' as const }
				),
				persistence: false,
				prefetch,
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	await vi.waitFor(() => expect(kernel).not.toBeNull());
	return kernel as unknown as ConsentKernel;
};

const insertFrame = (attributes: Record<string, string>) => {
	const iframe = document.createElement('iframe');
	for (const [name, value] of Object.entries(attributes)) {
		iframe.setAttribute(name, value);
	}
	document.body.append(iframe);
	return iframe;
};

afterEach(() => {
	for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
		if (iframe.getAttribute('data-category')) {
			iframe.remove();
		}
	}
});

describe('iframe blocker on demand', () => {
	test('a page without gated iframes never loads the blocker', async () => {
		await renderProvider(policyFixture());
		insertFrame({ src: 'about:blank', title: 'ungated' });
		await sleep(50);

		expect(blockerModule.loads).toBe(0);
	});

	test('a denied frame that arrives before the blocker stays paused until consent allows it', async () => {
		const current = await renderProvider(policyFixture());
		const iframe = insertFrame({
			'data-category': 'measurement',
			sandbox: '',
			src: FRAME_URL,
		});

		// Held by the watcher while the blocker chunk is still held back.
		await vi.waitFor(() => expect(blockerModule.loads).toBe(1));
		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(FRAME_URL);

		blockerModule.release();
		await sleep(20);
		expect(iframe.getAttribute('src')).toBeNull();

		await current.commands.save({ measurement: true });
		await vi.waitFor(() => expect(iframe.getAttribute('src')).toBe(FRAME_URL));
	});

	test('an allowed frame keeps its src while the blocker loads', async () => {
		await renderProvider(policyFixture({ measurement: true }));
		const removals: string[] = [];
		const recorder = new MutationObserver((records) => {
			for (const record of records) {
				if (
					record.attributeName === 'src' &&
					!(record.target as Element).hasAttribute('src')
				) {
					removals.push('src');
				}
			}
		});
		recorder.observe(document.body, {
			attributeFilter: ['src'],
			attributes: true,
			subtree: true,
		});
		const iframe = insertFrame({
			'data-category': 'measurement',
			sandbox: '',
			src: FRAME_URL,
		});
		await sleep(20);
		recorder.disconnect();

		expect(iframe.getAttribute('src')).toBe(FRAME_URL);
		expect(removals).toEqual([]);
	});

	test('a gated frame on the page at mount loads the blocker, which pauses it when denied', async () => {
		const iframe = insertFrame({
			'data-category': 'marketing',
			sandbox: '',
			src: FRAME_URL,
		});
		await renderProvider(policyFixture());

		await vi.waitFor(() => expect(iframe.getAttribute('src')).toBeNull());
		expect(iframe.getAttribute('data-src')).toBe(FRAME_URL);
	});
});
