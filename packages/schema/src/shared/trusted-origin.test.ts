import { describe, expect, it } from 'vitest';

import { getAppScheme } from './app-scheme';
import { isOriginTrusted } from './trusted-origin';

describe('getAppScheme', () => {
	it('returns the scheme for native WebView origins', () => {
		expect(getAppScheme('capacitor://localhost')).toBe('capacitor:');
		expect(getAppScheme('ionic://localhost')).toBe('ionic:');
		expect(getAppScheme('MyApp://localhost')).toBe('myapp:');
	});

	it('returns undefined for web schemes and bare hostnames', () => {
		expect(getAppScheme('https://example.com')).toBeUndefined();
		expect(getAppScheme('http://localhost')).toBeUndefined();
		expect(getAppScheme('wss://example.com')).toBeUndefined();
		expect(getAppScheme('example.com')).toBeUndefined();
		expect(getAppScheme('*.example.com')).toBeUndefined();
	});
});

describe('isOriginTrusted', () => {
	describe('web origins', () => {
		it('matches exact and wildcard entries', () => {
			expect(isOriginTrusted('https://example.com', ['example.com'])).toBe(
				true
			);
			expect(
				isOriginTrusted('https://api.example.com', ['*.example.com'])
			).toBe(true);
			expect(isOriginTrusted('https://evil.com', ['example.com'])).toBe(false);
		});

		it('allows any origin for a bare wildcard', () => {
			expect(isOriginTrusted('https://any-domain.com', ['*'])).toBe(true);
		});

		it('keeps web origins protocol-agnostic', () => {
			expect(
				isOriginTrusted('http://example.com', ['https://example.com'])
			).toBe(true);
			expect(isOriginTrusted('wss://example.com', ['example.com'])).toBe(true);
		});

		it('treats www and the apex as equivalent', () => {
			expect(isOriginTrusted('https://www.example.com', ['example.com'])).toBe(
				true
			);
			expect(isOriginTrusted('https://example.com', ['www.example.com'])).toBe(
				true
			);
		});

		it('matches www against a wildcard like any other subdomain', () => {
			// `www` is a subdomain like any other. A matcher that www-stripped the
			// origin before the wildcard check turned it into the apex, which a
			// `*.` wildcard deliberately excludes.
			expect(
				isOriginTrusted('https://www.example.com', ['*.example.com'])
			).toBe(true);
			expect(isOriginTrusted('https://example.com', ['*.example.com'])).toBe(
				false
			);
		});

		it('does not widen malformed wildcard entries', () => {
			// Deriving an apex from these would turn them into the allow-all `*`
			// and the far broader `*.example.com` respectively.
			expect(isOriginTrusted('https://evil.com', ['www.*'])).toBe(false);
			expect(
				isOriginTrusted('https://evil.example.com', ['www.*.example.com'])
			).toBe(false);
		});

		it('rejects similar domains that are not subdomains', () => {
			expect(isOriginTrusted('https://badexample.com', ['*.example.com'])).toBe(
				false
			);
			expect(
				isOriginTrusted('https://example.com.evil.com', ['*.example.com'])
			).toBe(false);
		});

		it('honours an explicit port', () => {
			expect(isOriginTrusted('http://localhost:3000', ['localhost:3000'])).toBe(
				true
			);
			expect(isOriginTrusted('http://localhost:3001', ['localhost:3000'])).toBe(
				false
			);
			expect(isOriginTrusted('https://example.com', ['example.com:443'])).toBe(
				true
			);
		});

		it('returns false for an empty allowlist or an invalid origin', () => {
			expect(isOriginTrusted('https://example.com', [])).toBe(false);
			expect(isOriginTrusted('not a url', ['example.com'])).toBe(false);
		});
	});

	describe('app-scheme origins', () => {
		// Native WebView shells (Capacitor, Cordova/Ionic) serve the app from a
		// custom scheme rather than http(s), so `capacitor://localhost` must be
		// usable as a trusted origin without also trusting every other
		// `capacitor://` host.
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

		it('still trusts the Android WebView origin', () => {
			expect(isOriginTrusted('http://localhost', ['http://localhost'])).toBe(
				true
			);
		});

		it('supports a Capacitor app alongside its web origins', () => {
			const trusted = [
				'https://app.example.com',
				'capacitor://localhost',
				'http://localhost',
			];
			expect(isOriginTrusted('capacitor://localhost', trusted)).toBe(true);
			expect(isOriginTrusted('https://app.example.com', trusted)).toBe(true);
			expect(isOriginTrusted('http://localhost', trusted)).toBe(true);
			expect(isOriginTrusted('capacitor://evil.com', trusted)).toBe(false);
		});
	});
});
