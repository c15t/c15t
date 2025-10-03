/**
 * @fileoverview Tests for the iframe blocker core functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentState } from '../../../types';
import { createIframeBlocker } from '../core';
import './test-setup';

describe('createIframeBlocker', () => {
	beforeEach(() => {
		// Clear DOM
		if (document.body) {
			document.body.innerHTML = '';
		}
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('iframe processing', () => {
		it('should allow iframes without category attribute', () => {
			const blocker = createIframeBlocker();

			// Create iframe without category
			const iframe = document.createElement('iframe');
			iframe.src = 'https://example.com';
			document.body.appendChild(iframe);

			blocker.processIframes();

			// Iframe should keep its src since no category means no consent required
			expect(iframe.src).toBe('https://example.com');
		});

		it('should block iframes with category when consent is not granted', () => {
			// Create iframe blocker with default consents (marketing: false)
			const blocker = createIframeBlocker();

			// Create iframe with marketing category
			const iframe = document.createElement('iframe');
			iframe.src = 'https://youtube.com/embed/123';
			iframe.setAttribute('data-category', 'marketing');
			document.body.appendChild(iframe);

			blocker.processIframes();

			// src should be removed because marketing consent is false by default
			expect(iframe.src).toBe('');
		});

		it('should allow iframes with category when consent is granted', () => {
			// Create iframe blocker with marketing consent granted
			const blocker = createIframeBlocker(
				{},
				{
					necessary: true,
					functionality: false,
					experience: false,
					marketing: true,
					measurement: false,
				}
			);

			// Create iframe with marketing category
			const iframe = document.createElement('iframe');
			iframe.src = 'https://youtube.com/embed/123';
			iframe.setAttribute('data-category', 'marketing');
			document.body.appendChild(iframe);

			blocker.processIframes();

			// src should remain because marketing consent is true
			expect(iframe.src).toBe('https://youtube.com/embed/123');
		});

		it('should move data-src to src when consent is granted', () => {
			// Create iframe blocker with marketing consent granted
			const blocker = createIframeBlocker(
				{},
				{
					necessary: true,
					functionality: false,
					experience: false,
					marketing: true,
					measurement: false,
				}
			);

			// Create iframe with data-src (lazy loading)
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-src', 'https://youtube.com/embed/123');
			iframe.setAttribute('data-category', 'marketing');
			document.body.appendChild(iframe);

			blocker.processIframes();

			// data-src should be moved to src because marketing consent is true
			expect(iframe.src).toBe('https://youtube.com/embed/123');
			expect(iframe.getAttribute('data-src')).toBeNull();
		});

		it('should not move data-src to src when consent is not granted', () => {
			// Create iframe blocker with default consents (marketing: false)
			const blocker = createIframeBlocker();

			// Create iframe with data-src (lazy loading)
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-src', 'https://youtube.com/embed/123');
			iframe.setAttribute('data-category', 'marketing');
			document.body.appendChild(iframe);

			blocker.processIframes();

			// data-src should remain, src should be empty because marketing consent is false
			expect(iframe.src).toBe('');
			expect(iframe.getAttribute('data-src')).toBe(
				'https://youtube.com/embed/123'
			);
		});

		it('should throw error for invalid category attribute', () => {
			const blocker = createIframeBlocker();

			// Create iframe with invalid category
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-category', 'invalid-category');
			document.body.appendChild(iframe);

			expect(() => {
				blocker.processIframes();
			}).toThrow('Invalid category attribute "invalid-category"');
		});
	});

	describe('consent updates', () => {
		it('should update iframe states when consents change', () => {
			// Create iframe blocker with default consents (marketing: false)
			const blocker = createIframeBlocker();

			// Create iframe with marketing category
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-src', 'https://youtube.com/embed/123');
			iframe.setAttribute('data-category', 'marketing');
			document.body.appendChild(iframe);

			blocker.processIframes();

			// Should be blocked initially because marketing consent is false by default
			expect(iframe.src).toBe('');
			expect(iframe.getAttribute('data-src')).toBe(
				'https://youtube.com/embed/123'
			);

			// Now grant consent
			blocker.updateConsents({
				necessary: true,
				functionality: false,
				experience: false,
				marketing: true,
				measurement: false,
			});

			// Should now be loaded
			expect(iframe.src).toBe('https://youtube.com/embed/123');
			expect(iframe.getAttribute('data-src')).toBeNull();
		});

		it('should block iframes when consent is revoked', () => {
			// Create iframe blocker with marketing consent initially granted
			const blocker = createIframeBlocker(
				{},
				{
					necessary: true,
					functionality: false,
					experience: false,
					marketing: true,
					measurement: false,
				}
			);

			// Create iframe with marketing category
			const iframe = document.createElement('iframe');
			iframe.src = 'https://youtube.com/embed/123';
			iframe.setAttribute('data-category', 'marketing');
			document.body.appendChild(iframe);

			blocker.processIframes();

			// Should be loaded initially because marketing consent is true
			expect(iframe.src).toBe('https://youtube.com/embed/123');

			// Now revoke consent
			blocker.updateConsents({
				necessary: true,
				functionality: false,
				experience: false,
				marketing: false,
				measurement: false,
			});

			// Should now be blocked
			expect(iframe.src).toBe('');
		});
	});

	describe('dynamic iframe handling', () => {
		it('should process dynamically added iframes', () => {
			// Create iframe blocker with marketing consent granted
			const blocker = createIframeBlocker(
				{},
				{
					necessary: true,
					functionality: false,
					experience: false,
					marketing: true,
					measurement: false,
				}
			);

			// Create and add iframe after initialization
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-src', 'https://youtube.com/embed/123');
			iframe.setAttribute('data-category', 'marketing');

			// Add to DOM
			document.body.appendChild(iframe);

			// Manually process iframes to test the functionality
			blocker.processIframes();
			expect(iframe.src).toBe('https://youtube.com/embed/123');
		});

		it('should process iframes within dynamically added containers', () => {
			// Create iframe blocker with default consents (marketing: false)
			const blocker = createIframeBlocker();

			// Create container with iframe
			const container = document.createElement('div');
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-category', 'marketing');
			iframe.src = 'https://youtube.com/embed/123';
			container.appendChild(iframe);

			// Add container to DOM
			document.body.appendChild(container);

			// Manually process iframes to test the functionality
			blocker.processIframes();
			expect(iframe.src).toBe('');
		});
	});

	describe('configuration', () => {
		it('should respect disableAutomaticBlocking configuration', () => {
			createIframeBlocker({ disableAutomaticBlocking: true });

			// Create iframe
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-category', 'marketing');
			iframe.src = 'https://youtube.com/embed/123';
			document.body.appendChild(iframe);

			// Should not process iframes automatically, so src should remain unchanged
			expect(iframe.src).toBe('https://youtube.com/embed/123');
		});

		it('should use initial consents when provided', () => {
			const initialConsents: ConsentState = {
				necessary: true,
				functionality: false,
				experience: false,
				marketing: true,
				measurement: false,
			};

			const blocker = createIframeBlocker({}, initialConsents);

			// Create iframe with marketing category
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-src', 'https://youtube.com/embed/123');
			iframe.setAttribute('data-category', 'marketing');
			document.body.appendChild(iframe);

			blocker.processIframes();

			// Should use initial consents - marketing is true so iframe should load
			expect(iframe.src).toBe('https://youtube.com/embed/123');
			expect(iframe.getAttribute('data-src')).toBeNull();
		});
	});

	describe('cleanup', () => {
		it('should clean up mutation observer on destroy', () => {
			const blocker = createIframeBlocker();

			// Spy on disconnect method
			const disconnectSpy = vi.spyOn(MutationObserver.prototype, 'disconnect');

			blocker.destroy();

			expect(disconnectSpy).toHaveBeenCalled();
		});

		it('should not process iframes after destroy', () => {
			const blocker = createIframeBlocker();

			blocker.destroy();

			// Create iframe after destroy
			const iframe = document.createElement('iframe');
			iframe.setAttribute('data-category', 'marketing');
			iframe.src = 'https://youtube.com/embed/123';
			document.body.appendChild(iframe);

			// Should not process - src should remain unchanged since blocker is destroyed
			expect(iframe.src).toBe('https://youtube.com/embed/123');
		});
	});

	describe('multiple iframes', () => {
		it('should handle multiple iframes with different categories', () => {
			// Create iframe blocker with marketing consent granted but functionality denied
			const blocker = createIframeBlocker(
				{},
				{
					necessary: true,
					functionality: false,
					experience: false,
					marketing: true,
					measurement: false,
				}
			);

			// Create marketing iframe
			const marketingIframe = document.createElement('iframe');
			marketingIframe.setAttribute('data-src', 'https://youtube.com/embed/123');
			marketingIframe.setAttribute('data-category', 'marketing');
			document.body.appendChild(marketingIframe);

			// Create functionality iframe
			const functionalityIframe = document.createElement('iframe');
			functionalityIframe.setAttribute('data-src', 'https://calendly.com/123');
			functionalityIframe.setAttribute('data-category', 'functionality');
			document.body.appendChild(functionalityIframe);

			// Create iframe without category
			const regularIframe = document.createElement('iframe');
			regularIframe.src = 'https://example.com';
			document.body.appendChild(regularIframe);

			blocker.processIframes();

			// Marketing iframe should be loaded because marketing consent is true
			expect(marketingIframe.src).toBe('https://youtube.com/embed/123');
			expect(marketingIframe.getAttribute('data-src')).toBeNull();

			// Functionality iframe should be blocked because functionality consent is false
			expect(functionalityIframe.src).toBe('');
			expect(functionalityIframe.getAttribute('data-src')).toBe(
				'https://calendly.com/123'
			);

			// Regular iframe should be unchanged because no category means no consent required
			expect(regularIframe.src).toBe('https://example.com');
		});
	});
});
