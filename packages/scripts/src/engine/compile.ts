import type {
	LoadScriptStep,
	ManifestStep,
	ResolvedManifest,
	VendorManifest,
} from '../types';
import { VENDOR_MANIFEST_KIND, VENDOR_MANIFEST_SCHEMA_VERSION } from '../types';

const EXACT_PLACEHOLDER_PATTERN = /^\{\{([A-Za-z0-9_]+)\}\}$/;
const PLACEHOLDER_PATTERN = /\{\{([A-Za-z0-9_]+)\}\}/g;

function getConfigValue(config: Record<string, unknown>, key: string): unknown {
	if (!(key in config)) {
		throw new Error(`Missing manifest interpolation value for '${key}'.`);
	}

	const value = config[key];
	if (typeof value === 'function') {
		throw new Error(
			`Manifest interpolation value for '${key}' must be serializable.`
		);
	}

	return value;
}

function stringifyInterpolatedValue(value: unknown, key: string): string {
	if (value === undefined) {
		throw new Error(`Missing manifest interpolation value for '${key}'.`);
	}

	if (typeof value === 'string') {
		return value;
	}

	if (value === null) {
		return 'null';
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return String(value);
}

function interpolateString(
	template: string,
	config: Record<string, unknown>
): unknown {
	const exactMatch = template.match(EXACT_PLACEHOLDER_PATTERN);
	if (exactMatch) {
		return getConfigValue(config, exactMatch[1] as string);
	}

	return template.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
		const value = getConfigValue(config, key);
		return stringifyInterpolatedValue(value, key);
	});
}

export function interpolateValue(
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
		for (const [key, nestedValue] of Object.entries(value)) {
			const interpolated = interpolateValue(nestedValue, config);
			if (interpolated !== undefined) {
				result[key] = interpolated;
			}
		}
		return result;
	}

	return value;
}

function interpolateSteps(
	steps: ManifestStep[] | undefined,
	config: Record<string, unknown>
): ManifestStep[] {
	if (!steps) {
		return [];
	}

	return steps.map((step) => interpolateValue(step, config) as ManifestStep);
}

function extractInstallArtifacts(install: ManifestStep[]): {
	loadScript?: LoadScriptStep;
	setupSteps: ManifestStep[];
} {
	const loadScriptSteps = install.filter(
		(step): step is LoadScriptStep => step.type === 'loadScript'
	);

	if (loadScriptSteps.length > 1) {
		throw new Error(
			'Vendor manifests may only declare a single loadScript step in install.'
		);
	}

	if (loadScriptSteps.length === 1) {
		return {
			loadScript: loadScriptSteps[0],
			setupSteps: install.filter((step) => step.type !== 'loadScript'),
		};
	}

	return {
		setupSteps: install,
	};
}

function validateManifestContract(manifest: VendorManifest): void {
	if (manifest.kind !== VENDOR_MANIFEST_KIND) {
		throw new Error(
			`Unsupported manifest kind '${String(
				manifest.kind
			)}'. Expected '${VENDOR_MANIFEST_KIND}'.`
		);
	}

	if (manifest.schemaVersion !== VENDOR_MANIFEST_SCHEMA_VERSION) {
		throw new Error(
			`Unsupported manifest schema version '${String(
				manifest.schemaVersion
			)}'. Expected '${VENDOR_MANIFEST_SCHEMA_VERSION}'.`
		);
	}
}

export function compileManifest(
	manifest: VendorManifest,
	config: Record<string, unknown> = {}
): ResolvedManifest {
	validateManifestContract(manifest);

	const bootstrapSteps = interpolateSteps(manifest.bootstrap, config);
	const install = interpolateSteps(manifest.install, config);
	const { loadScript, setupSteps } = extractInstallArtifacts(install);

	return {
		kind: manifest.kind,
		schemaVersion: manifest.schemaVersion,
		vendor: manifest.vendor,
		category: interpolateValue(
			manifest.category,
			config
		) as ResolvedManifest['category'],
		alwaysLoad:
			manifest.alwaysLoad === undefined
				? undefined
				: (interpolateValue(manifest.alwaysLoad, config) as boolean),
		persistAfterConsentRevoked:
			manifest.persistAfterConsentRevoked === undefined
				? undefined
				: (interpolateValue(
						manifest.persistAfterConsentRevoked,
						config
					) as boolean),
		bootstrapSteps,
		setupSteps,
		loadScript,
		afterLoadSteps: interpolateSteps(manifest.afterLoad, config),
		onBeforeLoadGrantedSteps: interpolateSteps(
			manifest.onBeforeLoadGranted,
			config
		),
		onBeforeLoadDeniedSteps: interpolateSteps(
			manifest.onBeforeLoadDenied,
			config
		),
		onLoadGrantedSteps: interpolateSteps(manifest.onLoadGranted, config),
		onLoadDeniedSteps: interpolateSteps(manifest.onLoadDenied, config),
		onConsentChangeSteps: interpolateSteps(manifest.onConsentChange, config),
		onConsentGrantedSteps: interpolateSteps(manifest.onConsentGranted, config),
		onConsentDeniedSteps: interpolateSteps(manifest.onConsentDenied, config),
		consentMapping: manifest.consentMapping
			? (interpolateValue(
					manifest.consentMapping,
					config
				) as ResolvedManifest['consentMapping'])
			: undefined,
		consentSignal: manifest.consentSignal,
		consentSignalTarget:
			typeof manifest.consentSignalTarget === 'string'
				? (interpolateValue(manifest.consentSignalTarget, config) as string)
				: manifest.consentSignalTarget,
	};
}
