'use client';

import type * as C15tCoreTypes from '@c15t/core';
import type { ConsentSnapshot } from '@c15t/core';
import { useEffect } from 'react';
import type { ComponentType } from 'react';

import {
	registerDialogChunkWarmer,
	useIdleDialogWarming,
} from './chunk-warming';
import type {
	ConsentDialogCompoundComponent,
	ConsentDialogProps,
} from './components/panel';
import type {
	ConsentWidgetCompoundComponent,
	ConsentWidgetProps,
} from './components/preferences';
import type {
	ConsentBannerCompoundComponent,
	ConsentBannerProps,
} from './components/prompt';
import { FIRST_PAINT_SHEETS } from './components/shared/first-paint-sheets';
import { StreamedConsentSurface } from './components/shared/streamed-surface';
import { preloadSurfaceSheets } from './components/shared/surface-styles';
import { useActiveUI } from './hooks';
import { useIABPolicyGuard } from './hooks/use-iab-policy-guard';
import { useKernelSelector } from './kernel-selector';
import { createDeferredModule } from './utils/deferred-module';

type AnyComponent = ComponentType<Record<string, unknown>>;

// Vite derives chunk names from these paths. Keep them neutral so URL filters
// do not block the UI. Each module is shared by its default and compound exports.
// A deferred first-paint sheet the page lacks loads beside the dialog's
// code, not after it. The dialog waits for it before opening, so a failed
// sheet load leaves the module usable.
const dialogModule = createDeferredModule(() => {
	void preloadSurfaceSheets(FIRST_PAINT_SHEETS);
	return import('./components/panel');
});
const widgetModule = createDeferredModule(
	() => import('./components/preferences')
);
const bannerModule = createDeferredModule(() => import('./components/prompt'));
// The server renders a banner the policy shows into the first HTML. Load
// its code at startup, so that render has it.
if (typeof document === 'undefined') {
	void bannerModule.preload();
}
const lazyDialogExport = (name: string) =>
	dialogModule.component(
		(module) => (module as Record<string, unknown>)[name] as AnyComponent
	);
const lazyWidgetExport = (name: string) =>
	widgetModule.component(
		(module) => (module as Record<string, unknown>)[name] as AnyComponent
	);
const lazyBannerExport = (name: string) =>
	bannerModule.component(
		(module) =>
			(module.ConsentBanner as unknown as Record<string, unknown>)[
				name
			] as AnyComponent
	);

registerDialogChunkWarmer(() => {
	void dialogModule.preload();
});
const LazyConsentDialogComponent = dialogModule.component(
	(module) => module.ConsentDialog
);
const LazyConsentWidgetComponent = widgetModule.component(
	(module) => module.ConsentWidget
);

const LazyConsentDialog = (props: ConsentDialogProps) => {
	const activeUI = useActiveUI();
	// A shown banner can open the dialog at any moment, whatever renders it.
	useIdleDialogWarming(activeUI === 'banner');
	const shouldLoadDialog =
		props.open === true || activeUI === 'dialog' || Boolean(props.showTrigger);
	if (!shouldLoadDialog) {
		return null;
	}
	return <LazyConsentDialogComponent {...props} />;
};

const LazyConsentWidget = (props: ConsentWidgetProps) => (
	<LazyConsentWidgetComponent {...props} />
);

const LazyConsentBannerComponent = bannerModule.component(
	(module) => module.ConsentBanner
);

/** Matches the default of the banner root's own `models` prop. */
const DEFAULT_BANNER_MODELS: readonly C15tCoreTypes.Model[] = [
	'opt-in',
	'opt-out',
];

/**
 * Whether a banner may show before the policy has resolved: nothing says
 * otherwise until the visitor has made or dismissed a choice.
 */
const bannerLikely = (snap: ConsentSnapshot): boolean =>
	snap.activeUI === 'banner' ||
	(snap.resolution.status !== 'matched' &&
		snap.explicitChoice === null &&
		snap.noticeDismissal === null);

const ConsentBannerGate = (props: ConsentBannerProps) => {
	// Here as well as in the banner: it throws without the banner's code.
	useIABPolicyGuard();
	const models = props.models ?? DEFAULT_BANNER_MODELS;
	const show = useKernelSelector(
		(snap) =>
			snap.activeUI === 'banner' &&
			snap.resolution.status === 'matched' &&
			models.includes(snap.model)
	);
	const likely = useKernelSelector(bannerLikely);
	// A banner the browser shows later, once the policy resolves, needs its
	// code then. Load it meanwhile, unless a stored choice makes it unlikely.
	useEffect(() => {
		if (likely) {
			void bannerModule.preload();
		}
	}, [likely]);
	return show ? <LazyConsentBannerComponent {...props} /> : null;
};

/**
 * The banner's code loads only when it shows, or may show soon. A returning
 * visitor whose choice stands downloads none of it. A server-rendered
 * banner keeps its HTML until the code arrives, and an early tap on it is
 * replayed then.
 */
const LazyConsentBanner = (props: ConsentBannerProps) => (
	<StreamedConsentSurface>
		<ConsentBannerGate {...props} />
	</StreamedConsentSurface>
);

const withLazyProperties = function withLazyProperties<T extends AnyComponent>(
	component: T,
	names: readonly string[],
	factory: (name: string) => AnyComponent
): T {
	const cache: Record<string, AnyComponent> = {};
	for (const name of names) {
		Object.defineProperty(component, name, {
			configurable: true,
			enumerable: true,
			get() {
				cache[name] ??= factory(name);
				return cache[name];
			},
		});
	}
	return component;
};

export const ConsentDialog = withLazyProperties(
	LazyConsentDialog,
	[
		'Card',
		'Header',
		'HeaderTitle',
		'HeaderDescription',
		'Content',
		'Footer',
		'ConsentCustomizationCard',
		'ConsentDialogFooter',
		'ConsentDialogHeader',
		'ConsentDialogHeaderTitle',
		'ConsentDialogHeaderDescription',
		'ConsentDialogContent',
		'Overlay',
		'Root',
	],
	lazyDialogExport
) as ConsentDialogCompoundComponent;

export const ConsentWidget = withLazyProperties(
	LazyConsentWidget,
	[
		'AccordionTrigger',
		'AccordionTriggerInner',
		'AccordionContent',
		'AccordionArrow',
		'Accordion',
		'Switch',
		'AccordionItems',
		'AccordionItem',
		'VendorList',
		'Root',
		'AcceptAllButton',
		'CustomizeButton',
		'SaveButton',
		'RejectButton',
		'PolicyActions',
		'Footer',
		'FooterSubGroup',
	],
	lazyWidgetExport
) as ConsentWidgetCompoundComponent;

export const ConsentBanner = withLazyProperties(
	LazyConsentBanner,
	[
		'AcceptButton',
		'Actions',
		'Card',
		'Content',
		'CustomizeButton',
		'Description',
		'DismissButton',
		'Footer',
		'FooterSubGroup',
		'Header',
		'Overlay',
		'PolicyActions',
		'RejectButton',
		'RightLink',
		'Rights',
		'Root',
		'Title',
	],
	lazyBannerExport
) as ConsentBannerCompoundComponent;
