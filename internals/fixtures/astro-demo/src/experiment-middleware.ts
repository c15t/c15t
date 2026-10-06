/**
 * The consent middleware with a per-request banner-experiment arm, for the
 * showcase build with `C15T_EXPERIMENT=1`. `astro.showcase.config.mjs`
 * registers it in place of the integration's own middleware.
 *
 * The banner is server-rendered, so the arm is resolved here, the way a flag
 * provider would: `?experiment=1` runs the `control` arm (the default
 * banner), `&arm=wall` the `wall` arm. Without the param no experiment runs.
 */
import { consentMiddleware } from 'c15t/astro/middleware';

export const onRequest = consentMiddleware({
	experimentArm: ({ url }) => {
		if (url.searchParams.get('experiment') !== '1') {
			return undefined;
		}
		return url.searchParams.get('arm') === 'wall' ? 'wall' : 'control';
	},
});
