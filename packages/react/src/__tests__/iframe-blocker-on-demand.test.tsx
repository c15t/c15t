/**
 * The provider starts the iframe blocker when a gated iframe is on the page.
 *
 * Every page used to download and run the blocker at mount, iframes or
 * not. It now starts on the first `data-category` or `data-vendor` iframe,
 * through a dynamic `import()`. A gated frame that arrives with a `src`
 * while the blocker is on its way is paused the way the blocker pauses a
 * denied one, so it cannot load before consent allows it.
 *
 * The test server does not split chunks (the runtime entry imports the
 * blocker module for `defaultRuntimeModules`; production bundles drop that
 * import), so the mock counts and holds back `createIframeBlocker` rather
 * than the module's evaluation. The bundle benchmark checks that the
 * blocker stays out of the first-load chunk.
 *
 * The tests share one module registry and run in order: the first checks
 * that nothing started; the second holds the blocker back to test the
 * window before it arrives.
 */
import { createConsentKernel } from '@c15t/core';
import type { ConsentKernel, KernelVendorsState } from '@c15t/core';
import type { IframeBlockerOptions } from '@c15t/core/modules/iframe-blocker';
import type * as IframeBlockerModule from '@c15t/core/modules/iframe-blocker';
import { useContext, useEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { watchGatedIframes } from '../module-hooks/iframe-blocker';
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

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is when the provider starts the blocker. The factory counts starts, can hold the blocker back, and runs the real module.
vi.mock('@c15t/core/modules/iframe-blocker', async (importOriginal) => {
	const original = await importOriginal<typeof IframeBlockerModule>();
	return {
		...original,
		createIframeBlocker: (options: IframeBlockerOptions) => {
			blockerModule.loads += 1;
			let real: ReturnType<typeof original.createIframeBlocker> | null = null;
			let disposed = false;
			void blockerModule.gate.then(() => {
				if (!disposed) {
					real = original.createIframeBlocker(options);
				}
			});
			return {
				dispose: () => {
					disposed = true;
					real?.dispose();
				},
				processAllIframes: () => real?.processAllIframes(),
			};
		},
	};
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
	for (const iframe of Array.from(
		document.querySelectorAll('iframe[data-category], iframe[data-vendor]')
	)) {
		iframe.remove();
	}
});

/**
 * A kernel with marketing granted and `denied` turned off, as a returning
 * visitor has before the backend declares any vendor.
 */
const kernelWithVendorChoice = (
	denied: string[],
	initialVendors?: KernelVendorsState
): ConsentKernel => {
	const fixture = policyFixture({ marketing: true });
	return createConsentKernel({
		...fixture,
		initialRecords: {
			...fixture.initialRecords,
			vendorChoice: { confirmedAt: fixture.now - 1, denied, version: 1 },
		},
		initialVendors,
	});
};

/** Watch with `kernel` and record every `src` the watcher takes away. */
const watchAndRecord = (watched: ConsentKernel) => {
	const removals: Element[] = [];
	const recorder = new MutationObserver((records) => {
		for (const record of records) {
			const target = record.target as Element;
			if (record.attributeName === 'src' && !target.hasAttribute('src')) {
				removals.push(target);
			}
		}
	});
	recorder.observe(document.body, {
		attributeFilter: ['src'],
		attributes: true,
		subtree: true,
	});
	const stop = watchGatedIframes(watched, () => {
		/* the chunk is not under test here */
	});
	return {
		removals,
		stop: () => {
			stop();
			recorder.disconnect();
		},
	};
};

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

	test('an invalid data-category stays blocked and warns once the blocker loads', async () => {
		const reasons: unknown[] = [];
		const onRejection = (event: PromiseRejectionEvent) => {
			reasons.push(event.reason);
			event.preventDefault();
		};
		window.addEventListener('unhandledrejection', onRejection);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
			/* asserted below */
		});
		try {
			await renderProvider(policyFixture({ marketing: true }));
			const iframe = insertFrame({
				'data-category': 'not-a-category',
				sandbox: '',
				src: FRAME_URL,
			});
			await vi.waitFor(() =>
				expect(warn).toHaveBeenCalledWith(
					expect.stringContaining('invalid data-category "not-a-category"')
				)
			);
			expect(iframe.getAttribute('src')).toBeNull();
			expect(reasons).toEqual([]);
		} finally {
			warn.mockRestore();
			window.removeEventListener('unhandledrejection', onRejection);
		}
	});
});

