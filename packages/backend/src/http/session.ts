/**
 * Session reports: how a backend learns about visitors it never served.
 *
 * `/init` used to be the one request every visitor made, which made its
 * request log the visitor count. Manifest mode (RFC 0001) removes that
 * request on purpose: the host resolves init from a cached manifest and the
 * backend hears nothing until a consent is saved. `POST /sessions` is the
 * replacement signal, sent server-to-server by the host after it resolves.
 *
 * The backend's own `/init` emits the same event, so a deployment that
 * counts sessions from one hook sees hosted and manifest traffic alike and
 * needs no second path for the old route.
 *
 * Nothing is stored. Sessions are high volume and not consent records, so
 * they belong in a log pipeline or an analytics store, not the consent
 * database. The route puts the report on the request's wide event and
 * hands it to `sessions.onReport`; where it goes from there is the
 * deployment's call.
 */

import { getIpAddress, maskIpAddress } from '@c15t/schema/geo';
import type { IpAddressConfig } from '@c15t/schema/geo';
import {
	CONSENT_REQUEST_HEADER_NAMES,
	CONSENT_SESSION_CLIENT_IP_HEADER,
} from '@c15t/schema/types';
import type { ConsentSessionReport } from '@c15t/schema/types';
import type { Context } from 'hono';

import { toRequestLog } from '../observability/evlog';
import type { AppOptions } from './context';

/** Request context handed to {@link SessionOptions.onReport}. */
export interface SessionReportContext {
	/**
	 * The visitor's IP. For a host's report it is the `x-c15t-client-ip`
	 * header the host set; for the backend's own `/init` it is derived from
	 * the connection's proxy headers. Either way the instance's `ipAddress`
	 * settings apply, so masking and `tracking: false` hold for session
	 * reports exactly as they do for consent records.
	 */
	readonly ip: string | null;
	/** The visitor's user agent, forwarded by the host. */
	readonly userAgent: string | null;
	/**
	 * The request headers a sink may need, and only those: the client
	 * version and policy contract, the user agent, and the language, geo and
	 * GPC inputs. On `/init` the request is the visitor's own and carries
	 * cookies and credentials; those never reach a sink. Nor does any raw
	 * address: the visitor's IP is `ip`, after the instance's settings.
	 */
	readonly headers: Headers;
}

export interface SessionOptions {
	/**
	 * Receives every session report: hosts' `POST /sessions` and the
	 * backend's own `/init`. A failure never fails the request; it is
	 * recorded on the request's wide event. `POST /sessions` waits for the
	 * sink, since only the reporting host waits on that response; `/init`
	 * does not, so a visitor's response is never delayed by a sink.
	 */
	readonly onReport?: (
		report: ConsentSessionReport,
		context: SessionReportContext
	) => void | Promise<void>;
}

/**
 * The tenant every session on this instance belongs to: the configured
 * tenant, else the null scope. The same scope every row this instance
 * writes carries; the manifest's own `tenantId` is not consulted, since a
 * session partitioned under a tenant the instance's queries do not serve
 * would be unreachable from its data.
 */
export const instanceTenant = function instanceTenant(
	options: AppOptions
): string | null {
	return options.tenantId ?? null;
};

/** Request headers a session sink may see. Everything else is dropped. */
const SINK_HEADER_NAMES: readonly string[] = [
	'user-agent',
	'x-c15t-version',
	'x-c15t-policy-contract',
	...CONSENT_REQUEST_HEADER_NAMES,
];

/**
 * The headers a sink receives: an allowlisted copy, never the request's
 * own collection. A `/init` request is the visitor's browser talking to the
 * backend, cookies and `Authorization` included, and a sink that logs or
 * forwards its context must not be handed those. The raw address stays out
 * too, or `ipAddress.masking` and `tracking: false` would mean nothing.
 */
const sinkHeaders = function sinkHeaders(headers: Headers): Headers {
	const allowed = new Headers();
	for (const name of SINK_HEADER_NAMES) {
		const value = headers.get(name);
		if (value) {
			allowed.set(name, value);
		}
	}
	return allowed;
};

/** The instance's IP settings applied to an address a host reported. */
const applyIpConfig = function applyIpConfig(
	ip: string,
	config: IpAddressConfig | undefined
): string | null {
	if (config?.tracking === false) {
		return null;
	}
	return config?.masking === false ? ip : maskIpAddress(ip);
};

/** Where a session's visitor address comes from. */
export type SessionIpSource =
	/** A host's `POST /sessions`: the address the host put on the report. */
	| 'report'
	/** The backend's own `/init`: the connection's proxy headers. */
	| 'connection';

/**
 * The visitor's IP for a session.
 *
 * A host's report names the visitor only on the dedicated header; the
 * connection behind it is the host's server, so a report without the header
 * has no address rather than the wrong one. On `/init` the caller is the
 * visitor's own browser or any HTTP client, either of which could set that
 * header, so the address comes from the connection the way it does for a
 * consent record.
 */
const sessionIp = function sessionIp(
	headers: Headers,
	source: SessionIpSource,
	config: IpAddressConfig | undefined
): string | null {
	if (source === 'report') {
		const reported = headers
			.get(CONSENT_SESSION_CLIENT_IP_HEADER)
			?.split(',')[0]
			?.trim();
		return reported ? applyIpConfig(reported, config) : null;
	}
	return getIpAddress(headers, config);
};

/**
 * Records a session on the wide event and hands it to the configured sink.
 *
 * Returns the sink's promise, which never rejects: a failing sink is
 * recorded on the wide event and must not fail the request. `POST /sessions`
 * awaits it, since only the reporting host waits on that response; `/init`
 * lets it run detached so a visitor's response is never delayed by a sink.
 */
export const emitConsentSession = function emitConsentSession(
	c: Context,
	options: AppOptions,
	report: ConsentSessionReport,
	ipSource: SessionIpSource
): Promise<void> {
	const log = toRequestLog(c.get('log'));
	const { headers } = c.req.raw;
	const context: SessionReportContext = {
		headers: sinkHeaders(headers),
		ip: sessionIp(headers, ipSource, options.ipAddress),
		userAgent: headers.get('user-agent'),
	};
	log?.set({ session: { ...report, ip: context.ip } });

	const sink = options.sessions?.onReport;
	if (!sink) {
		return Promise.resolve();
	}
	const deliver = async function deliver(): Promise<void> {
		try {
			await sink(report, context);
		} catch (error) {
			log?.error(error instanceof Error ? error : new Error(String(error)), {
				session: { sink: 'failed' },
			});
		}
	};
	return deliver();
};
