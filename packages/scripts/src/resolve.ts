import type { ConsentState, Script } from 'c15t';
import type {
	CallGlobalStep,
	InlineScriptStep,
	LoadScriptStep,
	ManifestStep,
	VendorManifest,
} from './types';

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

// ─────────────────────────────────────────────────────────────────────────────
// Template interpolation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interpolates `{{key}}` template variables in a string.
 */
function interpolateString(
	template: string,
	config: Record<string, unknown>
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
		const value = config[key];
		return value !== undefined ? String(value) : `{{${key}}}`;
	});
}

/**
 * Recursively interpolates template variables in any value.
 * Handles strings, arrays, and plain objects.
 */
function interpolateValue(
	value: unknown,
	config: Record<string, unknown>
): unknown {
	if (typeof value === 'string') {
		return interpolateString(value, config);
	}
	if (Array.isArray(value)) {
		return value.map((item) => interpolateValue(item, config));
	}
	if (value !== null && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			result[k] = interpolateValue(v, config);
		}
		return result;
	}
	return value;
}

/**
 * Interpolates template variables in all steps.
 */
function interpolateSteps(
	steps: ManifestStep[],
	config: Record<string, unknown>
): ManifestStep[] {
	return steps.map((step) => interpolateValue(step, config) as ManifestStep);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a single manifest step in the browser.
 */
function executeStep(step: ManifestStep): void {
	const win = window as unknown as Record<string, unknown>;

	switch (step.type) {
		case 'setGlobal': {
			const shouldSet = step.ifUndefined !== false;
			if (shouldSet && win[step.name] !== undefined) {
				break;
			}
			// Shallow-clone arrays and objects to avoid shared references
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
			if (!target) break;

			if (step.method) {
				const obj = target as Record<string, (...args: unknown[]) => unknown>;
				const method = step.method;
				if (typeof obj[method] === 'function') {
					obj[method](...(step.args ?? []));
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
			const scriptEl = document.createElement('script');
			scriptEl.textContent = step.code;
			document.head.appendChild(scriptEl);
			break;
		}

		case 'loadScript': {
			// loadScript steps are extracted by resolveManifest as the Script's src.
			// If executeStep is called with a loadScript, it's a no-op —
			// the script loader handles actual script injection.
			break;
		}
	}
}

/**
 * Executes an array of manifest steps sequentially.
 */
function executeSteps(steps: ManifestStep[]): void {
	for (const step of steps) {
		executeStep(step);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps c15t consent state to a vendor's consent type names using the consent mapping.
 *
 * Returns an object like:
 * ```
 * { ad_storage: 'granted', analytics_storage: 'denied', ... }
 * ```
 */
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

/**
 * Signals consent state to a vendor using their preferred consent API.
 */
function signalConsent(
	manifest: VendorManifest,
	mode: 'default' | 'update',
	consents: ConsentState
): void {
	if (!manifest.consentMapping || !manifest.consentSignal) return;

	const mapped = mapConsentState(manifest.consentMapping, consents);
	const win = window as unknown as Record<string, unknown>;

	switch (manifest.consentSignal) {
		case 'gtag': {
			const target = manifest.consentSignalTarget ?? 'gtag';
			const gtagFn = win[target];
			if (typeof gtagFn === 'function') {
				(gtagFn as (...args: unknown[]) => void)('consent', mode, mapped);
			}
			break;
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Manifest resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compiles a `VendorManifest` + config into a `Script` object.
 *
 * This is the bridge between the declarative manifest format and
 * the imperative Script interface that the script loader expects.
 *
 * - **Bundled path**: Called at import time with static config.
 * - **Embed path**: Called at runtime with config from `/init`.
 * - Both produce identical `Script` objects.
 */
export function resolveManifest(
	manifest: VendorManifest,
	config: Record<string, unknown> = {}
): Script {
	const resolvedInstall = interpolateSteps(manifest.install, config);

	// Extract the loadScript step for the Script's src
	const loadScriptStep = resolvedInstall.find(
		(s): s is LoadScriptStep => s.type === 'loadScript'
	);

	// If no loadScript, collect inlineScript steps as textContent
	const inlineScripts = !loadScriptStep
		? (resolvedInstall.filter(
				(s): s is InlineScriptStep => s.type === 'inlineScript'
			) as InlineScriptStep[])
		: [];

	// Setup steps: everything in install that isn't the loadScript or textContent inlineScripts
	const setupSteps = loadScriptStep
		? resolvedInstall.filter((s) => s.type !== 'loadScript')
		: resolvedInstall.filter((s) => s.type !== 'inlineScript');

	// Pre-resolve lifecycle steps
	const afterLoadSteps = manifest.afterLoad
		? interpolateSteps(manifest.afterLoad, config)
		: undefined;
	const onChangeSteps = manifest.onConsentChange
		? interpolateSteps(manifest.onConsentChange, config)
		: undefined;
	const onGrantedSteps = manifest.onConsentGranted
		? interpolateSteps(manifest.onConsentGranted, config)
		: undefined;
	const onDeniedSteps = manifest.onConsentDenied
		? interpolateSteps(manifest.onConsentDenied, config)
		: undefined;

	const hasConsentMapping = !!(
		manifest.consentMapping && manifest.consentSignal
	);
	const hasConsentLifecycle = !!(
		onChangeSteps ||
		onGrantedSteps ||
		onDeniedSteps ||
		hasConsentMapping
	);

	const script: Script = {
		id: manifest.vendor,
		category: manifest.category as Script['category'],
		alwaysLoad: manifest.alwaysLoad,
		persistAfterConsentRevoked: manifest.persistAfterConsentRevoked,

		// Script source — either external URL or inline code
		src: loadScriptStep?.src,
		async: loadScriptStep?.async,
		defer: loadScriptStep?.defer,
		attributes: loadScriptStep?.attributes,
		textContent:
			inlineScripts.length > 0
				? inlineScripts.map((s) => s.code).join('\n')
				: undefined,
	};

	// onBeforeLoad: run setup steps + consent defaults
	if (setupSteps.length > 0 || hasConsentMapping) {
		script.onBeforeLoad = (info: CallbackInfo) => {
			if (setupSteps.length > 0) {
				executeSteps(setupSteps);
			}
			// Set consent defaults before the script loads
			if (hasConsentMapping) {
				signalConsent(manifest, 'default', info.consents);
			}
		};
	}

	// onLoad: run after-load steps
	if (afterLoadSteps) {
		script.onLoad = () => {
			executeSteps(afterLoadSteps);
		};
	}

	// onConsentChange: signal consent + run lifecycle steps
	if (hasConsentLifecycle) {
		script.onConsentChange = (info: CallbackInfo) => {
			// Signal consent state to vendor's consent API
			if (hasConsentMapping) {
				signalConsent(manifest, 'update', info.consents);
			}

			// Run general onChange steps
			if (onChangeSteps) {
				executeSteps(onChangeSteps);
			}

			// Run granted/denied steps based on current consent
			if (info.hasConsent && onGrantedSteps) {
				executeSteps(onGrantedSteps);
			} else if (!info.hasConsent && onDeniedSteps) {
				executeSteps(onDeniedSteps);
			}
		};
	}

	return script;
}

/**
 * Applies user script overrides to a resolved Script, chaining callbacks.
 *
 * This preserves the manifest's behavior while allowing users to customize
 * any Script property via the `script?: Partial<Script>` option.
 */
export function applyScriptOverrides(
	resolved: Script,
	overrides: Partial<Script>
): Script {
	const {
		onBeforeLoad: overrideBeforeLoad,
		onLoad: overrideLoad,
		onError: overrideError,
		onConsentChange: overrideConsentChange,
		...staticOverrides
	} = overrides;

	const merged: Script = { ...resolved, ...staticOverrides };

	// Chain callbacks: manifest first, then user override
	if (overrideBeforeLoad) {
		const original = resolved.onBeforeLoad;
		merged.onBeforeLoad = (info) => {
			original?.(info);
			overrideBeforeLoad(info);
		};
	}

	if (overrideLoad) {
		const original = resolved.onLoad;
		merged.onLoad = (info) => {
			original?.(info);
			overrideLoad(info);
		};
	}

	if (overrideError) {
		const original = resolved.onError;
		merged.onError = (info) => {
			original?.(info);
			overrideError(info);
		};
	}

	if (overrideConsentChange) {
		const original = resolved.onConsentChange;
		merged.onConsentChange = (info: CallbackInfo) => {
			original?.(info);
			overrideConsentChange(info);
		};
	}

	return merged;
}
