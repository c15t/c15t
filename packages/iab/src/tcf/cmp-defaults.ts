/**
 * CMP defaults. Single source of truth for the CMP version c15t reports.
 *
 * There is deliberately no default CMP ID. A CMP ID is assigned by IAB Europe
 * at registration, so a placeholder would produce a TC String that names a
 * provider that is not us. See `cmp-id.ts` for the validation that enforces
 * that, and the hosted path, where the backend returns `cmpId` from `/init`.
 *
 * @packageDocumentation
 */

import { version } from '../version';

/** CMP version as published, e.g. `3.0.0-alpha.1`. */
export const CMP_VERSION = version;

/**
 * CMP version as the integer the TC String and `__tcfapi` report.
 *
 * The TCF `cmpVersion` field is an integer the CMP increments per release, so
 * it carries the package major rather than the full semver string.
 */
export const CMP_VERSION_NUMBER = Number.parseInt(version, 10) || 1;
