/**
 * The visitor's subject ID for one server request, set as a first-party
 * cookie on the first response.
 *
 * A browser runtime takes its subject ID from the records, else from
 * `<storageKey>-sid`, else makes one. When a server answers the first
 * request, it can make that ID instead: the response sets `<storageKey>-sid`,
 * the render in the same request reads it, and the browser starts with it.
 * The cookie holds only the ID. It is never read as a choice, so the banner
 * still shows.
 *
 * A shared render (prerendered or cached HTML) and a speculative request
 * (prefetch or prerender) get nothing: a cookie set on either would belong
 * to every visitor the response reaches, or to a page the visitor never
 * opened.
 */
import { isSpeculativeRequest } from '@c15t/schema/types';

import { rootDomainOf } from '../libs/cookie/domain-utils';
import type { StorageConfig } from '../libs/cookie/types';
import { generateSubjectId } from '../libs/generate-subject-id';
import { readStoredRecordsFromCookieHeader } from '../modules/persistence/hydrate';
import {
	readStoredSubjectIdFromCookieHeader,
	resolveStorageKeys,
} from '../modules/persistence/record-storage';
import { resolveRequestOrigin } from './request-origin';
import type { RequestHeaderSource } from './request-origin';

/** Options for {@link resolveRequestSubject}. */
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
	 * The storage configuration the browser runtime uses: `storageKey` names
	 * the cookie, `defaultExpiryDays`, `defaultDomain` and `crossSubdomain`
	 * set its attributes the way the browser would.
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
	 * Read the request's scheme and host from forwarding headers. See
	 * {@link ResolveRequestOriginOptions.trustForwardedHeaders}.
	 *
	 * @defaultValue false
	 */
	trustForwardedHeaders?: boolean;

	/** The clock for reading stored records. Defaults to `Date.now()`. */
	now?: number;
}

/** The subject cookie a response sets. */
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

/** The subject for one request. */
export interface RequestSubject {
	/** The visitor's subject ID. */
	subjectId: string;
	/**
	 * The request `Cookie` header, with `<storageKey>-sid` added when the
	 * request had none. Hand it to the render in the same request, so it
	 * reads the ID before the browser has the cookie.
	 */
	cookie: string;
	/**
	 * The cookie to set on the response. `null` when the request already
	 * has a `<storageKey>-sid` cookie, even one holding a different ID.
	 */
	setCookie: SubjectCookie | null;
}

const SECONDS_PER_DAY = 86_400;
// A URL host may hold characters such as `;` that would end the `Domain`
// attribute and start another, so a domain taken from the request is used
// only when it is made of hostname characters or is an IPv6 literal.
const COOKIE_DOMAIN = /^(?:[a-z0-9_.-]+|\[[0-9a-f:.]+\])$/iu;

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
	if (headers instanceof Headers) {
		return headers;
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

/** `cookieHeader` with every `name` cookie replaced by `name=value`. */
const withCookie = function withCookie(
	cookieHeader: string,
	name: string,
	value: string
): string {
	const others = cookieHeader
		.split(';')
		.map((part) => part.trim())
		.filter((part) => part && !part.startsWith(`${name}=`));
	return [...others, `${name}=${value}`].join('; ');
};

const subjectCookie = function subjectCookie(
	options: ResolveRequestSubjectOptions,
	name: string,
	subjectId: string
): SubjectCookie {
	const { storage } = options;
	const origin = resolveRequestOrigin({
		headers: options.request.headers,
		requestURL: options.request.url,
		trustForwardedHeaders: options.trustForwardedHeaders === true,
	});
	const url = origin ? new URL(origin) : null;
	const secure = url?.protocol === 'https:';
	// The browser's `writeCookie` puts the cookie on the root domain
	// whenever `crossSubdomain` is set, even with a `defaultDomain`. Two
	// cookies of one name on different domains could bring back an old ID,
	// so this follows the same rule.
	let domain = storage?.defaultDomain || undefined;
	if (storage?.crossSubdomain && url) {
		const root = rootDomainOf(url.hostname);
		domain = COOKIE_DOMAIN.test(root) ? root : undefined;
	}
	const maxAge = Math.round(
		(storage?.defaultExpiryDays ?? 365) * SECONDS_PER_DAY
	);
	const header = [
		`${name}=${encodeURIComponent(subjectId)}`,
		`Max-Age=${maxAge}`,
		'Path=/',
		...(domain ? [`Domain=${domain}`] : []),
		...(secure ? ['Secure'] : []),
		'SameSite=Lax',
	].join('; ');
	return {
		domain,
		header,
		httpOnly: false,
		maxAge,
		name,
		path: '/',
		sameSite: 'lax',
		secure,
		value: subjectId,
	};
};

/**
 * Reads the visitor's subject ID from the request, or makes one for a
 * visitor who has none, with the cookie the response sets to keep it.
 *
 * The ID the stored consent records carry wins, then the one in
 * `<storageKey>-sid`, then a new one: the order the browser runtime uses.
 * While the browser's cookie writes succeed, it starts with the same ID.
 * Only cookies are read. If the browser refused to rewrite a record cookie
 * after the subject ID changed, that cookie keeps the old ID and this
 * returns it, while the browser starts with the new ID from localStorage.
 * This happens even when the request's `<storageKey>-sid` cookie already
 * holds the new ID. It lasts until a later write of the record reaches the
 * cookie, which may never happen while the browser keeps refusing it. A
 * `<storageKey>-sid` cookie the request already holds is never replaced,
 * so the old ID is never stored over the new one.
 *
 * Call it from request middleware, set `setCookie` on the response when it
 * is not `null`, and pass `cookie` to the render in the same request.
 *
 * @param options - The request, the storage configuration and whether the
 * response is shared.
 * @returns The subject, or `null` for a shared or speculative request.
 * @example
 * ```ts
 * const subject = resolveRequestSubject({ request: { headers, url } });
 * if (subject?.setCookie) {
 * 	// A response from fetch() or Response.redirect() has immutable
 * 	// headers, so the cookie goes on a copy.
 * 	response = new Response(response.body, response);
 * 	response.headers.append('set-cookie', subject.setCookie.header);
 * }
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
	const name = resolveStorageKeys(options.storage).subject;
	const stored = readStoredSubjectIdFromCookieHeader(
		cookieHeader,
		options.storage
	);
	const recorded = readStoredRecordsFromCookieHeader(
		cookieHeader,
		options.storage,
		options.now ?? Date.now()
	).subject?.subjectId;
	const subjectId = recorded ?? stored ?? generateSubjectId();
	if (stored) {
		return { cookie: cookieHeader, setCookie: null, subjectId };
	}
	return {
		cookie: withCookie(cookieHeader, name, encodeURIComponent(subjectId)),
		setCookie: subjectCookie(options, name, subjectId),
		subjectId,
	};
};
