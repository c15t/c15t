/**
 * CMP default values. Single source of truth for cmpId and cmpVersion.
 *
 * @packageDocumentation
 */

import { version } from './version';

/** CMP ID (IAB Europe) used by all c15t users. Not restricted to dev; safe as default. */
export const CMP_ID = 0;

/** CMP version, aligned with package version. */
export const CMP_VERSION = version;