describe('frames the watcher holds before the blocker loads', () => {
	test('holds a frame whose vendor the visitor turned off, though no one declared it yet', async () => {
		const watch = watchAndRecord(kernelWithVendorChoice(['youtube']));
		const iframe = insertFrame({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			sandbox: '',
			src: FRAME_URL,
		});
		await sleep(20);
		watch.stop();

		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(FRAME_URL);
	});

	test('holds a frame added in the same batch as a node page script cannot read', async () => {
		const watch = watchAndRecord(kernelWithVendorChoice(['youtube']));
		// Firefox throws this for some nodes, such as ones an extension inserted.
		const unreadable = document.createElement('div');
		Object.defineProperty(unreadable, 'nodeType', {
			get() {
				throw new Error('Permission denied to access property "nodeType"');
			},
		});
		const iframe = document.createElement('iframe');
		iframe.setAttribute('data-category', 'marketing');
		iframe.setAttribute('data-vendor', 'youtube');
		iframe.setAttribute('sandbox', '');
		iframe.setAttribute('src', FRAME_URL);
		document.body.append(unreadable, iframe);
		await sleep(20);
		watch.stop();
		unreadable.remove();

		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(FRAME_URL);
	});

	test('holds a frame added in the same batch as an iframe page script cannot read', async () => {
		const watch = watchAndRecord(kernelWithVendorChoice(['youtube']));
		const unreadable = document.createElement('iframe');
		unreadable.setAttribute('data-category', 'marketing');
		Object.defineProperty(unreadable, 'getAttribute', {
			value() {
				throw new Error('Permission denied to access property "getAttribute"');
			},
		});
		const iframe = document.createElement('iframe');
		iframe.setAttribute('data-category', 'marketing');
		iframe.setAttribute('data-vendor', 'youtube');
		iframe.setAttribute('sandbox', '');
		iframe.setAttribute('src', FRAME_URL);
		document.body.append(unreadable, iframe);
		await sleep(20);
		watch.stop();
		unreadable.remove();

		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(FRAME_URL);
	});

	test('holds a frame with an empty data-category', async () => {
		const watch = watchAndRecord(kernelWithVendorChoice([]));
		const iframe = insertFrame({
			'data-category': '',
			sandbox: '',
			src: FRAME_URL,
		});
		await sleep(20);
		watch.stop();

		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(FRAME_URL);
	});

	test('holds a vendor-only frame the visitor turned off', async () => {
		const watch = watchAndRecord(kernelWithVendorChoice(['youtube']));
		const iframe = insertFrame({
			'data-vendor': 'youtube',
			sandbox: '',
			src: FRAME_URL,
		});
		await sleep(20);
		watch.stop();

		expect(iframe.getAttribute('src')).toBeNull();
		expect(iframe.getAttribute('data-src')).toBe(FRAME_URL);
	});

	test('leaves an allowed vendor-only frame loading', async () => {
		const watch = watchAndRecord(kernelWithVendorChoice(['other-vendor']));
		const iframe = insertFrame({
			'data-vendor': 'youtube',
			sandbox: '',
			src: FRAME_URL,
		});
		await sleep(20);
		watch.stop();

		expect(iframe.getAttribute('src')).toBe(FRAME_URL);
		expect(watch.removals).toEqual([]);
	});

	test('leaves a frame alone when a disabled declaration lifts a stale denial', async () => {
		const watch = watchAndRecord(
			kernelWithVendorChoice(['youtube'], {
				declared: [
					{
						category: 'marketing',
						disabled: true,
						id: 'youtube',
						presentable: false,
						source: 'config',
					},
				],
				listVersion: null,
			})
		);
		const iframe = insertFrame({
			'data-vendor': 'youtube',
			sandbox: '',
			src: FRAME_URL,
		});
		await sleep(20);
		watch.stop();

		expect(iframe.getAttribute('src')).toBe(FRAME_URL);
		expect(watch.removals).toEqual([]);
	});

	test('ignores vendor denials in IAB mode', async () => {
		const base = kernelWithVendorChoice(['youtube']);
		const iab: ConsentKernel = {
			...base,
			getSnapshot: () => ({ ...base.getSnapshot(), model: 'iab' }),
		};
		const watch = watchAndRecord(iab);
		const iframe = insertFrame({
			'data-category': 'marketing',
			'data-vendor': 'youtube',
			sandbox: '',
			src: FRAME_URL,
		});
		await sleep(20);
		watch.stop();

		expect(iframe.getAttribute('src')).toBe(FRAME_URL);
		expect(watch.removals).toEqual([]);
	});
});
