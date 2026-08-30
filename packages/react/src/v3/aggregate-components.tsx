'use client';

import {
	type ComponentType,
	type LazyExoticComponent,
	lazy,
	type ReactNode,
	Suspense,
} from 'react';

import { registerDialogChunkWarmer } from './chunk-warming';
import type {
	ConsentDialogCompoundComponent,
	ConsentDialogProps,
} from './components/consent-dialog';
import type {
	ConsentWidgetCompoundComponent,
	ConsentWidgetProps,
} from './components/consent-widget';
import { useActiveUI } from './hooks';

type AnyComponent = ComponentType<any>;

function withSuspense(
	Component: LazyExoticComponent<AnyComponent>
): AnyComponent {
	function LazyAggregateComponent(props: Record<string, unknown>) {
		return (
			<Suspense fallback={null}>
				<Component {...props} />
			</Suspense>
		);
	}
	return LazyAggregateComponent;
}

function lazyDialogExport(name: string) {
	return withSuspense(
		lazy(async () => {
			const module = await import('./components/consent-dialog');
			return {
				default: (module as Record<string, AnyComponent>)[name] as AnyComponent,
			};
		})
	);
}

// Warm the dialog chunk on user intent (customize-button hover/focus) so the
// first open never pays network+parse on the click path.
registerDialogChunkWarmer(() => {
	void import('./components/consent-dialog');
});

function lazyWidgetExport(name: string) {
	return withSuspense(
		lazy(async () => {
			const module = await import('./components/consent-widget');
			return {
				default: (module as Record<string, AnyComponent>)[name] as AnyComponent,
			};
		})
	);
}

const LazyConsentDialogComponent = lazyDialogExport(
	'ConsentDialog'
) as ComponentType<ConsentDialogProps & { children?: ReactNode }>;
const LazyConsentWidgetComponent = lazyWidgetExport(
	'ConsentWidget'
) as ComponentType<ConsentWidgetProps & { children?: ReactNode }>;

function LazyConsentDialog(props: ConsentDialogProps) {
	const activeUI = useActiveUI();
	const shouldLoadDialog =
		props.open === true || activeUI === 'dialog' || Boolean(props.showTrigger);
	if (!shouldLoadDialog) {
		return null;
	}
	return <LazyConsentDialogComponent {...props} />;
}

function LazyConsentWidget(props: ConsentWidgetProps) {
	return <LazyConsentWidgetComponent {...props} />;
}

function withLazyProperties<T extends AnyComponent>(
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
}

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
