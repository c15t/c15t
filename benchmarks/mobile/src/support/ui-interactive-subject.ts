/**
 * The banner mounts the interactivity measurements run in, in a process of their own.
 *
 * Spawned rather than called because the package caches one consent client per
 * process: `getConsentClient()` hands back whatever the first provider attached to,
 * so a UI measurement that runs after any other one in the same process would render
 * a banner against an earlier scenario's consent state and time that instead. A fresh
 * process is also the only honest place for the cold mount, which is a launch number.
 *
 * Spawned by `measure/ui-interactive.ts`.
 */

import { median } from '@c15t/benchmarking/utils';
import {
	C15tProvider,
	ConsentBanner,
	ConsentClientContext,
	createConsentClient,
} from '@c15t/react-native';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

import { ensureReactGlobalForDist } from './ensure-react-global';
import { ensureReactNativeGlobals } from './ensure-react-native-globals';
import { installBenchNativeModule } from './fake-native';
import { buildSnapshot } from './fixtures';
import type { BenchSnapshot } from './fixtures';
import {
	NativeEventEmitter,
	emitNativeEvent,
	resetNativeStub,
	setNativeModule,
} from './react-native-stub';

// react-test-renderer only permits `act` when the environment says a test drives it.
(
	globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Name the native cores register the TurboModule under. */
const MODULE_NAME = 'C15t';

/** The English label the fixture ships for the primary action. */
const ACCEPT_LABEL = 'Accept all';

/** `act` passes `settle` is allowed before it gives up. */
const MAX_SETTLE_TICKS = 8;

/**
 * Whether a rendered element is a control the subject could use right now.
 *
 * Host elements only. `findAll` walks function components too, and `ConsentButton`
 * carries the same `onPress` as the control it renders, so counting every match
 * would report each button three times.
 *
 * @param node - One rendered element.
 * @returns `true` when it is a rendered control with a press handler that is not
 * disabled.
 */
const isLiveControl = function isLiveControl(node: ReactTestInstance): boolean {
	return (
		typeof node.type === 'string' &&
		typeof node.props.onPress === 'function' &&
		node.props.disabled !== true
	);
};

/**
 * The controls a rendered tree exposes right now.
 *
 * @param tree - Rendered tree.
 * @returns Every element with a live press handler.
 */
const liveControls = function liveControls(
	tree: ReactTestRenderer
): ReactTestInstance[] {
	return tree.root.findAll(isLiveControl);
};

/**
 * The primary action, by the label a screen reader would announce.
 *
 * @param tree - Rendered tree.
 * @returns The control, or `undefined` when the banner is not showing it.
 */
const acceptControl = function acceptControl(
	tree: ReactTestRenderer
): ReactTestInstance | undefined {
	return liveControls(tree).find(
		(node) => node.props.accessibilityLabel === ACCEPT_LABEL
	);
};

const nowNs = function nowNs(): number {
	return Number(process.hrtime.bigint());
};

const millisSince = function millisSince(startedAt: number): number {
	return Number(((nowNs() - startedAt) / 1e6).toFixed(3));
};

/**
 * Let queued work run, the way a frame would.
 *
 * A macrotask rather than a microtask, because `useModalA11y` focuses the sheet
 * through `requestAnimationFrame`, and the host substitute runs on a timer.
 */
const flushFrame = async function flushFrame(): Promise<void> {
	await act(async () => {
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
	});
};

/**
 * Settle the tree until it has the controls the scenario is waiting for.
 *
 * @param tree - Rendered tree.
 * @param minControls - Controls that must be there, or 0 for "gone".
 * @returns Ticks spent, so a row can show the frames the surface needed.
 */
const settle = async function settle(
	tree: ReactTestRenderer,
	minControls: number
): Promise<number> {
	let ticks = 0;
	for (; ticks < MAX_SETTLE_TICKS; ticks += 1) {
		const count = liveControls(tree).length;
		// 0 means the sheet has to be gone, which an "at least" cannot express.
		if (minControls === 0 ? count === 0 : count >= minControls) {
			return ticks;
		}
		// eslint-disable-next-line no-await-in-loop
		await flushFrame();
	}
	return ticks;
};

/**
 * Render the banner the way an app does, through the provider.
 *
 * @param client - Client to publish, or `undefined` to let the provider attach one.
 * @returns The rendered tree.
 */
const mountBanner = function mountBanner(
	client?: ReturnType<typeof createConsentClient>
): ReactTestRenderer {
	const banner = createElement(
		C15tProvider,
		null,
		createElement(ConsentBanner)
	);
	const element =
		client === undefined
			? banner
			: createElement(ConsentClientContext.Provider, { value: client }, banner);

	let rendered: ReactTestRenderer | undefined;
	act(() => {
		rendered = create(element);
	});

	if (rendered === undefined) {
		throw new Error('the banner did not mount');
	}
	return rendered;
};

/** A snapshot that owes a choice, ready to be served. */
const owedSnapshot = function owedSnapshot(base: BenchSnapshot): BenchSnapshot {
	return {
		...base,
		activeUI: 'banner',
		policyPending: false,
		promptRequirement: { kind: 'choice', reason: 'missing' },
		ready: true,
		revision: base.revision + 1,
	};
};

/** A snapshot that owes nothing: the app is open, the banner is not. */
const quietSnapshot = function quietSnapshot(
	base: BenchSnapshot
): BenchSnapshot {
	return {
		...base,
		activeUI: 'none',
		policyPending: false,
		promptRequirement: { kind: 'none', reason: 'standing' },
		ready: true,
	};
};

/** The event payload the core sends: a revision, not a snapshot. */
const revisionEvent = function revisionEvent(revision: number): string {
	return JSON.stringify({ revision });
};

/**
 * A fake module and a client attached to it, as one unit.
 *
 * The events surface is the stub's real emitter, not a no-op. A client that
 * subscribes to nothing never hears the snapshot event, and a banner that never
 * hears it never opens, which would read as a slow UI rather than a missing
 * subscription.
 *
 * @param initial - Snapshot the module serves.
 * @returns The module and a client that reads it.
 */
const attachClient = function attachClient(initial: BenchSnapshot) {
	const native = installBenchNativeModule(
		MODULE_NAME,
		setNativeModule,
		initial
	);
	return {
		client: createConsentClient(
			native as never,
			{
				addListener: (
					eventName: string,
					listener: (payload: unknown) => void
				) => new NativeEventEmitter(native).addListener(eventName, listener),
			} as never
		),
		native,
	};
};

export interface UiInteractiveResult {
	/** First mount in the process, with the provider's own attach underneath it. */
	coldMountMs: number;
	/** Warm mount to a live control, median of `samples` mounts. */
	mountMs: number;
	/** Core says a prompt is owed to a live control, single span. */
	openMs: number;
	/** Tap to the module holding the intent and the queue drained. */
	actionToCommitMs: number;
	/** Live controls the interactive banner exposed. */
	controls: number;
	/** Live controls left after the accepted tap, which should be none. */
	controlsAfterAccept: number;
	/** Frames past the event's own turn that the sheet needed before a tap. */
	openTicks: number;
	/** Warm mounts behind `mountMs`. */
	samples: number;
	unavailable?: string;
}

/**
 * Mount the real banner and time it to an actionable state, then print the result.
 *
 * @param iterations - Warm mounts to sample, after the one cold mount.
 * @returns The spans, also printed as the report the parent reads.
 */
export const measureUiInteractive = async function measureUiInteractive(
	iterations: number
): Promise<UiInteractiveResult> {
	const failed = function failed(unavailable: string): UiInteractiveResult {
		return {
			actionToCommitMs: 0,
			coldMountMs: 0,
			controls: 0,
			controlsAfterAccept: 0,
			mountMs: 0,
			openMs: 0,
			openTicks: 0,
			samples: 0,
			unavailable,
		};
	};

	ensureReactGlobalForDist();
	ensureReactNativeGlobals();

	// Cold: the first mount this process makes, through the provider, so the
	// handshake and the first render sit inside the number. It runs once, first,
	// so nothing later borrows its coldness.
	resetNativeStub();
	installBenchNativeModule(
		MODULE_NAME,
		setNativeModule,
		owedSnapshot(buildSnapshot())
	);

	const coldStart = nowNs();
	const cold = mountBanner();
	const coldMountMs = millisSince(coldStart);
	await settle(cold, 1);
	const coldControls = liveControls(cold).length;
	cold.unmount();

	if (coldControls === 0) {
		return failed(
			'the banner mounted without a live control, so the prompt the fixture owes was never rendered'
		);
	}

	// Warm: the same mount with the module loaded and the JIT up, against one
	// client, which is what a screen that shows a banner later costs an app.
	resetNativeStub();
	const warm = attachClient(owedSnapshot(buildSnapshot()));
	const warmSamples: number[] = [];
	let controls = coldControls;

	for (let index = 0; index < Math.max(1, iterations); index += 1) {
		// eslint-disable-next-line no-await-in-loop -- a mount must finish before the next begins.
		await flushFrame();

		const startedAt = nowNs();
		const tree = mountBanner(warm.client);
		const elapsed = millisSince(startedAt);
		// eslint-disable-next-line no-await-in-loop -- see the frame above.
		await settle(tree, 1);
		controls = liveControls(tree).length;
		tree.unmount();

		if (controls === 0) {
			warm.client.dispose();
			return failed(
				'a warm mount lost the banner the cold mount rendered, so the median would describe nothing'
			);
		}
		warmSamples.push(elapsed);
	}
	warm.client.dispose();

	// The policy resolves after first paint: the app is open, nothing is owed,
	// then one native event makes a banner the subject can act on.
	resetNativeStub();
	const late = attachClient(quietSnapshot(buildSnapshot()));
	const quietTree = mountBanner(late.client);
	const quietControls = await settle(quietTree, 0);

	if (liveControls(quietTree).length !== 0) {
		quietTree.unmount();
		late.client.dispose();
		return failed(
			`the banner rendered ${String(quietControls)} live control(s) while the snapshot owed no prompt, so the open span would start from a sheet that was already painted`
		);
	}

	const next = owedSnapshot(late.native.current());
	const openStart = nowNs();
	// The client handles an event on a promise, so the span awaits that turn inside
	// `act`. Left out, React commits the render after `act` resolves and the number
	// measures a `setTimeout(0)` instead of a render.
	await act(async () => {
		late.native.push(next);
		emitNativeEvent('snapshot', revisionEvent(next.revision));
		await Promise.resolve();
		await Promise.resolve();
	});
	const openTicks = await settle(quietTree, 1);
	const openMs = millisSince(openStart);

	if (liveControls(quietTree).length === 0) {
		quietTree.unmount();
		late.client.dispose();
		return failed(
			'the banner never appeared after the snapshot event, so there was no interactive moment to time'
		);
	}

	const accept = acceptControl(quietTree);
	if (accept === undefined) {
		quietTree.unmount();
		late.client.dispose();
		return failed(
			`no control announced "${ACCEPT_LABEL}", so the tap had no target`
		);
	}

	// The banner swallows the commit promise, so the span ends where an app can
	// observe it: the module holds the intent and the queue has drained.
	const intentsBefore = late.native.commitIntents.length;
	const pressStart = nowNs();
	await act(async () => {
		(accept.props.onPress as () => void)();
		await Promise.resolve();
		await Promise.resolve();
	});
	const actionToCommitMs = millisSince(pressStart);

	if (late.native.commitIntents.length === intentsBefore) {
		quietTree.unmount();
		late.client.dispose();
		return failed(
			'the tap reached neither the module nor the queue, so the span timed nothing'
		);
	}

	const controlsAfterAccept = liveControls(quietTree).length;
	quietTree.unmount();
	late.client.dispose();

	const report: UiInteractiveResult = {
		actionToCommitMs,
		coldMountMs,
		controls,
		controlsAfterAccept,
		mountMs: Number(median(warmSamples).toFixed(3)),
		openMs,
		openTicks,
		samples: warmSamples.length,
	};

	process.stdout.write(JSON.stringify(report));
	return report;
};

const iterations = Number(process.argv[2] ?? '40');
if (!Number.isFinite(iterations) || iterations < 1) {
	process.stderr.write(
		`ui iterations must be a positive number of mounts, got ${String(process.argv[2])}\n`
	);
	process.exit(1);
}

await measureUiInteractive(iterations);
