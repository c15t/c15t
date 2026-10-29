import { assert, describe, it } from 'vitest';

import { isDomainAllowed } from './save-domain';

describe('isDomainAllowed', () => {
	it.each([
		['an exact entry', 'example.com', ['example.com']],
		['a www. host for its apex entry', 'www.example.com', ['example.com']],
		['a subdomain under a wildcard', 'shop.example.org', ['*.example.org']],
		['any host under *', 'anything.test', ['*']],
		['a host in another case', 'Example.COM', ['example.com']],
		['a port when the entry has none', 'localhost:3000', ['localhost']],
		['an IPv6 literal', '[::1]', ['[::1]']],
		// The browser sends `location.hostname`: no scheme, no port.
		['a host for an entry with a port', 'localhost', ['localhost:3000']],
		['a host for an origin entry', 'localhost', ['http://localhost:3000/']],
		['a host for an app-scheme entry', 'localhost', ['capacitor://localhost']],
		[
			'a host for a wildcard with a port',
			'a.example.org',
			['*.example.org:8080'],
		],
		['an IPv6 literal for an entry with a port', '[::1]', ['[::1]:3000']],
	])('allows %s', (_label, domain, allowed) => {
		assert.isTrue(isDomainAllowed(domain, allowed));
	});

	it.each([
		['a domain no entry names', 'other.example', ['example.com']],
		['the apex under a wildcard', 'example.org', ['*.example.org']],
		[
			'a sibling that only ends the same way',
			'badexample.com',
			['example.com'],
		],
	])('refuses %s', (_label, domain, allowed) => {
		assert.isFalse(isDomainAllowed(domain, allowed));
	});

	// A value that is not a bare host is refused even under `*`: its host
	// alone would match, and the whole value is what gets stored.
	it.each([
		'example.com/path',
		'example.com?query=1',
		'example.com#fragment',
		'someone@example.com',
		'https://example.com',
		'exa mple.com',
	])('refuses %s, which is not a bare host', (domain) => {
		assert.isFalse(isDomainAllowed(domain, ['*', 'example.com']));
	});
});
