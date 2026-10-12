import { defineExperiment } from 'c15t';
import type { ExperimentArmName } from 'c15t';

/**
 * Does a full-width bar at the bottom of the page get as many opt-ins as
 * the floating card, while covering less of the shop?
 *
 * `control` is the stock banner in Northwind's theme: a card in the
 * bottom-left corner. The `bar` arm changes only the shape. The policy,
 * the copy and the buttons stay the same, so both arms record choices under
 * the same policy.
 */
export const bannerExperiment = defineExperiment({
	arms: {
		bar: { prompt: { variant: 'bar' } },
	},
	id: 'banner-layout',
	// Used only when the flag lookup returns nothing and c15t picks the arm.
	split: { bar: 50, control: 50 },
});

export type BannerArm = ExperimentArmName<typeof bannerExperiment>;

/**
 * Stands in for your feature-flag client. Here the flag comes from
 * `NEXT_PUBLIC_BANNER_LAYOUT`, which Next.js inlines at build time. Swap the
 * body for your provider's lookup:
 *
 *   growthbook.getFeatureValue('banner-layout', undefined)
 *   ldClient.stringVariation('banner-layout', undefined)
 *
 * PostHog resolves flags asynchronously, so wait for them before mounting
 * the provider: https://c15t.com/docs/guides/banner-experiments#posthog
 */
const readFlag = (): string | undefined =>
	process.env.NEXT_PUBLIC_BANNER_LAYOUT;

/**
 * The arm the flag assigned, or `undefined` to let c15t pick one by
 * `split`. c15t records who assigned the arm (`host` or `c15t`) with every
 * impression and choice.
 */
export const bannerArmFromFlag = (): BannerArm | undefined => {
	const value = readFlag();
	return value === 'control' || value === 'bar' ? value : undefined;
};
