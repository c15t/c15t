import { afterEach, beforeEach, vi } from 'vitest';
import type { ConsentState } from '../../../types/compliance';
import { clearAllScripts } from '../core';

// Mock document.head for testing
export const mockHead = {
	appendChild: vi.fn(),
};

// Mock document.body for testing
export const mockBody = {
	appendChild: vi.fn(),
};

// Registry to track created elements for proper getElementById mocking
const createdElements: Map<string, HTMLElement> = new Map();

// Factory function to create mock script elements for testing
export function createMockScriptElement() {
	return {
		id: '',
		src: '',
		textContent: '',
		fetchPriority: undefined as 'high' | 'low' | 'auto' | undefined,
		async: false,
		defer: false,
		nonce: '',
		addEventListener: vi.fn(),
		setAttribute: vi.fn(),
		remove: vi.fn(),
	};
}

// Sample consent state for testing
export const sampleConsents: ConsentState = {
	necessary: true,
	functionality: true,
	marketing: false,
	measurement: true,
	experience: false,
};

/**
 * Sets up mocks for DOM manipulation in tests
 */
export function setupDomMocks() {
	// Save original createElement before mocking
	const originalCreateElement = document.createElement;

	// Mock document.createElement
	vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
		if (tagName === 'script') {
			const element = {
				...createMockScriptElement(),
			} as unknown as HTMLScriptElement;
			// Override the id property to track elements
			let elementId = '';
			Object.defineProperty(element, 'id', {
				set: function (value: string) {
					elementId = value;
					if (value) {
						createdElements.set(value, this as HTMLElement);
					}
				},
				get: () => elementId,
				configurable: true,
			});
			return element;
		}
		return originalCreateElement.call(document, tagName);
	});

	// Mock document.getElementById by adding it to the document object
	if (!document.getElementById) {
		(document as any).getElementById = vi
			.fn()
			.mockImplementation((id: string) => {
				// Return the actual element from our registry, or null if not found
				return createdElements.get(id) || null;
			});
	}

	// Mock document.head
	Object.defineProperty(document, 'head', {
		value: mockHead,
		writable: true,
	});

	// Mock document.body
	Object.defineProperty(document, 'body', {
		value: mockBody,
		writable: true,
	});

	// Clear any scripts that might have been loaded in previous tests
	clearAllScripts();

	// Mock Math.random for consistent anonymized IDs
	mockRandomForTesting();

	// Clear the createdElements registry for each test
	// This ensures tests don't interfere with each other
	createdElements.clear();

	// Reset mocks
	vi.clearAllMocks();
}

/**
 * Tears down mocks after tests
 */
export function teardownDomMocks() {
	vi.restoreAllMocks();
	clearAllScripts();
	createdElements.clear();
}

/**
 * Sets up test hooks for before and after each test
 */
export function setupTestHooks() {
	// Setup mocks before each test
	beforeEach(() => {
		setupDomMocks();
	});

	// Clean up after each test
	afterEach(() => {
		teardownDomMocks();
	});
}

/**
 * Mocks the Math.random function to return predictable values for testing
 */
export function mockRandomForTesting() {
	// Mock only the random function to return a consistent value
	vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
}
