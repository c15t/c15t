import type { ConsentState } from '../../types';
import { has } from '../has';
import type { NetworkBlockerConfig, NetworkBlockerRule } from './types';

interface NetworkRequestContext {
	url: string;
	method: string;
}

const normalizeMethod = function normalizeMethod(method: string): string {
	if (!method) {
		return 'GET';
	}

	return method.toUpperCase();
};

const createUrl = function createUrl(rawUrl: string): URL | null {
	if (!rawUrl) {
		return null;
	}

	try {
		if (typeof window === 'undefined') {
			return null;
		}

		return new URL(rawUrl, window.location.href);
	} catch {
		return null;
	}
};

const hostnameMatchesRule = function hostnameMatchesRule(
	hostname: string,
	rule: NetworkBlockerRule
): boolean {
	if (!hostname) {
		return false;
	}

	const ruleDomain = rule.domain.trim().toLowerCase();
	const targetHost = hostname.trim().toLowerCase();

	if (!ruleDomain || !targetHost) {
		return false;
	}

	if (targetHost === ruleDomain) {
		return true;
	}

	const suffix = `.${ruleDomain}`;
	const hasSuffix = targetHost.endsWith(suffix);

	return hasSuffix;
};

const pathMatchesRule = function pathMatchesRule(
	pathname: string,
	rule: NetworkBlockerRule
): boolean {
	const hasPathFilter = typeof rule.pathIncludes === 'string';

	if (!hasPathFilter) {
		return true;
	}

	if (!pathname) {
		return false;
	}

	return pathname.includes(rule.pathIncludes as string);
};

const methodMatchesRule = function methodMatchesRule(
	method: string,
	rule: NetworkBlockerRule
): boolean {
	if (!rule.methods || rule.methods.length === 0) {
		return true;
	}

	if (!method) {
		return false;
	}

	const upperMethod = normalizeMethod(method);

	return rule.methods.some(
		(allowedMethod) => normalizeMethod(allowedMethod) === upperMethod
	);
};

const shouldApplyRule = function shouldApplyRule(
	url: URL,
	method: string,
	rule: NetworkBlockerRule
): boolean {
	if (!hostnameMatchesRule(url.hostname, rule)) {
		return false;
	}

	if (!pathMatchesRule(url.pathname, rule)) {
		return false;
	}

	if (!methodMatchesRule(method, rule)) {
		return false;
	}

	return true;
};

/**
 * Determines whether a network request should be blocked based on the
 * configured rules and the provided consent state.
 *
 * @internal
 */
export const shouldBlockRequest = function shouldBlockRequest(
	request: NetworkRequestContext,
	consents: ConsentState,
	config?: NetworkBlockerConfig
): { shouldBlock: boolean; rule?: NetworkBlockerRule } {
	if (!config) {
		return { shouldBlock: false };
	}

	const isEnabled = config.enabled !== false;

	if (!isEnabled) {
		return { shouldBlock: false };
	}

	if (!config.rules || config.rules.length === 0) {
		return { shouldBlock: false };
	}

	const url = createUrl(request.url);

	if (!url) {
		return { shouldBlock: false };
	}

	const method = normalizeMethod(request.method);

	for (const rule of config.rules) {
		const applies = shouldApplyRule(url, method, rule);

		if (!applies) {
			continue;
		}

		const hasRequiredConsent = has(rule.category, consents);

		if (!hasRequiredConsent) {
			return { rule, shouldBlock: true };
		}
	}

	return { shouldBlock: false };
};
