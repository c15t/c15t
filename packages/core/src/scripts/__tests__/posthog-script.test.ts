import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadScripts, unloadScripts } from '../../libs/script-loader/core';
import type { ConsentState } from '../../types/compliance';
import { posthogConsent } from '../posthog';

// Mock posthog-js before importing
vi.mock('posthog-js', () => {
	return {
		default: {
			opt_in_capturing: vi.fn(),
			opt_out_capturing: vi.fn(),
		},
	};
});

// Get the mocked module
import posthog from 'posthog-js';

// Mock global objects that might be missing in the test environment
Object.defineProperty(global, 'location', {
	value: {
		href: 'https://example.com',
		hash: '',
		search: '',
		pathname: '/',
		protocol: 'https:',
		host: 'example.com',
		hostname: 'example.com',
		port: '',
		origin: 'https://example.com',
		assign: vi.fn(),
		replace: vi.fn(),
		reload: vi.fn(),
		toString: () => 'https://example.com',
		ancestorOrigins: {
			length: 0,
			item: () => null,
			[Symbol.iterator]: function* () {},
		},
	},
	writable: true,
});

describe('Posthog Script', () => {
	// Sample consent state for testing
	const consents: ConsentState = {
		necessary: true,
		functionality: true,
		marketing: false,
		measurement: true,
		experience: false,
	};

	// Mock document.createElement and other DOM methods
	const mockScriptElement = {
		id: '',
		src: '',
		addEventListener: vi.fn(),
		setAttribute: vi.fn(),
		remove: vi.fn(),
	};

	const mockHead = {
		appendChild: vi.fn(),
	};

	beforeEach(() => {
		// Mock document.createElement
		vi.spyOn(document, 'createElement').mockImplementation(() => {
			return { ...mockScriptElement } as unknown as HTMLScriptElement;
		});

		// Mock document.head
		Object.defineProperty(document, 'head', {
			value: mockHead,
			writable: true,
		});

		// Clear any scripts that might have been loaded in previous tests
		vi.spyOn(global, 'Map').mockImplementation(() => new Map());

		// Reset mocks
		vi.clearAllMocks();
	});

	it('should create a callback-only script', () => {
		const script = posthogConsent({});

		// Verify it's a callback-only script
		expect(script.callbackOnly).toBe(true);
		expect(script.src).toBeUndefined();
		expect(script.id).toBe('posthog-consent');
		expect(script.category).toBe('measurement');
	});

	it('should opt in to capturing when loaded', () => {
		const script = posthogConsent({});

		// Load the script
		loadScripts([script], consents);

		// Should not create a DOM element
		expect(document.createElement).not.toHaveBeenCalled();
		expect(document.head.appendChild).not.toHaveBeenCalled();

		// Should call opt_in_capturing
		expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
		expect(posthog.opt_out_capturing).not.toHaveBeenCalled();
	});

	it('should opt out of capturing when unloaded', () => {
		const script = posthogConsent({});

		// Load the script first
		loadScripts([script], consents);

		// Reset mocks
		vi.clearAllMocks();

		// Change consent state to revoke measurement consent
		const newConsents: ConsentState = {
			...consents,
			measurement: false,
		};

		// Unload the script
		unloadScripts([script], newConsents);

		// Should not interact with DOM elements
		expect(document.createElement).not.toHaveBeenCalled();
		expect(mockScriptElement.remove).not.toHaveBeenCalled();

		// Should call opt_out_capturing
		expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
		expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
	});

	it('should allow custom id and category', () => {
		const script = posthogConsent({
			script: {
				id: 'custom-posthog',
				category: 'marketing',
			},
		});

		// Verify custom properties
		expect(script.id).toBe('custom-posthog');
		expect(script.category).toBe('marketing');
		expect(script.callbackOnly).toBe(true);
	});
});
