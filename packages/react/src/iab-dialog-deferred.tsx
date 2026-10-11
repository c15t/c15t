'use client';

/**
 * `IABConsentDialog`, loaded on demand like the standard `ConsentDialog`.
 *
 * The preference centre is most of the IAB UI's code, and the banner shows
 * first. The wrapper renders nothing until the dialog first opens or its
 * trigger shows, and the module warms while the IAB banner is up: in idle
 * time after the page loads, and when a pointer or focus reaches a banner
 * button that opens the dialog.
 *
 * @internal
 * @packageDocumentation
 */

import type * as C15tCoreTypes from '@c15t/core';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

import {
	registerDialogChunkWarmer,
	useIdleDialogWarming,
} from './chunk-warming';
import type {
	IABConsentDialogCompoundComponent,
	IABConsentDialogProps,
} from './components/iab-panel';
import type { ConsentDialogTriggerProps } from './components/panel-trigger';
import { useActiveUI, useModel } from './hooks';
import { useIsHydrated } from './hooks/use-is-hydrated';
import { useIAB } from './iab-context';
import { createDeferredModule } from './utils/deferred-module';

type AnyComponent = ComponentType<Record<string, unknown>>;

/** Matches the default of the dialog's own `models` prop. */
const DEFAULT_MODELS: readonly C15tCoreTypes.Model[] = ['iab'];

// Vite derives the chunk name from this path; keep it neutral so URL filters
// do not block the UI.
const iabDialogModule = createDeferredModule(
	() => import('./components/iab-panel')
);

/**
 * Mounted `IABConsentDialog`s whose `models` include the visitor's model.
 * Warming is shared with the standard dialog: a hover on any button that
 * opens a dialog, or idle time while any banner shows, fires every warmer.
 * Under another model this dialog cannot open, so its chunk waits.
 */
let openableDialogs = 0;
let warmRequested = false;

registerDialogChunkWarmer(() => {
	warmRequested = true;
	if (openableDialogs > 0) {
		void iabDialogModule.preload();
	}
});

const LazyIABConsentDialogComponent = iabDialogModule.component(
	(module) => module.IABConsentDialog
);
// The trigger alone, for a model the dialog does not open under.
const LazyConsentDialogTrigger = createDeferredModule(
	() => import('./components/panel-trigger')
).component((module) => module.ConsentDialogTrigger);

const resolveTriggerProps = (
	showTrigger: IABConsentDialogProps['showTrigger']
): ConsentDialogTriggerProps | null => {
	if (showTrigger === true) {
		return {};
	}
	return showTrigger || null;
};

const LazyIABConsentDialog = (props: IABConsentDialogProps) => {
	const activeUI = useActiveUI();
	const model = useModel();
	const iab = useIAB();
	const hydrated = useIsHydrated();
	const models = props.models ?? DEFAULT_MODELS;
	const modelMatches = model !== null && models.includes(model);

	useEffect(() => {
		if (!modelMatches) {
			return;
		}
		openableDialogs += 1;
		// A warm that fired before the model resolved skipped this chunk.
		if (warmRequested) {
			void iabDialogModule.preload();
		}
		return () => {
			openableDialogs -= 1;
		};
	}, [modelMatches]);

	// A shown IAB banner can open the dialog at any moment.
	useIdleDialogWarming(modelMatches && activeUI === 'banner');

	// The dialog's own open state: a controlled `open={false}` wins over
	// `activeUI`, so it loads nothing.
	const shouldLoad =
		modelMatches &&
		((props.open ?? activeUI === 'dialog') || Boolean(props.showTrigger));
	// Once rendered, stay rendered, as the eager dialog always was: closing
	// then plays the exit animation instead of removing the dialog at once.
	const [rendered, setRendered] = useState(shouldLoad);
	if (shouldLoad && !rendered) {
		setRendered(true);
	}
	if (!(shouldLoad || rendered)) {
		// The eager dialog rendered its trigger under any model. Under one it
		// does not open for, render the trigger without loading the dialog.
		const triggerProps = resolveTriggerProps(props.showTrigger);
		return triggerProps && hydrated && iab?.config.enabled ? (
			<LazyConsentDialogTrigger {...triggerProps} />
		) : null;
	}
	return <LazyIABConsentDialogComponent {...props} />;
};

const COMPOUND_PARTS = [
	'Root',
	'Card',
	'Header',
	'Tabs',
	'TabButton',
	'Content',
	'Footer',
	'Overlay',
	'FeatureItem',
	'PurposeItem',
	'StackItem',
	'VendorList',
] as const satisfies readonly (keyof IABConsentDialogCompoundComponent)[];

const parts: Record<string, AnyComponent> = {};
for (const name of COMPOUND_PARTS) {
	Object.defineProperty(LazyIABConsentDialog, name, {
		configurable: true,
		enumerable: true,
		get() {
			parts[name] ??= iabDialogModule.component(
				(module) =>
					(module.IABConsentDialog as unknown as Record<string, AnyComponent>)[
						name
					] as AnyComponent
			);
			return parts[name];
		},
	});
}

/**
 * The IAB TCF preference centre: purposes, stacks, special features and
 * per-vendor consent and legitimate-interest controls.
 *
 * @remarks
 * The component code loads on demand. It downloads in the browser's first
 * idle period after the page's `load` event while the IAB banner is shown,
 * on hover or focus of the banner's Customize button or partners link, or
 * when the dialog opens, whichever comes first. `preloadDialog: 'intent'` in
 * the provider options skips the idle load. `open={true}` or `showTrigger`
 * loads it on mount under a model `models` lists; under another model,
 * `showTrigger` loads only the trigger.
 *
 * The compound parts (`IABConsentDialog.Root`, `.Card`, `.Header`, `.Tabs`,
 * `.TabButton`, `.Content`, `.Footer`, `.Overlay`, `.FeatureItem`,
 * `.PurposeItem`, `.StackItem`, `.VendorList`) load the same module when
 * they render.
 *
 * @example
 * ```tsx
 * <IABProvider cmpId={28}>
 *   <IABConsentBanner />
 *   <IABConsentDialog />
 * </IABProvider>
 * ```
 *
 * @public
 */
export const IABConsentDialog =
	LazyIABConsentDialog as unknown as IABConsentDialogCompoundComponent;

/**
 * Reset the warming state shared by mounted dialogs between tests.
 *
 * @internal
 */
export const resetIABDialogWarmingForTests =
	function resetIABDialogWarmingForTests(): void {
		openableDialogs = 0;
		warmRequested = false;
	};
