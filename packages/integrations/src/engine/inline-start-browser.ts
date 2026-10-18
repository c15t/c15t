/**
 * The browser build of `./inline-start`. Only a server render inlines a
 * vendor start, so browser bundles skip the runner and every vendor falls
 * back to the script loader if this is ever called.
 *
 * @internal
 */
import type { ScriptServerStart } from '@c15t/core';

import type { ManifestStep } from '../types';

export const inlineStepsStart = function inlineStepsStart(
	_steps: ManifestStep[]
): ScriptServerStart | undefined {
	return undefined;
};
