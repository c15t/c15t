import { databuddy } from '@c15t/scripts/databuddy';
import { googleTagManager } from '@c15t/scripts/google-tag-manager';
import { xPixel } from '@c15t/scripts/x-pixel';

type DemoScript = ReturnType<typeof databuddy>;

/**
 * Returns the demo script definitions used by the example demo app.
 *
 * @param customVendorId - Vendor identifier injected into the custom demo
 * analytics script entry.
 * @returns An array of `DemoScript` objects representing the demo app's
 * third-party and example analytics integrations.
 */
export function createDemoScripts(customVendorId: string): DemoScript[] {
	return [
		{
			id: 'example-analytics-iab',
			src: 'https://www.example.com/analytics.js',
			category: 'measurement',
			vendorId: 1,
		},
		{
			id: 'example-analytics-custom',
			src: 'https://www.example.com/custom-analytics.js',
			category: 'measurement',
			vendorId: customVendorId,
		},
		databuddy({
			clientId: '13a29940-fa67-4036-9970-cc9f8d869ae',
			configWhenGranted: {
				clientId: '13a29940-fa67-4036-9970-cc9f8d869ae',
				disabled: false,
			},
			configWhenDenied: {
				clientId: '13a29940-fa67-4036-9970-cc9f8d869ae',
				disabled: true,
			},
		}),
		xPixel({
			pixelId: 'qvfsy',
		}),
		googleTagManager({
			id: 'GTM-WL5L8NW7',
		}),
	];
}
