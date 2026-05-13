/**
 * CMP default values. Single source of truth for cmpId and cmpVersion.
 *
 * @packageDocumentation
 */

import { version } from '../version';

/**
 * Default CMP ID fallback. Zero means no CMP is registered.
 * inth.com provides its registered CMP ID via the `/init` endpoint.
 * Self-hosted users can configure their own via `advanced.iab.cmpId`.
 */
export const CMP_ID = 0;

/** CMP version, aligned with package version. */
export const CMP_VERSION = version;
