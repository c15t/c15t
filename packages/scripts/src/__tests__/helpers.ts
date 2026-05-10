import { afterEach, beforeEach, expect, vi } from 'vitest';
import {
	type BuiltInScriptIntegrationKey,
	builtInScriptIntegrations,
} from '../registry';

export type TestGlobal = typeof globalThis & Record<string, unknown>;

export interface HelperScriptSnapshot {
	id: string;
	category: unknown;
	alwaysLoad?: boolean;
	persistAfterConsentRevoked?: boolean;
	src?: string;
}

export interface ExpectedScriptSnapshot {
	alwaysLoad: boolean | undefined;
	persistAfterConsentRevoked: boolean | undefined;
	src: string;
}

export const deniedConsentState = {
	necessary: true,
	functionality: false,
	measurement: false,
	marketing: false,
	experience: false,
};

export const grantedMeasurementConsentState = {
	necessary: true,
	functionality: false,
	measurement: true,
	marketing: false,
	experience: false,
};

export function getTestGlobal(): TestGlobal {
	return globalThis as TestGlobal;
}

export function setupScriptHelperTest(): void {
	beforeEach(() => {
		setupMockBrowser();
	});

	afterEach(() => {
		cleanupMockBrowser();
	});
}

export function expectScriptMatchesIntegration(
	key: BuiltInScriptIntegrationKey,
	script: HelperScriptSnapshot,
	expected: ExpectedScriptSnapshot
): void {
	let integration: (typeof builtInScriptIntegrations)[number] | undefined;
	for (const entry of builtInScriptIntegrations) {
		if (entry.key === key) {
			integration = entry;
			break;
		}
	}

	expect(integration, key).toBeDefined();
	if (!integration) {
		return;
	}

	expect(script.id, key).toBe(integration.vendor);
	expect(script.category, key).toBe(integration.consentCategory);
	expect(script.alwaysLoad, key).toBe(expected.alwaysLoad);
	expect(script.persistAfterConsentRevoked, key).toBe(
		expected.persistAfterConsentRevoked
	);
	expect(script.src, key).toBe(expected.src);
}

export function toArgumentsArray(value: unknown): unknown[] {
	return Array.prototype.slice.call(value);
}

function setupMockBrowser() {
	const globalRef = getTestGlobal();
	const scriptAnchor = {
		parentNode: {
			insertBefore: vi.fn((node: Record<string, unknown>) => node),
		},
	};

	const document = {
		head: {
			appendChild: vi.fn((node: Record<string, unknown>) => node),
		},
		createElement: vi.fn((_tag: string) => ({
			textContent: '',
			async: false,
			defer: false,
			setAttribute: vi.fn(),
		})),
		getElementsByTagName: vi.fn(() => [scriptAnchor]),
	};

	vi.stubGlobal('window', globalRef as unknown as Window & typeof globalThis);
	vi.stubGlobal('document', document as unknown as Document);
}

function cleanupMockBrowser() {
	const globalRef = getTestGlobal();
	vi.unstubAllGlobals();
	delete globalRef.dataLayer;
	delete globalRef.gtag;
	delete globalRef.posthog;
	delete globalRef.databuddy;
	delete globalRef.databuddyConfig;
	delete globalRef.ttq;
	delete globalRef.twq;
	delete globalRef._linkedin_partner_id;
	delete globalRef._linkedin_data_partner_ids;
	delete globalRef.uetq;
	delete globalRef.fbq;
	delete globalRef._fbq;
}
