/**
 * Headers every c15t-backend-bound request carries.
 *
 * `x-c15t-version` (issue #916) is telemetry: it lets the backend attribute
 * traffic to a client version. It is never used to guess what a client can
 * represent.
 *
 * `x-c15t-policy-contract` (issue #1025) is the capability declaration: the
 * policy wire contract version this client reads. A producer that speaks a
 * different contract answers with an explicit `unsupported-contract`
 * failure instead of a wire the client would misread, and echoes its own
 * version in the same response header so the client can tell a negotiated
 * producer from one that predates the contract.
 *
 * Scope: every c15t-bound request — hosted `/init` + `/subjects`,
 * manifest-mode `/subjects`, the manifest document fetch, the GVL fetch,
 * and the Next/Nuxt server proxies' upstream manifest calls. The manifest
 * and GVL hosts are c15t/tenant-controlled infrastructure (IAB TCF policy
 * requires CMPs to self-host the GVL rather than hotlink IAB's), so the
 * headers are safe and version-gated manifest serving stays possible.
 *
 * CORS note: the backend allowlists both headers (`createApp` in
 * `@c15t/backend`). On cross-origin hosted mode the otherwise-simple `/init`
 * GET was already preflighted by `x-c15t-version`; the contract header adds
 * no further roundtrip. Same-origin and manifest modes are unaffected.
 */
import {
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
} from '@c15t/schema/types';

import { version } from '../version';

export const C15T_VERSION_HEADER = 'x-c15t-version';

/** Request header naming the policy contract this client reads. */
export const C15T_POLICY_CONTRACT_HEADER = POLICY_CONTRACT_HEADER;

/** Header record to spread into backend-bound request headers. */
export const c15tVersionHeaders: Readonly<Record<string, string>> = {
	[C15T_VERSION_HEADER]: version,
};

/**
 * Version telemetry plus the policy contract declaration, for every
 * backend-bound request.
 */
export const c15tProtocolHeaders: Readonly<Record<string, string>> = {
	...c15tVersionHeaders,
	[C15T_POLICY_CONTRACT_HEADER]: String(POLICY_CONTRACT_VERSION),
};

/**
 * The policy contract a producer declared on its response, if any.
 *
 * `undefined` means the producer predates the contract (no header). A
 * present but unparseable value is `null`: the producer claims a contract
 * this client cannot even read, which is not the same as claiming none.
 */
export const readProducerPolicyContract = function readProducerPolicyContract(
	headers: Pick<Headers, 'get'> | undefined
): number | null | undefined {
	const value = headers?.get(C15T_POLICY_CONTRACT_HEADER);
	if (value === null || value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return /^\d+$/u.test(trimmed) ? Number.parseInt(trimmed, 10) : null;
};
