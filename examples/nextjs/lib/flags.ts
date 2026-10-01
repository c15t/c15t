import { headers } from 'next/headers';

/** The values of the demo's `banner-shape` flag. `off` keeps a visitor out. */
export type BannerShapeFlag = 'off' | 'control' | 'wall';

/**
 * Stands in for a flag provider, such as `flag()` from the Vercel Flags SDK.
 * The demo takes the value from `?arm=`, which `proxy.ts` copies into a
 * request header because a layout cannot read search params.
 */
export const bannerShapeFlag = async (): Promise<BannerShapeFlag> => {
	const arm = (await headers()).get('x-example-experiment-arm');
	return arm === 'off' || arm === 'wall' ? arm : 'control';
};
