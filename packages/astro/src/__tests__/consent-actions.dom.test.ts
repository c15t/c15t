import type { ConsentPresentation } from '@c15t/core';
import { ConsentBanner, ConsentProvider } from '@c15t/react';
import type { PolicyRule } from '@c15t/schema/types';
import type { Theme } from '@c15t/ui/theme';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { promptClassNames } from '../banner/class-names';
import { PROMPT_SLOT_ATTRIBUTE } from '../banner/slot';
import { buildPrompt, renderPromptIntoSlot } from '../browser/render-prompt';
import { boot } from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions } from '../types';
import { testRule } from './policy-fixture';

/**
 * `theme.consentActions` has to style the Astro banner's buttons the way it
 * styles the React banner's. These render both from one runtime and compare
 * the button attributes the shared stylesheet keys off.
 */

// Every layer takes part: accept is primary, so it gets `primary`; reject
// only gets `default`; customize has a key of its own.
const THEME: Theme = {
	consentActions: {
		customize: { mode: 'ghost', variant: 'neutral' },
		default: { mode: 'filled' },
		primary: { mode: 'stroke', variant: 'primary' },
	},
};

const PRESENTATION: ConsentPresentation = {
	prompt: { primaryActions: ['accept'] },
};

const globals = window as unknown as Record<string, unknown> & {
	IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let client: AstroConsentClient | null = null;
let root: Root | null = null;

/**
 * Boot the page runtime from the config the server inlines for `rule`.
 *
 * @param options - Integration options, without the mode.
 * @param rule - Overrides for the one policy rule.
 * @returns The page client.
 */
const start = async function start(
	options: Omit<C15tAstroOptions, 'mode'>,
	rule: Partial<PolicyRule> = {}
): Promise<AstroConsentClient> {
	const resolved = resolveOptions({
		...options,
		mode: offlineMode({ policyRules: [{ ...testRule, ...rule }] }),
	});
	const { config } = await resolveConsentContext({
		headers: new Headers(),
		options: resolved,
	});
	globals.__c15tAstroConfig = JSON.parse(JSON.stringify(config));
	client = boot(resolved);
	return client;
};

type ButtonStyles = Record<string, { mode?: string; variant?: string }>;

/** The mode and variant of every consent action button under `container`. */
const readButtons = function readButtons(container: ParentNode): ButtonStyles {
	const styles: ButtonStyles = {};
	for (const button of container.querySelectorAll<HTMLElement>(
		'button[data-testid^="consent-banner-"][data-testid$="-button"]'
	)) {
		const action = button.dataset.testid
			?.replace(/^consent-banner-/u, '')
			.replace(/-button$/u, '');
		if (action) {
			styles[action] = {
				mode: button.dataset.mode,
				variant: button.dataset.variant,
			};
		}
	}
	return styles;
};

/** The React banner's buttons, rendered against the Astro page runtime. */
const renderReactBanner = async function renderReactBanner(
	booted: AstroConsentClient,
	options: { presentation?: ConsentPresentation; theme?: Theme }
): Promise<ButtonStyles> {
	const host = document.createElement('div');
	document.body.append(host);
	root = createRoot(host);
	await act(async () => {
		root?.render(
			createElement(
				ConsentProvider,
				{ options, runtime: booted.runtime },
				createElement(ConsentBanner)
			)
		);
		await Promise.resolve();
	});
	return readButtons(document.body);
};

/** The Astro banner's buttons, from the browser renderer. */
const renderAstroBanner = function renderAstroBanner(
	booted: AstroConsentClient,
	options: { presentation?: ConsentPresentation; theme?: Theme },
	props: { noStyle?: boolean } = {}
): ButtonStyles {
	const host = document.createElement('div');
	host.append(
		...buildPrompt(
			booted.getConsent(),
			{ classNames: promptClassNames, props },
			options
		)
	);
	return readButtons(host);
};

// jsdom has no `matchMedia`; the React banner reads reduced motion from it.
beforeAll(() => {
	window.matchMedia ??= (query: string) =>
		({
			addEventListener: () => undefined,
			addListener: () => undefined,
			dispatchEvent: () => false,
			matches: false,
			media: query,
			onchange: null,
			removeEventListener: () => undefined,
			removeListener: () => undefined,
		}) as MediaQueryList;
});

beforeEach(() => {
	globals.IS_REACT_ACT_ENVIRONMENT = true;
	localStorage.clear();
	document.body.innerHTML = '';
	globals.__c15tAstro = undefined;
	globals.__c15tAstroConfig = undefined;
	globals.__c15tAstroActions = undefined;
});

afterEach(() => {
	act(() => root?.unmount());
	root = null;
	client?.dispose();
	client = null;
});

describe('theme.consentActions on the Astro banner', () => {
	it('styles each button the way the React banner does', async () => {
		const options = { presentation: PRESENTATION, theme: THEME };
		const booted = await start(options);

		const astro = renderAstroBanner(booted, options);
		const react = await renderReactBanner(booted, options);

		expect(Object.keys(react).toSorted()).toEqual([
			'accept',
			'customize',
			'reject',
		]);
		expect(astro).toEqual(react);
		// Pinned too, so a change to both banners at once still shows up.
		expect(astro).toEqual({
			accept: { mode: 'stroke', variant: 'primary' },
			customize: { mode: 'ghost', variant: 'neutral' },
			reject: { mode: 'filled', variant: 'neutral' },
		});
	});

	it('leads a notice with its dismiss button, as the React banner does', async () => {
		const options = {
			theme: { consentActions: { primary: { mode: 'filled' } } } as Theme,
		};
		const booted = await start(options, {
			id: 'notice',
			model: 'opt-out',
			prompt: 'notice',
		});

		const astro = renderAstroBanner(booted, options);
		const react = await renderReactBanner(booted, options);

		expect(astro).toEqual(react);
		expect(astro.dismiss).toEqual({ mode: 'filled', variant: 'primary' });
	});

	it('renders the integration theme into the spot a prerendered page left', async () => {
		const booted = await start({ presentation: PRESENTATION, theme: THEME });
		const spot = document.createElement('div');
		spot.setAttribute(
			PROMPT_SLOT_ATTRIBUTE,
			JSON.stringify({ classNames: promptClassNames, props: {} })
		);
		document.body.append(spot);

		// The boot script hands the renderer the whole resolved options.
		expect(renderPromptIntoSlot(booted.getConsent(), booted.options)).toBe(
			true
		);
		expect(readButtons(document.body)).toEqual({
			accept: { mode: 'stroke', variant: 'primary' },
			customize: { mode: 'ghost', variant: 'neutral' },
			reject: { mode: 'filled', variant: 'neutral' },
		});
	});

	it('drops the button styles with `noStyle`', async () => {
		const options = { presentation: PRESENTATION, theme: THEME };
		const booted = await start(options);

		const astro = renderAstroBanner(booted, options, { noStyle: true });

		expect(astro).toEqual({
			accept: { mode: undefined, variant: undefined },
			customize: { mode: undefined, variant: undefined },
			reject: { mode: undefined, variant: undefined },
		});
	});
});
