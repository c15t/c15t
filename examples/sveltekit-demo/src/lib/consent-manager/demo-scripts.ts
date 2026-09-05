import { gtag } from '@c15t/scripts/google-tag';
import { metaPixel } from '@c15t/scripts/meta-pixel';
import { clarity } from '@c15t/scripts/microsoft-clarity';
import { tiktokPixel } from '@c15t/scripts/tiktok-pixel';
import type { Script } from 'c15t';

/** Optional test-account IDs that replace the demo's local vendor fixtures. */
export interface DemoScriptIds {
	metaPixel?: string;
	tiktokPixel?: string;
	googleTag?: string;
	clarity?: string;
}

const fixture = (name: string): string => `/api/devtools-scripts/${name}`;

/**
 * Use real integration helpers with local SDK fixtures by default.
 * @param ids - Test-account IDs for opting into live vendor URLs.
 * @returns Ten scripts covering consent gates and loader lifecycle states.
 */
export const createDemoScripts = (ids: DemoScriptIds = {}): Script[] => {
	const googleTag = gtag({
		category: 'measurement',
		id: ids.googleTag || 'G-C15T-DEMO',
	});
	if (!ids.googleTag) {
		googleTag.src = fixture('google-tag');
	}
	return [
		{
			...metaPixel({
				pixelId: ids.metaPixel || 'c15t-demo-meta',
				scriptSrc: ids.metaPixel ? undefined : fixture('meta-pixel'),
				trackPageView: false,
			}),
			id: ids.metaPixel ? 'meta-pixel-live' : 'meta-pixel-local-fixture',
		},
		{
			...tiktokPixel({
				pixelId: ids.tiktokPixel || 'c15t-demo-tiktok',
				scriptSrc: ids.tiktokPixel ? undefined : fixture('tiktok-pixel'),
			}),
			id: ids.tiktokPixel ? 'tiktok-pixel-live' : 'tiktok-pixel-local-fixture',
		},
		{
			...googleTag,
			id: ids.googleTag ? 'google-tag-live' : 'google-tag-local-fixture',
		},
		{
			...clarity({
				id: ids.clarity || 'c15t-demo-clarity',
				scriptUrl: ids.clarity ? undefined : fixture('clarity'),
			}),
			id: ids.clarity ? 'clarity-live' : 'clarity-local-fixture',
		},
		{ category: 'necessary', id: 'inline-necessary', textContent: 'void 0;' },
		{
			callbackOnly: true,
			category: 'marketing',
			id: 'callback-only-marketing',
		},
		{
			category: 'measurement',
			id: 'delayed-measurement',
			src: fixture('delayed'),
		},
		{
			category: 'measurement',
			id: 'intentional-load-error',
			src: fixture('failure'),
		},
		{
			category: 'measurement',
			id: 'iab-vendor-fixture',
			src: fixture('iab-vendor'),
			vendorId: 1,
		},
		{
			category: 'measurement',
			id: 'iab-custom-vendor-fixture',
			src: fixture('iab-custom'),
			vendorId: 'internal-analytics',
		},
	];
};
