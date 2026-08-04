import { describe, expect, it, vi } from 'vitest';
import type { WriteDomainResolverContext } from '~/types';
import type { ResolvedWriteDomainOptions } from './configuration';
import {
	buildDomainScopeKey,
	normalizeWriteDomain,
	resolveWriteDomain,
	WriteDomainResolutionError,
} from './domain';

function resolverContext(
	overrides: Partial<WriteDomainResolverContext> = {}
): WriteDomainResolverContext {
	return {
		action: 'consent:create',
		request: new Request('https://api.example.test/subjects'),
		...overrides,
	};
}

function configuredDomains(
	overrides: Partial<ResolvedWriteDomainOptions> = {}
): ResolvedWriteDomainOptions {
	return {
		mode: 'configured',
		allowlist: ['example.com'],
		...overrides,
	};
}

describe('normalizeWriteDomain', () => {
	it('normalizes case, international names, and a final DNS dot', () => {
		expect(normalizeWriteDomain(' EXAMPLE.COM. ')).toBe('example.com');
		expect(normalizeWriteDomain('münich.example')).toBe(
			'xn--mnich-kva.example'
		);
	});

	it.each([
		'https://example.com',
		'example.com:443',
		'example.com/path',
		'user@example.com',
		'*.example.com',
		'',
	])('rejects non-hostname value %j', (value) => {
		expect(() => normalizeWriteDomain(value)).toThrow(
			WriteDomainResolutionError
		);
	});
});

describe('buildDomainScopeKey', () => {
	it('is stable and tenant-aware', async () => {
		const first = await buildDomainScopeKey('example.com', 'tenant-a');
		const retry = await buildDomainScopeKey('example.com', 'tenant-a');
		const otherTenant = await buildDomainScopeKey('example.com', 'tenant-b');
		const unscoped = await buildDomainScopeKey('example.com');

		expect(first).toBe(retry);
		expect(first).toMatch(/^domain:[a-f0-9]{64}$/);
		expect(otherTenant).not.toBe(first);
		expect(unscoped).not.toBe(first);
	});
});

describe('resolveWriteDomain', () => {
	it('preserves the request value unchanged in legacy mode', async () => {
		await expect(
			resolveWriteDomain({
				options: { mode: 'legacy', allowlist: [] },
				context: resolverContext({ requestedDomain: ' EXAMPLE.COM. ' }),
			})
		).resolves.toEqual({
			mode: 'legacy',
			domain: ' EXAMPLE.COM. ',
			source: 'request',
		});
	});

	it('canonicalizes an allowlisted request and creates its scope key', async () => {
		const result = await resolveWriteDomain({
			options: configuredDomains({ allowlist: ['EXAMPLE.COM.'] }),
			context: resolverContext({
				requestedDomain: 'example.com',
				tenantId: 'tenant-a',
			}),
		});

		expect(result).toEqual({
			mode: 'configured',
			domain: 'example.com',
			source: 'request',
			scopeKey: await buildDomainScopeKey('example.com', 'tenant-a'),
		});
	});

	it('uses the resolver output as authoritative', async () => {
		const resolve = vi.fn(() => 'resolved.example');
		const result = await resolveWriteDomain({
			options: configuredDomains({
				allowlist: ['resolved.example'],
				resolve,
			}),
			context: resolverContext({ requestedDomain: 'attacker.example' }),
		});

		expect(resolve).toHaveBeenCalledOnce();
		expect(result.domain).toBe('resolved.example');
		expect(result.source).toBe('resolver');
	});

	it('checks resolver output against the allowlist', async () => {
		const promise = resolveWriteDomain({
			options: configuredDomains({
				resolve: () => 'outside.example',
			}),
			context: resolverContext({ requestedDomain: 'example.com' }),
		});

		await expect(promise).rejects.toMatchObject({
			status: 403,
			code: 'WRITE_DOMAIN_NOT_ALLOWED',
		});
	});

	it('maps resolver rejection and failure to stable errors', async () => {
		await expect(
			resolveWriteDomain({
				options: configuredDomains({ resolve: () => null }),
				context: resolverContext(),
			})
		).rejects.toMatchObject({
			status: 403,
			code: 'WRITE_DOMAIN_RESOLUTION_REJECTED',
		});

		await expect(
			resolveWriteDomain({
				options: configuredDomains({
					resolve: () => {
						throw new Error('provider failed');
					},
				}),
				context: resolverContext(),
			})
		).rejects.toMatchObject({
			status: 503,
			code: 'WRITE_DOMAIN_RESOLUTION_FAILED',
		});
	});
});
