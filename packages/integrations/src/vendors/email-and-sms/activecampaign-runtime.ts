import type { Script, ScriptCallbackInfo } from '@c15t/core';

interface TrackingConfig {
	accountId: string;
	email: string | undefined;
	scriptUrl: string;
}

interface Registration {
	config: TrackingConfig;
	info: ScriptCallbackInfo;
	script: Script;
}

interface Runtime {
	config?: TrackingConfig;
	element: HTMLScriptElement;
	status: 'waiting' | 'pending' | 'loaded' | 'error';
	command?: Window['pgo'];
	email?: string;
	allowed: boolean;
}

interface TrackingState {
	document: Document;
	registrations: Map<symbol, Registration>;
	runtime?: Runtime;
	scheduled: boolean;
	problem?: string;
}

// Diffuser leaves its singleton and services running even if its tag is removed.
const states = new WeakMap<Document, TrackingState>();

const reportProblem = (state: TrackingState, problem: string): void => {
	if (state.problem !== problem) {
		console.error(`activeCampaignTracking: ${problem}`);
		state.problem = problem;
	}
};

const permittedRegistration = (
	state: TrackingState
): Registration | undefined => {
	const registrations = [...state.registrations.values()];
	const [first] = registrations;
	if (!first || registrations.some(({ info }) => !info.hasConsent)) {
		return;
	}
	const { accountId, email, scriptUrl } = first.config;
	if (
		registrations.some(
			({ config }) =>
				config.accountId !== accountId ||
				config.scriptUrl !== scriptUrl ||
				config.email !== email
		)
	) {
		reportProblem(state, 'conflicting registrations; use one configuration');
		return;
	}
	const { config: mounted } = state.runtime ?? {};
	if (
		mounted &&
		(mounted.accountId !== accountId || mounted.scriptUrl !== scriptUrl)
	) {
		reportProblem(state, 'changing accountId or scriptUrl requires a new page');
		return;
	}
	return first;
};

const start = (state: TrackingState, beforeAppend = false): void => {
	const { runtime, document } = state;
	if (!runtime || runtime.status !== 'waiting') {
		return;
	}
	const registration = permittedRegistration(state);
	if (!registration || (!beforeAppend && !runtime.element.isConnected)) {
		return;
	}
	const browser = document.defaultView;
	const { config, info, script } = registration;
	const { element } = runtime;
	const expectedUrl = new URL(config.scriptUrl, document.baseURI).href;
	if (
		!browser ||
		browser.pgo !== undefined ||
		browser.prismGlobalObjectAlias !== undefined ||
		Reflect.has(browser, 'visitorGlobalObjectAlias') ||
		Reflect.has(browser, 'visitorGlobalObject') ||
		[...document.scripts].some(
			(existing) => existing !== element && existing.src === expectedUrl
		)
	) {
		runtime.status = 'error';
		reportProblem(
			state,
			'an unmanaged tracker exists; remove the original snippet'
		);
		return;
	}
	runtime.config = config;
	runtime.status = 'pending';
	script.onBeforeLoad?.({ ...info, element });
	element.src = config.scriptUrl;
};

const reconcile = (state: TrackingState): void => {
	start(state);
	const { runtime } = state;
	if (!runtime || runtime.status !== 'loaded') {
		return;
	}
	const { command } = runtime;
	if (
		!runtime.element.isConnected ||
		state.document.defaultView?.pgo !== command ||
		!command
	) {
		runtime.status = 'error';
		reportProblem(state, 'tracker ownership was lost; reload the page');
		return;
	}
	const permitted = permittedRegistration(state);
	if (!permitted) {
		if (
			runtime.allowed &&
			[...state.registrations.values()].some(({ info }) => !info.hasConsent)
		) {
			// Diffuser cannot revoke allowTracking. A regrant must use a new page.
			runtime.status = 'error';
			reportProblem(
				state,
				'tracking permission was lost; reload the page to stop the running SDK'
			);
		}
		return;
	}
	const { email } = permitted.config;
	if (runtime.email !== email) {
		command('setEmail', email ?? '');
		runtime.email = email;
	}
	if (!runtime.allowed) {
		command('process', 'allowTracking');
		runtime.allowed = true;
	}
};

const schedule = (state: TrackingState): void => {
	if (state.scheduled) {
		return;
	}
	state.scheduled = true;
	// Core replaces a registration with dispose + register in the same turn.
	// Reconcile the final options without treating that as a consent regrant.
	queueMicrotask(() => {
		state.scheduled = false;
		reconcile(state);
	});
};

/** Retain Diffuser's physical SDK while reconciling consent and email. @internal */
export const withActiveCampaignRuntime = (
	script: Script,
	config: TrackingConfig
): Script => {
	const standalone = Symbol('activecampaign-registration');
	const update = (info: ScriptCallbackInfo): TrackingState => {
		let state = states.get(document);
		if (!state) {
			state = { document, registrations: new Map(), scheduled: false };
			states.set(document, state);
		}
		state.registrations.set(info.registration ?? standalone, {
			config,
			info,
			script,
		});
		schedule(state);
		return state;
	};
	return {
		...script,
		observeConsentBeforeLoad: true,
		onBeforeLoad(info) {
			const state = update(info);
			const { element } = info;
			if (!element) {
				return;
			}
			// Core still creates the tag, applies CSP settings and observes completion.
			element.removeAttribute('src');
			if (state.runtime) {
				reportProblem(state, 'the owned SDK was replaced; reload the page');
				return;
			}
			state.runtime = { allowed: false, element, status: 'waiting' };
			start(state, true);
		},
		onConsentChange(info) {
			const state = update(info);
			if (info.element && state.runtime?.element !== info.element) {
				reportProblem(
					state,
					'an unmanaged tracker exists; remove the original snippet'
				);
			}
		},
		onDispose(info) {
			if (typeof document === 'undefined') {
				return;
			}
			const state = states.get(document);
			if (state) {
				state.registrations.delete(info.registration ?? standalone);
				schedule(state);
			}
		},
		onError() {
			const state = states.get(document);
			if (state?.runtime) {
				state.runtime.status = 'error';
				reportProblem(state, 'SDK failed to load; reload the page');
			}
		},
		onLoad(info) {
			const state = update(info);
			const { runtime } = state;
			const browser = document.defaultView;
			if (
				!runtime ||
				runtime.status === 'error' ||
				runtime.element !== info.element
			) {
				return;
			}
			if (
				!info.element?.isConnected ||
				typeof browser?.pgo !== 'function' ||
				browser.pgo.q
			) {
				runtime.status = 'error';
				reportProblem(state, 'SDK did not initialize; reload the page');
				return;
			}
			runtime.status = 'loaded';
			runtime.command ??= browser.pgo;
			reconcile(state);
		},
		persistAfterDispose: true,
		serverStart: undefined,
	};
};
