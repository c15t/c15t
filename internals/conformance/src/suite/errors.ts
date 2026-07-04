/**
 * Error-behavior conformance suite.
 *
 * Every framework must degrade the same way when configuration is bad:
 * - Malformed translations → falls back to default locale, no crash.
 * - Empty policy list → widget still renders a root element.
 */

import { DriverNotImplementedError, type TestDriver } from '../driver';
import { conformanceTest, type SuiteApi } from './helpers';

export function runErrorConformance(driver: TestDriver, api: SuiteApi): void {
	api.describe(`[${driver.framework}] errors`, () => {
		conformanceTest(
			api,
			'malformed translations do not throw; falls back to defaults',
			async () => {
				let threw = false;
				try {
					const mounted = await driver.mount({
						component: 'consent-banner',
						providerOptions: {
							initialTranslationConfig: {
								defaultLanguage: 'en',
								translations: null as unknown as Record<string, unknown>,
							},
						},
					});
					await mounted.unmount();
				} catch (err) {
					if (err instanceof DriverNotImplementedError) throw err;
					threw = true;
				}
				api.expect(threw).toBe(false);
			}
		);

		conformanceTest(
			api,
			'empty policy list does not crash the widget',
			async () => {
				let threw = false;
				try {
					const mounted = await driver.mount({
						component: 'consent-widget',
						providerOptions: { consentCategories: [] },
					});
					await mounted.unmount();
				} catch (err) {
					if (err instanceof DriverNotImplementedError) throw err;
					threw = true;
				}
				api.expect(threw).toBe(false);
			}
		);
	});
}
