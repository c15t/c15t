import { afterEach, beforeEach, vi } from 'vitest';
import type { ConsentState } from '../../../types/compliance';
import { clearAllScripts } from '../core';

// Mock script element for testing
export const mockScriptElement = {
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

// Mock document.head for testing
export const mockHead = {
	appendChild: vi.fn(),
};

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
	// Mock document.createElement
	vi.spyOn(document, 'createElement').mockImplementation(() => {
		return { ...mockScriptElement } as unknown as HTMLScriptElement;
	});

	// Mock document.getElementById by adding it to the document object
	if (!document.getElementById) {
		(document as any).getElementById = vi
			.fn()
			.mockImplementation((id: string) => {
				// Return a mock element that matches the expected structure
				return {
					...mockScriptElement,
					id,
				} as unknown as HTMLElement;
			});
	}

	// Mock document.head
	Object.defineProperty(document, 'head', {
		value: mockHead,
		writable: true,
	});

	// Clear any scripts that might have been loaded in previous tests
	vi.spyOn(global, 'Map').mockImplementation(() => new Map());

	// Reset mocks
	vi.clearAllMocks();
}

/**
 * Tears down mocks after tests
 */
export function teardownDomMocks() {
	vi.restoreAllMocks();
	clearAllScripts();
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
	// Create a copy of the original Math object properties we need
	const mathCopy = {
		random: () => 0.5, // This will make generateRandomScriptId return a consistent value
	};

	// Mock only the random function without spreading the entire Math object
	vi.spyOn(Math, 'random').mockImplementation(mathCopy.random);
}
