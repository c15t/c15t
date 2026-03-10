import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearDismissedResources,
	createDomScannerSection,
	scanDOM,
} from '../../panels/dom-scanner';

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('DOM Scanner', () => {
	beforeEach(() => {
		// Reset dismissed resources
		clearDismissedResources();

		// Reset DOM
		document.body.innerHTML = '';

		// Reset window.location
		Object.defineProperty(window, 'location', {
			value: { hostname: 'localhost', origin: 'http://localhost' },
			writable: true,
			configurable: true,
		});
	});

	describe('scanDOM', () => {
		it('should return empty array when no external resources exist', () => {
			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof scanDOM>[0];

			const results = scanDOM(mockState);

			expect(results).toEqual([]);
		});

		it('should detect external scripts', () => {
			// Add an external script to the DOM
			const script = document.createElement('script');
			script.src = 'https://external.com/script.js';
			document.body.appendChild(script);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof scanDOM>[0];

			const results = scanDOM(mockState);

			expect(results).toHaveLength(1);
			expect(results[0]?.type).toBe('script');
			expect(results[0]?.domain).toBe('external.com');
			expect(results[0]?.status).toBe('unmanaged');
		});

		it('should detect external iframes', () => {
			// Add an external iframe to the DOM
			const iframe = document.createElement('iframe');
			iframe.src = 'https://external.com/embed';
			document.body.appendChild(iframe);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof scanDOM>[0];

			const results = scanDOM(mockState);

			expect(results).toHaveLength(1);
			expect(results[0]?.type).toBe('iframe');
			expect(results[0]?.domain).toBe('external.com');
		});

		it('should detect multiple external resources', () => {
			// Add multiple scripts and iframes
			const script1 = document.createElement('script');
			script1.src = 'https://analytics.com/track.js';
			document.body.appendChild(script1);

			const script2 = document.createElement('script');
			script2.src = 'https://ads.com/serve.js';
			document.body.appendChild(script2);

			const iframe = document.createElement('iframe');
			iframe.src = 'https://embed.com/widget';
			document.body.appendChild(iframe);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof scanDOM>[0];

			const results = scanDOM(mockState);

			expect(results).toHaveLength(3);
			expect(results.filter((r) => r.type === 'script')).toHaveLength(2);
			expect(results.filter((r) => r.type === 'iframe')).toHaveLength(1);
		});

		it('should mark managed scripts correctly', () => {
			// Add an external script to the DOM
			const script = document.createElement('script');
			script.src = 'https://analytics.example.com/track.js';
			document.body.appendChild(script);

			const mockState = {
				scripts: [
					{
						id: 'analytics',
						src: 'https://analytics.example.com/track.js',
						category: 'analytics',
					},
				],
			} as unknown as Parameters<typeof scanDOM>[0];

			const results = scanDOM(mockState);

			expect(results).toHaveLength(1);
			expect(results[0]?.status).toBe('managed');
			expect(results[0]?.managedBy).toBe('analytics');
		});

		it('should skip first-party scripts', () => {
			// Mock window.location.hostname
			Object.defineProperty(window, 'location', {
				value: { hostname: 'example.com', origin: 'https://example.com' },
				writable: true,
				configurable: true,
			});

			// Add a same-origin script
			const script = document.createElement('script');
			script.src = 'https://example.com/app.js';
			document.body.appendChild(script);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof scanDOM>[0];

			const results = scanDOM(mockState);

			expect(results).toHaveLength(0);
		});

		it('should skip data: and blob: URLs', () => {
			const dataScript = document.createElement('script');
			dataScript.src = 'data:text/javascript,console.log("test")';
			document.body.appendChild(dataScript);

			const blobScript = document.createElement('script');
			blobScript.src = 'blob:https://example.com/abc123';
			document.body.appendChild(blobScript);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof scanDOM>[0];

			const results = scanDOM(mockState);

			expect(results).toHaveLength(0);
		});

		it('should skip scripts without src attribute', () => {
			const inlineScript = document.createElement('script');
			inlineScript.textContent = 'console.log("inline")';
			document.body.appendChild(inlineScript);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof scanDOM>[0];

			const results = scanDOM(mockState);

			expect(results).toHaveLength(0);
		});

		it('should handle scripts with invalid URLs gracefully', () => {
			const badScript = document.createElement('script');
			badScript.setAttribute('src', 'not-a-valid-url');
			document.body.appendChild(badScript);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof scanDOM>[0];

			// Should not throw
			const results = scanDOM(mockState);
			// Relative URLs resolve to the current origin, so it's first-party
			expect(results).toHaveLength(0);
		});
	});

	describe('createDomScannerSection', () => {
		it('should create a section element', () => {
			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);

			expect(section).toBeInstanceOf(HTMLElement);
		});

		it('should include a scan button', () => {
			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);

			const button = section.querySelector('button');
			expect(button).not.toBeNull();
			expect(button?.textContent).toBe('Scan DOM');
		});

		it('should show placeholder text initially', () => {
			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);

			expect(section.textContent).toContain('Click "Scan DOM"');
		});

		it('should show "no external resources" after scanning empty DOM', () => {
			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);
			const button = section.querySelector('button');

			// Click the scan button
			button?.click();

			expect(section.textContent).toContain('No external scripts or iframes');
		});

		it('should show scan results after clicking scan button', () => {
			// Add an external script
			const script = document.createElement('script');
			script.src = 'https://external.com/script.js';
			document.body.appendChild(script);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);
			const button = section.querySelector('button');

			// Click the scan button
			button?.click();

			expect(section.textContent).toContain('Found:');
			expect(section.textContent).toContain('unmanaged');
			expect(section.textContent).toContain('external.com');
		});

		it('should show managed resources with MANAGED header', () => {
			// Add an external script that is managed
			const script = document.createElement('script');
			script.src = 'https://analytics.com/track.js';
			document.body.appendChild(script);

			const mockState = {
				scripts: [
					{
						id: 'analytics',
						src: 'https://analytics.com/track.js',
						category: 'analytics',
					},
				],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);
			const button = section.querySelector('button');

			button?.click();

			expect(section.textContent).toContain('MANAGED');
			expect(section.textContent).toContain('analytics.com');
		});

		it('should allow dismissing unmanaged resources', () => {
			// Add an external script
			const script = document.createElement('script');
			script.src = 'https://external.com/script.js';
			document.body.appendChild(script);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);
			const scanButton = section.querySelector('button');

			// Click scan
			scanButton?.click();

			// Find and click dismiss button
			const dismissButton = section.querySelector(
				'button[title="Dismiss this alert"]'
			);
			expect(dismissButton).not.toBeNull();

			dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

			// Should show "All X alerts dismissed"
			expect(section.textContent).toContain('dismissed');
		});

		it('should handle null state gracefully', () => {
			const section = createDomScannerSection(null);

			expect(section).toBeInstanceOf(HTMLElement);

			// Clicking scan should not throw
			const button = section.querySelector('button');
			expect(() => button?.click()).not.toThrow();
		});

		it('should re-scan fresh each time scan is clicked', () => {
			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);
			const button = section.querySelector('button');

			// First scan - no scripts
			button?.click();
			expect(section.textContent).toContain('No external scripts');

			// Add a script
			const script = document.createElement('script');
			script.src = 'https://new-external.com/script.js';
			document.body.appendChild(script);

			// Second scan - should find the new script
			button?.click();
			expect(section.textContent).toContain('new-external.com');
		});

		it('should show summary with correct counts', () => {
			// Add 2 unmanaged scripts
			const script1 = document.createElement('script');
			script1.src = 'https://unmanaged1.com/script.js';
			document.body.appendChild(script1);

			const script2 = document.createElement('script');
			script2.src = 'https://unmanaged2.com/script.js';
			document.body.appendChild(script2);

			// Add 1 managed script
			const script3 = document.createElement('script');
			script3.src = 'https://managed.com/script.js';
			document.body.appendChild(script3);

			const mockState = {
				scripts: [
					{
						id: 'managed-script',
						src: 'https://managed.com/script.js',
						category: 'analytics',
					},
				],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);
			const button = section.querySelector('button');

			button?.click();

			expect(section.textContent).toContain('1 managed');
			expect(section.textContent).toContain('2 unmanaged');
		});
	});

	describe('clearDismissedResources', () => {
		it('should allow re-scanning after clearing dismissed resources', () => {
			// Add an external script
			const script = document.createElement('script');
			script.src = 'https://external.com/script.js';
			document.body.appendChild(script);

			const mockState = {
				scripts: [],
			} as unknown as Parameters<typeof createDomScannerSection>[0];

			const section = createDomScannerSection(mockState);
			const scanButton = section.querySelector('button');

			// Scan and dismiss
			scanButton?.click();
			const dismissButton = section.querySelector(
				'button[title="Dismiss this alert"]'
			);
			dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

			expect(section.textContent).toContain('dismissed');

			// Clear dismissed resources
			clearDismissedResources();

			// Re-scan should show the script again
			scanButton?.click();
			expect(section.textContent).toContain('external.com');
			expect(section.textContent).not.toContain('dismissed');
		});
	});
});
