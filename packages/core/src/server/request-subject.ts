/**
 * The visitor's subject ID for one server request, read from the consent
 * records the request's cookies carry.
 *
 * c15t 3.2 gave a new visitor a subject ID in a `<storageKey>-sid` cookie on
 * their first response, before they chose anything. c15t no longer stores
 * a subject ID before a choice: a visitor's ID is stored with the record
 * their first save writes, and the server reads it from those cookies like
 * the rest of the records.
 *
 * @deprecated `readRequestConsent()` already returns the subject. Removed in
 * v4.
 */
import { isSpeculativeRequest } from '@c15t/schema/types';

import type { StorageConfig } from '../libs/cookie/types';
import { readStoredRecordsFromCookieHeader } from '../modules/persistence/hydrate';
import type { RequestHeaderSource } from './request-origin';

/**
 * Options for {@link resolveRequestSubject}.
 *
 * @deprecated c15t no longer sets a subject cookie. Removed in v4.
 */
export interface ResolveRequestSubjectOptions {
	/** The incoming request. */
	request: {
		/** The request headers. `cookie` is read unless `cookie` is given. */
		headers?: RequestHeaderSource;
		/** The URL the framework resolved the request under. */
		url?: string | URL;
		/** The request `Cookie` header, when the adapter reads it natively. */
		cookie?: string;
	};

	/**
	 * The storage configuration the browser runtime uses. `storageKey` names
	 * the record cookies the ID is read from.
	 */
	storage?: StorageConfig;

	/**
	 * Whether the response is shared by every visitor (prerendered or cached
	 * HTML). A shared response gets no subject.
	 *
	 * @defaultValue false
	 */
	shared?: boolean;

	/**
	 * Ignored. It set the subject cookie's `Secure` and `Domain` attributes.
	 *
	 * @deprecated c15t no longer sets a subject cookie.
	 */
	trustForwardedHeaders?: boolean;

	/** The clock for reading stored records. Defaults to `Date.now()`. */
	now?: number;
}

/**
 * The subject cookie a response set before c15t stopped setting one.
 *
 * @deprecated {@link resolveRequestSubject} never returns one. Removed in v4.
 */
export interface SubjectCookie {
	/** `<storageKey>-sid`. */
	name: string;
	/** The subject ID, not encoded. Cookie APIs encode it on write. */
	value: string;
	/** Lifetime in seconds, from `defaultExpiryDays`. */
	maxAge: number;
	path: '/';
	sameSite: 'lax';
	/** Set when the request came over `https`. */
	secure: boolean;
	/** The browser reads the ID, so the cookie is never HTTP-only. */
	httpOnly: false;
	/**
	 * The request's root domain with `crossSubdomain`, else `defaultDomain`.
	 * Unset with `crossSubdomain` when the request's host holds characters a
	 * cookie domain cannot, such as `;`.
	 */
	domain?: string;
	/** The whole cookie as a `Set-Cookie` header value. */
	header: string;
}

/**
 * The subject for one request.
 *
 * @deprecated Read `subject` from `readRequestConsent()` instead. Removed
 * in v4.
 */
export interface RequestSubject {
	/** The subject ID the visitor's stored records carry. */
	subjectId: string;
	/** The request `Cookie` header, unchanged. */
	cookie: string;
	/** Always `null`: c15t no longer sets a subject cookie. */
	setCookie: SubjectCookie | null;
}

const readCookieHeader = function readCookieHeader(
	options: ResolveRequestSubjectOptions
): string {
	const { cookie, headers } = options.request;
	if (cookie !== undefined) {
		return cookie;
	}
	if (!headers) {
		return '';
	}
	if (typeof (headers as Headers).get === 'function') {
		return (headers as Headers).get('cookie') ?? '';
	}
	// Header names are case-insensitive, and a record keeps whatever casing
	// the runtime or the client used.
	return Object.entries(
		headers as Record<string, string | string[] | undefined>
	)
		.filter(([name]) => name.toLowerCase() === 'cookie')
		.flatMap(([, value]) => value ?? [])
		.join('; ');
};

const toHeaders = function toHeaders(
	headers: RequestHeaderSource | undefined
): Headers {
	// Like `readCookieHeader`: a Headers object from a polyfill or another
	// realm is not an instance of this realm's Headers, and has no
	// enumerable entries to copy.
	if (typeof (headers as Headers | undefined)?.get === 'function') {
		return headers as Headers;
	}
	const result = new Headers();
	for (const [name, value] of Object.entries(headers ?? {})) {
		const first = Array.isArray(value) ? value[0] : value;
		if (first !== undefined) {
			result.set(name, first);
		}
	}
	return result;
};

/**
 * Reads the subject ID the visitor's stored consent records carry.
 *
 * It sets no cookie and never makes an ID: a visitor who has not chosen
 * anything has no stored ID, and gets `null`. So does a shared render
 * (prerendered or cached HTML) and a speculative request (prefetch or
 * prerender).
 *
 * @deprecated c15t no longer sets a subject cookie, so there is nothing to
 * add to a response. `readRequestConsent()` returns the same subject with
 * the rest of the records. Removed in v4.
 * @param options - The request, the storage configuration and whether the
 * response is shared.
 * @returns The subject, or `null` when the records carry no ID or the
 * request is shared or speculative.
 * @example
 * ```ts
 * const subjectId = resolveRequestSubject({ request: { headers } })?.subjectId;
 * ```
 */
export const resolveRequestSubject = function resolveRequestSubject(
	options: ResolveRequestSubjectOptions
): RequestSubject | null {
	if (
		options.shared ||
		isSpeculativeRequest(toHeaders(options.request.headers))
	) {
		return null;
	}
	const cookieHeader = readCookieHeader(options);
	const subjectId = readStoredRecordsFromCookieHeader(
		cookieHeader,
		options.storage,
		options.now ?? Date.now()
	).subject?.subjectId;
	if (!subjectId) {
		return null;
	}
	return { cookie: cookieHeader, setCookie: null, subjectId };
};
