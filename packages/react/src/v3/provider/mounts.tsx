import type { ConsentKernel } from 'c15t/v3';
import type { Script } from 'c15t/v3/modules/script-loader';
import type { ReactNode } from 'react';
import {
	lazy,
	Suspense,
	useContext,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { KernelContext } from '../context';
import type { IABProviderProps } from '../iab-context';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from '../module-hooks';
import { usePersistence } from '../module-hooks/persistence';
import type { Theme } from '../types/theme';

const LazyIABProvider = lazy(async () => {
	const module = await import('../iab-context');
	return { default: module.IABProvider };
});

export function InitMount({
	enabled,
	kernel,
	eagerInit = false,
}: {
	enabled: boolean;
	kernel: ConsentKernel;
	eagerInit?: boolean;
}) {
	const skippedEagerRef = useRef(false);
	useEffect(() => {
		if (!enabled) return;
		// The provider may have dispatched init at kernel creation (eager,
		// render-time) — skip this effect's first pass so init fires exactly
		// once, while later `enabled` flips still re-init.
		if (eagerInit && !skippedEagerRef.current) {
			skippedEagerRef.current = true;
			return;
		}
		void kernel.commands.init();
	}, [enabled, kernel, eagerInit]);
	return null;
}

export function ScriptsMount({
	options,
	scripts,
}: {
	options?: UseScriptLoaderOptions;
	scripts: Script[];
}) {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose(): void;
		updateScripts(scripts: Script[]): void;
	} | null>(null);
	const latestScriptsRef = useRef(scripts);
	const latestOptionsRef = useRef(options);

	latestScriptsRef.current = scripts;
	latestOptionsRef.current = options;

	useEffect(() => {
		if (!kernel) return;
		let disposed = false;
		void import('c15t/v3/modules/script-loader').then(
			({ createScriptLoader }) => {
				if (disposed) return;
				const created = createScriptLoader({
					kernel,
					scripts: latestScriptsRef.current,
					onDebug: latestOptionsRef.current?.onDebug,
				});
				handleRef.current = created;
			}
		);
		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel]);

	useEffect(() => {
		handleRef.current?.updateScripts(scripts);
	}, [scripts]);

	return null;
}

export function NetworkBlockerMount({
	options,
}: {
	options: UseNetworkBlockerOptions;
}) {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose(): void;
		updateRules(rules: UseNetworkBlockerOptions['rules']): void;
		setEnabled(enabled: boolean): void;
	} | null>(null);
	const latestOptionsRef = useRef(options);
	latestOptionsRef.current = options;

	useEffect(() => {
		if (!kernel) return;
		let disposed = false;
		void import('c15t/v3/modules/network-blocker').then(
			({ createNetworkBlocker }) => {
				if (disposed) return;
				const latest = latestOptionsRef.current;
				const created = createNetworkBlocker({
					kernel,
					rules: latest.rules,
					enabled: latest.enabled,
					logBlockedRequests: latest.logBlockedRequests,
					onRequestBlocked: latest.onRequestBlocked,
				});
				handleRef.current = created;
			}
		);
		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel]);

	useEffect(() => {
		handleRef.current?.updateRules(options.rules);
	}, [options.rules]);

	useEffect(() => {
		if (options.enabled !== undefined) {
			handleRef.current?.setEnabled(options.enabled);
		}
	}, [options.enabled]);

	return null;
}

export function PersistenceMount({
	options,
}: {
	options?: UsePersistenceOptions;
}) {
	usePersistence(options);
	return null;
}

export function ThemeStyleMount({ theme }: { theme?: Theme }) {
	const [themeCSS, setThemeCSS] = useState('');

	useEffect(() => {
		if (!theme) {
			setThemeCSS('');
			return;
		}

		let disposed = false;
		void import('@c15t/ui/theme').then(({ generateThemeCSS }) => {
			if (!disposed) {
				setThemeCSS(generateThemeCSS(theme as never));
			}
		});

		return () => {
			disposed = true;
		};
	}, [theme]);

	if (!themeCSS) return null;

	return (
		<style
			id="c15t-theme"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Generated CSS variables
			dangerouslySetInnerHTML={{ __html: themeCSS }}
		/>
	);
}

export function IABGate({
	enabled,
	initialModel,
	kernel,
	options,
	children,
}: {
	enabled: boolean;
	initialModel?: string | null;
	kernel: ConsentKernel;
	options: Omit<IABProviderProps, 'children'> | null;
	children: ReactNode;
}) {
	const model = useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot().model,
		() => kernel.getServerSnapshot().model
	);
	const shouldLoadIAB =
		model === 'iab' || (model == null && initialModel === 'iab');

	if (!enabled || !options || !shouldLoadIAB) {
		return <>{children}</>;
	}

	return (
		<Suspense fallback={children}>
			<LazyIABProvider {...options}>{children}</LazyIABProvider>
		</Suspense>
	);
}
