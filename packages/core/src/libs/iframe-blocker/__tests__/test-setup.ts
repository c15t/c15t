/**
 * @fileoverview Test setup for iframe blocker tests
 */

import { afterEach, beforeEach, vi } from 'vitest';

// Mock DOM APIs that might not be available in test environment
beforeEach(() => {
	// Ensure MutationObserver is available
	if (typeof global.MutationObserver === 'undefined') {
		global.MutationObserver = class MutationObserver {
			constructor(_callback: MutationCallback) {
				// Mock implementation
			}

			observe(_target: Node, _options?: MutationObserverInit) {
				// Mock implementation - in real tests we'll trigger manually
			}

			disconnect() {
				// Mock implementation
			}

			takeRecords(): MutationRecord[] {
				return [];
			}
		};
	}

	// Enhance the existing document mock with proper DOM methods
	if (global.document) {
		// Track created elements for querySelectorAll
		const createdElements: Element[] = [];

		// Mock querySelectorAll to return created elements
		global.document.querySelectorAll = vi.fn((selector: string) => {
			if (selector === 'iframe') {
				return createdElements.filter(
					(el) => el.tagName === 'IFRAME'
				) as unknown as NodeListOf<HTMLIFrameElement>;
			}
			return [] as unknown as NodeListOf<Element>;
		});

		// Mock createElement to return proper iframe elements
		global.document.createElement = vi.fn((tagName: string) => {
			// Create a mock element with all necessary properties
			const attributes: Record<string, string> = {};

			const element = {
				tagName: tagName.toUpperCase(),
				src: '',
				getAttribute: vi.fn((name: string) => attributes[name] || null),
				setAttribute: vi.fn((name: string, value: string) => {
					attributes[name] = value;
					// Update the src property when src attribute is set
					if (name === 'src') {
						(element as unknown as { src: string }).src = value;
					}
				}),
				removeAttribute: vi.fn((name: string) => {
					delete attributes[name];
					// Update the src property when src attribute is removed
					if (name === 'src') {
						(element as unknown as { src: string }).src = '';
					}
				}),
				appendChild: vi.fn(),
				removeChild: vi.fn(),
			} as unknown as Element;

			// Track created elements
			createdElements.push(element);

			return element;
		}) as unknown as typeof document.createElement;

		// Ensure body exists and has proper methods
		if (!global.document.body) {
			global.document.body = {
				innerHTML: '',
				appendChild: vi.fn(),
				removeChild: vi.fn(),
			} as unknown as HTMLElement;
		}
	}
});

afterEach(() => {
	// Clean up DOM after each test
	if (global.document?.body) {
		global.document.body.innerHTML = '';
	}
});
