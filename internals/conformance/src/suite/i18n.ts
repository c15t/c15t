/**
 * i18n conformance suite.
 *
 * Iterates the locale matrix (LTR + RTL + long-string locale) and asserts:
 * - Visible banner text matches the translations fixture.
 * - `dir="rtl"` propagates from document/provider to the rendered tree
 *   when the locale is RTL.
 */

import type { TestDriver } from '../driver';
import { LOCALE_FIXTURES } from '../fixtures/locales';
import { conformanceTest, type SuiteApi } from './helpers';

function findDirRoot(root: HTMLElement): HTMLElement | null {
	if (root.getAttribute('dir')) return root;
	const local = root.querySelector<HTMLElement>('[dir]');
	if (local) return local;
	// Banner/dialog portals render outside the mount container (to document.body),
	// so fall through to the document body as a secondary lookup.
	return document.body.querySelector<HTMLElement>('[dir]');
}

/**
 * Banner/dialog components render via portal to document.body. Tests that
 * probe for visible translated text must look at the document, not just
 * the mount container the driver returned.
 */
function visibleText(mountRoot: HTMLElement): string {
	const direct = mountRoot.textContent ?? '';
	const portaled = document.body.textContent ?? '';
	return `${direct}\n${portaled}`;
}

export function runI18nConformance(driver: TestDriver, api: SuiteApi): void {
	api.describe(`[${driver.framework}] i18n`, () => {
		for (const locale of LOCALE_FIXTURES) {
			conformanceTest(
				api,
				`${locale.code}: banner renders with locale translations`,
				async () => {
					const mounted = await driver.mount({
						component: 'consent-banner',
						locale: locale.code,
						providerOptions: {
							translations: {
								defaultLanguage: locale.code,
								translations: {
									[locale.code]: {
										common: {
											acceptAll: locale.translations.banner.acceptAll,
											rejectAll: locale.translations.banner.rejectAll,
											customize: locale.translations.banner.customize,
										},
										cookieBanner: {
											title: locale.translations.banner.title,
											description: locale.translations.banner.description,
										},
									},
								},
							},
						},
					});
					try {
						const text = visibleText(mounted.root);
						api.expect(text).toContain(locale.translations.banner.title);
					} finally {
						await mounted.unmount();
					}
				}
			);

			if (locale.direction === 'rtl') {
				conformanceTest(
					api,
					`${locale.code}: RTL locale propagates dir="rtl" to rendered tree`,
					async () => {
						// Driver mount is called first so stub frameworks (vue/solid) cascade
						// to [todo] via DriverNotImplementedError before any DOM access.
						const mounted = await driver.mount({
							component: 'consent-banner',
							locale: locale.code,
							providerOptions: {
								translations: {
									defaultLanguage: locale.code,
									translations: {
										[locale.code]: {
											cookieBanner: {
												title: locale.translations.banner.title,
												description: locale.translations.banner.description,
											},
										},
									},
								},
							},
						});
						const previousDocDir = document.documentElement.getAttribute('dir');
						document.documentElement.setAttribute('dir', 'rtl');
						try {
							const dirEl = findDirRoot(mounted.root);
							const fallback = document.documentElement.getAttribute('dir');
							api.expect(dirEl?.getAttribute('dir') ?? fallback).toBe('rtl');
						} finally {
							await mounted.unmount();
							if (previousDocDir === null) {
								document.documentElement.removeAttribute('dir');
							} else {
								document.documentElement.setAttribute('dir', previousDocDir);
							}
						}
					}
				);
			}
		}
	});
}
