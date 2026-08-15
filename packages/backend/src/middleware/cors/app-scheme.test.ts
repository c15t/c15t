import { describe, expect, it } from 'vitest';
import { createCORSOptions } from './cors';
import { isOriginTrusted } from './is-origin-trusted';

/**
 * Native WebView shells (Capacitor, Cordova/Ionic) serve the app from a custom
 * scheme rather than http(s), so `capacitor://localhost` must be usable as a
 * trusted origin without also trusting every other `capacitor://` host.
 */
const allowedOrigin = (
	trustedOrigins: string[],
	origin: string
): string | null => {
	const { origin: resolve } = createCORSOptions(trustedOrigins);
	return typeof resolve === 'function' ? resolve(origin) : resolve;
};

describe('app-scheme trusted origins', () => {
	describe('isOriginTrusted', () => {
		it('trusts an app-scheme origin listed verbatim', () => {
			expect(
				isOriginTrusted('capacitor://localhost', ['capacitor://localhost'])
			).toBe(true);
			expect(isOriginTrusted('ionic://localhost', ['ionic://localhost'])).toBe(
				true
			);
			expect(isOriginTrusted('myapp://localhost', ['myapp://localhost'])).toBe(
				true
			);
		});

		it('does not let one app-scheme entry trust other hosts', () => {
			expect(
				isOriginTrusted('capacitor://evil.com', ['capacitor://localhost'])
			).toBe(false);
		});

		it('does not match across schemes', () => {
			expect(
				isOriginTrusted('ionic://localhost', ['capacitor://localhost'])
			).toBe(false);
			expect(
				isOriginTrusted('https://localhost', ['capacitor://localhost'])
			).toBe(false);
		});

		it('matches app-scheme hosts verbatim, without www equivalence', () => {
			expect(
				isOriginTrusted('capacitor://www.localhost', ['capacitor://localhost'])
			).toBe(false);
			expect(
				isOriginTrusted('capacitor://localhost', ['capacitor://www.localhost'])
			).toBe(false);
		});

		it('keeps www equivalence for web entries', () => {
			expect(isOriginTrusted('https://www.example.com', ['example.com'])).toBe(
				true
			);
			expect(isOriginTrusted('https://example.com', ['www.example.com'])).toBe(
				true
			);
		});

		it('leaves entries without an app scheme protocol-agnostic', () => {
			// Pre-existing behaviour: an entry that names no scheme matches any
			// scheme on that host, app schemes included. Narrowing this would break
			// deployments that list a bare host and serve a native WebView.
			expect(isOriginTrusted('capacitor://localhost', ['localhost'])).toBe(
				true
			);
			expect(
				isOriginTrusted('capacitor://app.example.com', ['*.example.com'])
			).toBe(true);
		});

		it('keeps web origins protocol-agnostic', () => {
			expect(isOriginTrusted('https://example.com', ['example.com'])).toBe(
				true
			);
			expect(
				isOriginTrusted('http://example.com', ['https://example.com'])
			).toBe(true);
			expect(isOriginTrusted('wss://example.com', ['example.com'])).toBe(true);
		});

		it('still trusts the Android WebView origin', () => {
			expect(isOriginTrusted('http://localhost', ['http://localhost'])).toBe(
				true
			);
		});
	});

	describe('createCORSOptions', () => {
		it('echoes an app-scheme origin that is trusted', () => {
			expect(
				allowedOrigin(['capacitor://localhost'], 'capacitor://localhost')
			).toBe('capacitor://localhost');
		});

		it('rejects other hosts on the same app scheme', () => {
			expect(
				allowedOrigin(['capacitor://localhost'], 'capacitor://evil.com')
			).toBeNull();
		});

		it('rejects other schemes on the same host', () => {
			expect(
				allowedOrigin(['capacitor://localhost'], 'ionic://localhost')
			).toBeNull();
			expect(
				allowedOrigin(['capacitor://localhost'], 'https://localhost')
			).toBeNull();
		});

		it('supports a Capacitor app alongside its web origins', () => {
			const trusted = [
				'https://app.example.com',
				'capacitor://localhost',
				'http://localhost',
			];
			expect(allowedOrigin(trusted, 'capacitor://localhost')).toBe(
				'capacitor://localhost'
			);
			expect(allowedOrigin(trusted, 'https://app.example.com')).toBe(
				'https://app.example.com'
			);
			expect(allowedOrigin(trusted, 'http://localhost')).toBe(
				'http://localhost'
			);
		});

		it('does not expand app schemes with a www variant', () => {
			expect(
				allowedOrigin(['capacitor://localhost'], 'capacitor://www.localhost')
			).toBeNull();
		});
	});
});
