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

import { getIpAddress } from '@c15t/schema/geo';
import type { ConsentSessionReport } from '@c15t/schema/types';
import type { Context } from 'hono';

import { toRequestLog } from '../observability/evlog';
import type { AppOptions } from './context';

/** Request context handed to {@link SessionOptions.onReport}. */
export interface SessionReportContext {
	/**
	 * The visitor's IP, derived through the instance's `ipAddress` settings
	 * from the forwarded headers, so masking and `tracking: false` apply to
	 * session reports exactly as they do to consent records.
	 */
	readonly ip: string | null;
	/** The visitor's user agent, forwarded by the host. */
	readonly userAgent: string | null;
	/** The report request's headers, for anything else a sink needs. */
	readonly headers: Headers;
}

export interface SessionOptions {
	/**
	 * Receives every session report: hosts' `POST /sessions` and the
	 * backend's own `/init`. Runs detached from the response; a thrown error
	 * or rejection is recorded on the request's wide event and otherwise
	 * ignored.
	 */
	readonly onReport?: (
		report: ConsentSessionReport,
		context: SessionReportContext
	) => void | Promise<void>;
}

/**
 * Records a session on the wide event and hands it to the configured sink.
 *
 * Not awaited by callers: the response must not wait on a sink, and a
 * failing sink must not fail a visitor's init.
 */
export const emitConsentSession = function emitConsentSession(
	c: Context,
	options: AppOptions,
	report: ConsentSessionReport
): void {
	const log = toRequestLog(c.get('log'));
	const { headers } = c.req.raw;
	const context: SessionReportContext = {
		headers,
		ip: getIpAddress(headers, options.ipAddress),
		userAgent: headers.get('user-agent'),
	};
	log?.set({ session: { ...report, ip: context.ip } });

	const sink = options.sessions?.onReport;
	if (!sink) {
		return;
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
	// Detached on purpose: the response must not wait on a sink.
	void deliver();
};
