import type { ConsentState, Script } from 'c15t';
import type { ManifestStep, ResolvedManifest } from '../types';

/**
 * Callback info passed to Script lifecycle hooks.
 * Mirrors the ScriptCallbackInfo type from c15t core
 * (which isn't exported from the public API).
 */
interface CallbackInfo {
	id: string;
	elementId: string;
	hasConsent: boolean;
	consents: ConsentState;
	element?: HTMLScriptElement;
	error?: Error;
}

function executeStep(step: ManifestStep): void {
	const win = window as unknown as Record<string, unknown>;

	switch (step.type) {
		case 'setGlobal': {
			const shouldSet = step.ifUndefined !== false;
			if (shouldSet && win[step.name] !== undefined) {
				break;
			}

			if (Array.isArray(step.value)) {
				win[step.name] = [...(step.value as unknown[])];
			} else if (step.value !== null && typeof step.value === 'object') {
				win[step.name] = { ...(step.value as Record<string, unknown>) };
			} else {
				win[step.name] = step.value;
			}
			break;
		}

		case 'callGlobal': {
			const target = win[step.global];
			if (!target) {
				break;
			}

			if (step.method) {
				const objectTarget = target as Record<
					string,
					(...args: unknown[]) => unknown
				>;
				const method = objectTarget[step.method];
				if (typeof method === 'function') {
					method(...(step.args ?? []));
				}
			} else if (typeof target === 'function') {
				(target as (...args: unknown[]) => unknown)(...(step.args ?? []));
			}
			break;
		}

		case 'pushToDataLayer': {
			const dataLayer = win.dataLayer;
			if (Array.isArray(dataLayer)) {
				dataLayer.push(step.data);
			}
			break;
		}

		case 'inlineScript': {
			const scriptElement = document.createElement('script');
			scriptElement.textContent = step.code;
			document.head.appendChild(scriptElement);
			break;
		}

		case 'loadScript': {
			break;
		}
	}
}

function executeSteps(steps: ManifestStep[]): void {
	for (const step of steps) {
		executeStep(step);
	}
}

function mapConsentState(
	mapping: Record<string, string[]>,
	consents: ConsentState
): Record<string, 'granted' | 'denied'> {
	const result: Record<string, 'granted' | 'denied'> = {};

	for (const [c15tCategory, vendorTypes] of Object.entries(mapping)) {
		const isGranted = (consents as Record<string, boolean>)[c15tCategory];
		for (const vendorType of vendorTypes) {
			result[vendorType] = isGranted ? 'granted' : 'denied';
		}
	}

	return result;
}

function signalConsent(
	resolvedManifest: ResolvedManifest,
	mode: 'default' | 'update',
	consents: ConsentState
): void {
	if (!resolvedManifest.consentMapping || !resolvedManifest.consentSignal) {
		return;
	}

	const mapped = mapConsentState(resolvedManifest.consentMapping, consents);
	const win = window as unknown as Record<string, unknown>;

	switch (resolvedManifest.consentSignal) {
		case 'gtag': {
			const target = resolvedManifest.consentSignalTarget ?? 'gtag';
			const gtagFn = win[target];
			if (typeof gtagFn === 'function') {
				(gtagFn as (...args: unknown[]) => void)('consent', mode, mapped);
			}
			break;
		}
	}
}

export function resolvedManifestToScript(
	resolvedManifest: ResolvedManifest
): Script {
	const hasConsentMapping = !!(
		resolvedManifest.consentMapping && resolvedManifest.consentSignal
	);
	const hasConsentLifecycle = !!(
		resolvedManifest.onConsentChangeSteps.length > 0 ||
		resolvedManifest.onConsentGrantedSteps.length > 0 ||
		resolvedManifest.onConsentDeniedSteps.length > 0 ||
		hasConsentMapping
	);

	const script: Script = {
		id: resolvedManifest.vendor,
		category: resolvedManifest.category as Script['category'],
		alwaysLoad: resolvedManifest.alwaysLoad,
		persistAfterConsentRevoked: resolvedManifest.persistAfterConsentRevoked,
		callbackOnly:
			!resolvedManifest.loadScript && resolvedManifest.textContent === undefined
				? true
				: undefined,
		src: resolvedManifest.loadScript?.src,
		async: resolvedManifest.loadScript?.async,
		defer: resolvedManifest.loadScript?.defer,
		attributes: resolvedManifest.loadScript?.attributes,
		textContent: resolvedManifest.textContent,
	};

	if (
		resolvedManifest.bootstrapSteps.length > 0 ||
		resolvedManifest.setupSteps.length > 0 ||
		hasConsentMapping
	) {
		script.onBeforeLoad = (info: CallbackInfo) => {
			if (resolvedManifest.bootstrapSteps.length > 0) {
				executeSteps(resolvedManifest.bootstrapSteps);
			}

			if (hasConsentMapping) {
				signalConsent(resolvedManifest, 'default', info.consents);
			}

			if (resolvedManifest.setupSteps.length > 0) {
				executeSteps(resolvedManifest.setupSteps);
			}
		};
	}

	if (resolvedManifest.afterLoadSteps.length > 0) {
		script.onLoad = () => {
			executeSteps(resolvedManifest.afterLoadSteps);
		};
	}

	if (hasConsentLifecycle) {
		script.onConsentChange = (info: CallbackInfo) => {
			if (hasConsentMapping) {
				signalConsent(resolvedManifest, 'update', info.consents);
			}

			if (resolvedManifest.onConsentChangeSteps.length > 0) {
				executeSteps(resolvedManifest.onConsentChangeSteps);
			}

			if (
				info.hasConsent &&
				resolvedManifest.onConsentGrantedSteps.length > 0
			) {
				executeSteps(resolvedManifest.onConsentGrantedSteps);
			} else if (
				!info.hasConsent &&
				resolvedManifest.onConsentDeniedSteps.length > 0
			) {
				executeSteps(resolvedManifest.onConsentDeniedSteps);
			}
		};
	}

	return script;
}
