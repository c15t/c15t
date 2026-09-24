'use client';

import type { ComponentType } from 'react';

import { registerDialogChunkWarmer } from './chunk-warming';
import type {
	ConsentDialogCompoundComponent,
	ConsentDialogProps,
} from './components/panel';
import type {
	ConsentWidgetCompoundComponent,
	ConsentWidgetProps,
} from './components/preferences';
import { useActiveUI } from './hooks';
import { createDeferredModule } from './utils/deferred-module';

type AnyComponent = ComponentType<Record<string, unknown>>;

// Vite derives chunk names from these paths. Keep them neutral so URL filters
// do not block the UI. Each module is shared by its default and compound exports.
const dialogModule = createDeferredModule(() => import('./components/panel'));
const widgetModule = createDeferredModule(
	() => import('./components/preferences')
);
const lazyDialogExport = (name: string) =>
	dialogModule.component(
		(module) => (module as Record<string, unknown>)[name] as AnyComponent
	);
const lazyWidgetExport = (name: string) =>
	widgetModule.component(
		(module) => (module as Record<string, unknown>)[name] as AnyComponent
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
