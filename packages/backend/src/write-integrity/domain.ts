import { hashSha256Hex } from '@c15t/schema/types';
import { HTTPException } from 'hono/http-exception';
import type { WriteDomainResolverContext } from '~/types';
import type { ResolvedWriteDomainOptions } from './configuration';

/** Stable failure codes emitted while resolving a write domain. */
export type WriteDomainResolutionErrorCode =
	| 'WRITE_DOMAIN_REQUIRED'
	| 'WRITE_DOMAIN_INVALID'
	| 'WRITE_DOMAIN_NOT_ALLOWED'
	| 'WRITE_DOMAIN_RESOLUTION_REJECTED'
	| 'WRITE_DOMAIN_RESOLUTION_FAILED';

/** HTTP-compatible error raised when a secure write domain cannot be resolved. */
export class WriteDomainResolutionError extends HTTPException {
	readonly code: WriteDomainResolutionErrorCode;

	constructor(
		status: 403 | 422 | 503,
		code: WriteDomainResolutionErrorCode,
		message: string,
		cause?: unknown
	) {
		super(status, {
			message,
			cause: { code, error: cause },
		});
		this.name = 'WriteDomainResolutionError';
		this.code = code;
	}
}

/** Result of resolving the authoritative domain for a write. */
export type ResolvedWriteDomain =
	| {
			/** Legacy behavior leaves the request value unchanged. */
			mode: 'legacy';
			domain: string;
			source: 'request';
			scopeKey?: never;
	  }
	| {
			/** Configured behavior produces a canonical, tenant-scoped domain. */
			mode: 'configured';
			domain: string;
			source: 'request' | 'resolver';
			scopeKey: string;
	  };

/** Parameters used to resolve an authoritative write domain. */
export interface ResolveWriteDomainOptions {
	/** Resolved write-integrity domain configuration. */
	options: ResolvedWriteDomainOptions;
	/** Request details supplied to the optional trusted resolver. */
	context: WriteDomainResolverContext;
}

function invalidDomain(message: string): WriteDomainResolutionError {
	return new WriteDomainResolutionError(422, 'WRITE_DOMAIN_INVALID', message);
}

/**
 * Converts a domain name to its stable storage and comparison form.
 *
 * The accepted value is a hostname, not an origin or URL. Case, a final DNS
 * dot, and internationalized names are normalized by the URL parser. Ports,
 * paths, credentials, query strings, fragments, and wildcard labels are
 * rejected so two syntactically different values cannot name the same scope.
 *
 * @param value - Domain name to normalize
 * @returns Lowercase ASCII hostname without a trailing DNS dot
 * @throws {WriteDomainResolutionError} When the value is not a hostname
 */
export function normalizeWriteDomain(value: string): string {
	const input = value.trim();
	if (input === '') {
		throw invalidDomain('Write domain cannot be empty');
	}

	if (input.includes('://')) {
		throw invalidDomain('Write domain must be a hostname, not a URL');
	}

	const bracketedIpv6 = input.startsWith('[') && input.endsWith(']');
	if ((!bracketedIpv6 && input.includes(':')) || input.includes(']:')) {
		throw invalidDomain('Write domain cannot include a port');
	}

	let parsed: URL;
	try {
		parsed = new URL(`https://${input}`);
	} catch {
		throw invalidDomain('Write domain is not a valid hostname');
	}

	if (
		parsed.username !== '' ||
		parsed.password !== '' ||
		parsed.port !== '' ||
		parsed.pathname !== '/' ||
		parsed.search !== '' ||
		parsed.hash !== ''
	) {
		throw invalidDomain(
			'Write domain cannot include credentials, a port, path, query, or fragment'
		);
	}

	const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
	if (hostname === '' || hostname.includes('*')) {
		throw invalidDomain('Write domain is not a valid hostname');
	}

	return hostname;
}

/**
 * Builds a fixed-width lookup key for a canonical domain and tenant.
 *
 * JSON tuple encoding keeps a missing tenant distinct from tenant strings,
 * while SHA-256 keeps the key within adapter column limits even for long IDs.
 *
 * @param domain - Canonical domain returned by {@link normalizeWriteDomain}
 * @param tenantId - Active tenant, or `undefined` for the unscoped namespace
 * @returns Stable `domain:`-prefixed scope key
 */
export async function buildDomainScopeKey(
	domain: string,
	tenantId?: string
): Promise<string> {
	const digest = await hashSha256Hex(
		JSON.stringify([tenantId ?? null, domain])
	);
	return `domain:${digest}`;
}

/**
 * Resolves and authorizes the domain associated with a consent write.
 *
 * A configured server resolver is authoritative. Its output is still checked
 * against the configured allowlist, preventing a buggy resolver from bypassing
 * the deployment's explicit domain boundary. Without a resolver, the request
 * value is checked directly. Legacy mode deliberately returns the request value
 * unchanged to keep this minor release backwards compatible.
 *
 * @param input - Resolved configuration and request context
 * @returns Authoritative domain and its tenant-aware lookup key
 * @throws {WriteDomainResolutionError} When resolution or authorization fails
 */
export async function resolveWriteDomain(
	input: ResolveWriteDomainOptions
): Promise<ResolvedWriteDomain> {
	const { options, context } = input;

	if (options.mode === 'legacy') {
		if (context.requestedDomain === undefined) {
			throw new WriteDomainResolutionError(
				422,
				'WRITE_DOMAIN_REQUIRED',
				'Write domain is required'
			);
		}

		return {
			mode: 'legacy',
			domain: context.requestedDomain,
			source: 'request',
		};
	}

	let resolvedValue: string | null | undefined;
	if (options.resolve) {
		try {
			resolvedValue = await options.resolve(context);
		} catch (error) {
			throw new WriteDomainResolutionError(
				503,
				'WRITE_DOMAIN_RESOLUTION_FAILED',
				'Write domain resolver failed',
				error
			);
		}

		if (resolvedValue === null || resolvedValue === undefined) {
			throw new WriteDomainResolutionError(
				403,
				'WRITE_DOMAIN_RESOLUTION_REJECTED',
				'Write domain resolver rejected the request'
			);
		}
	} else {
		resolvedValue = context.requestedDomain;
	}

	if (resolvedValue === undefined) {
		throw new WriteDomainResolutionError(
			422,
			'WRITE_DOMAIN_REQUIRED',
			'Write domain is required'
		);
	}

	const domain = normalizeWriteDomain(resolvedValue);
	const allowedDomains = options.allowlist.map(normalizeWriteDomain);
	if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
		throw new WriteDomainResolutionError(
			403,
			'WRITE_DOMAIN_NOT_ALLOWED',
			'Write domain is not allowed'
		);
	}

	return {
		mode: 'configured',
		domain,
		source: options.resolve ? 'resolver' : 'request',
		scopeKey: await buildDomainScopeKey(domain, context.tenantId),
	};
}
