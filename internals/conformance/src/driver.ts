/**
 * Framework-agnostic test driver.
 *
 * Each framework package implements this interface once; the conformance
 * suites consume it to exercise behavior without knowing whether the
 * underlying UI is React, Next.js, Svelte, Vue, or Solid.
 *
 * The driver's job is to own the framework-specific rendering lifecycle
 * and expose a uniform surface for the suites to interact with.
 */

export type SupportedFramework =
	| 'react'
	| 'nextjs'
	| 'tanstack-start'
	| 'svelte'
	| 'vue'
	| 'solid';

/**
 * Component kinds the driver can mount. Keys map 1:1 with our prebuilt UI
 * packages; adding a new component means extending this union everywhere
 * (on purpose — the contract should be explicit).
 */
export type MountableComponent =
	| 'consent-banner'
	| 'consent-dialog'
	| 'consent-widget'
	| 'iab-consent-banner'
	| 'iab-consent-dialog';

/**
 * Shapes the resolved-policy fixture a driver builds for a mount. Drivers
 * that hardcode an opt-in policy fixture extend it with these fields; stub
 * drivers throw `DriverNotImplementedError` so suites degrade to todo.
 */
export interface MountPolicyOptions {
	/**
	 * Consent model of the policy fixture. Defaults to the driver's existing
	 * `'opt-in'` fixture.
	 */
	model?: 'opt-in' | 'opt-out';
	/**
	 * Mirrors `policy.consent.gpc` — whether the policy respects the Global
	 * Privacy Control signal (core only honors GPC when the active policy
	 * opts in).
	 */
	respectGpc?: boolean;
}

export interface MountOptions {
	component: MountableComponent;
	/**
	 * Controls how the provider receives its initial policy data.
	 * - authoritative: current behavior, first render has authoritative data.
	 * - pending: no authoritative init data yet; driver exposes resolveInit.
	 * - failing: init rejects and the runtime must fall back safely.
	 */
	initMode?: 'authoritative' | 'pending' | 'failing';
	/**
	 * Simulate the Global Privacy Control signal for this mount. Drivers
	 * apply it through their framework's real GPC path (stubbing
	 * `navigator.globalPrivacyControl` before init for runtimes that read
	 * the browser signal, or the public `overrides.gpc` / kernel
	 * `initialOverrides.gpc` input for adapters that receive GPC from the
	 * embedding app/server). Drivers that cannot honor the option must
	 * throw `DriverNotImplementedError`.
	 */
	gpc?: boolean;
	/**
	 * Enable the framework's public persistence path for this mount
	 * (storage hydration on mount + storage writes on save). Defaults to
	 * each driver's isolated no-persistence behavior. Drivers that cannot
	 * honor the option must throw `DriverNotImplementedError`.
	 */
	persistence?: boolean;
	/** Policy fixture shaping. See {@link MountPolicyOptions}. */
	policy?: MountPolicyOptions;
	/**
	 * Options passed to the framework provider. The shape mirrors each
	 * framework's provider options (built on `KernelConfig` from
	 * `@c15t/core`) — we reference it loosely (`unknown`) so this package
	 * stays zero-import on runtime framework code.
	 */
	providerOptions?: unknown;
	/** Optional initial store state for test isolation. */
	initialState?: unknown;
	/** Locale override, applied before first render. */
	locale?: string;
}

export interface MountResult {
	/** Root element the component was rendered into. */
	root: HTMLElement;
	/**
	 * Present only for `initMode: 'pending'`. Resolves the driver's deferred
	 * transport init and waits for the framework scheduler to settle.
	 */
	resolveInit?: () => Promise<void>;
	/** Tear down the component, remove listeners, detach from DOM. */
	unmount: () => void | Promise<void>;
}

/**
 * Minimal store surface the suites rely on. Drivers project the kernel
 * snapshot (`kernel.getSnapshot()`) into this shape and forward
 * `kernel.subscribe`; nothing mutable is exposed so suites mutate only
 * through user-facing actions.
 */
export interface DriverStore {
	getState: () => Record<string, unknown>;
	subscribe: (listener: () => void) => () => void;
}

export interface TestDriver {
	readonly framework: SupportedFramework;

	/**
	 * Mount a component into a fresh DOM container. The driver owns the
	 * container lifecycle and must clean up in `unmount`.
	 */
	mount: (opts: MountOptions) => Promise<MountResult>;

	/** Access the active consent store after `mount`. */
	getStore: () => DriverStore;

	/**
	 * Server-render the component to HTML. Used by the SSR conformance suite.
	 * If the framework binding has no SSR support yet, throw — the suite
	 * will skip gracefully.
	 */
	serverRender: (opts: MountOptions) => Promise<string>;
}

/**
 * Default sentinel thrown by stub drivers so the suites can detect
 * "not-implemented-yet" and emit `test.todo` instead of real failures.
 */
export class DriverNotImplementedError extends Error {
	constructor(framework: SupportedFramework, capability: string) {
		super(
			`[${framework}] driver does not yet implement: ${capability}. This is expected for stub frameworks; add an implementation when the binding comes online.`
		);
		this.name = 'DriverNotImplementedError';
	}
}
