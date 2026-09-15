'use client';

import { lazy, Suspense, useSyncExternalStore } from 'react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';

import { registerDialogChunkWarmer } from './chunk-warming';
import type * as DialogExports from './components/panel';
import type {
	ConsentDialogCompoundComponent,
	ConsentDialogProps,
} from './components/panel';
import type {
	ConsentWidgetCompoundComponent,
	ConsentWidgetProps,
} from './components/preferences';
import { useActiveUI } from './hooks';

type AnyComponent = ComponentType<Record<string, unknown>>;

const withSuspense = function withSuspense(
	Component: LazyExoticComponent<AnyComponent>
): AnyComponent {
	const LazyAggregateComponent = (props: Record<string, unknown>) => (
		<Suspense fallback={null}>
			<Component {...props} />
		</Suspense>
	);
	return LazyAggregateComponent;
};

type DialogModule = typeof DialogExports;
type DialogSnapshot =
	| { status: 'pending' }
	| { status: 'ready'; module: DialogModule }
	| { status: 'error'; error: unknown };

const pendingDialog: DialogSnapshot = { status: 'pending' };
let dialogSnapshot: DialogSnapshot = pendingDialog;
let dialogPromise: Promise<void> | undefined;
const dialogListeners = new Set<() => void>();
const getDialogSnapshot = () => dialogSnapshot;
const getServerDialogSnapshot = () => pendingDialog;

const loadDialog = () => {
	// Vite uses this path for chunk names. Keep it neutral so URL filters
	// do not block the UI. Share the result with hover/focus warming.
	dialogPromise ??= (async () => {
		try {
			const module = await import('./components/panel');
			dialogSnapshot = { module, status: 'ready' };
		} catch (error) {
			dialogSnapshot = { error, status: 'error' };
		}
		for (const listener of dialogListeners) {
			listener();
		}
	})();
};

const subscribeToDialog = (listener: () => void) => {
	dialogListeners.add(listener);
	loadDialog();
	return () => {
		dialogListeners.delete(listener);
	};
};

const LazyConsentDialogComponent = (props: ConsentDialogProps) => {
	// A null Suspense fallback still throttles React 19's first reveal.
	// Subscribe to module completion so a ready dialog can mount directly.
	const snapshot = useSyncExternalStore(
		subscribeToDialog,
		getDialogSnapshot,
		getServerDialogSnapshot
	);
	if (snapshot.status === 'error') {
		throw snapshot.error;
	}
	if (snapshot.status === 'pending') {
		return null;
	}
	const Component = snapshot.module.ConsentDialog;
	return <Component {...props} />;
};

// Compound exports can render inline during SSR, unlike the default dialog's
// client-only portal. Preserve their existing Suspense rendering contract.
const lazyDialogExport = function lazyDialogExport(name: string) {
	return withSuspense(
		lazy(async () => {
			const module = await import('./components/panel');
			return {
				default: (module as Record<string, unknown>)[name] as AnyComponent,
			};
		})
	);
};

// Warm the dialog chunk on user intent (customize-button hover/focus) so the
// first open never pays network+parse on the click path.
registerDialogChunkWarmer(loadDialog);

const lazyWidgetExport = function lazyWidgetExport(name: string) {
	return withSuspense(
		lazy(async () => {
			const module = await import('./components/preferences');
			const exports = module as Record<string, unknown>;
			return {
				default: exports[name] as AnyComponent,
			};
		})
	);
};

const LazyConsentWidgetComponent = lazyWidgetExport(
	'ConsentWidget'
) as ComponentType<ConsentWidgetProps & { children?: ReactNode }>;

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
