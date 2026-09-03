'use client';

import type {
	Script,
	ScriptLoaderDebugEvent,
	ScriptLoaderHandle,
} from '@c15t/core/modules/script-loader';
import { useEffect, useRef, useState } from 'react';

import { useRequiredKernel } from './shared';

const loadScriptLoaderModule = () => import('@c15t/core/modules/script-loader');

export interface UseScriptLoaderOptions {
	onDebug?: (event: ScriptLoaderDebugEvent) => void;
}

export const useScriptLoader = function useScriptLoader(
	scripts: Script[],
	options: UseScriptLoaderOptions = {}
): ScriptLoaderHandle {
	const kernel = useRequiredKernel();
	const handleRef = useRef<ScriptLoaderHandle | null>(null);
	const latestScriptsRef = useRef(scripts);
	const latestOptionsRef = useRef(options);

	const [handle, setHandle] = useState<ScriptLoaderHandle>(() => ({
		dispose() {
			handleRef.current?.dispose();
			handleRef.current = null;
		},
		getLoadedScriptIds() {
			return handleRef.current?.getLoadedScriptIds() ?? [];
		},
		updateScripts(next) {
			latestScriptsRef.current = next;
			handleRef.current?.updateScripts(next);
		},
	}));
	void setHandle;

	useEffect(() => {
		latestScriptsRef.current = scripts;
		latestOptionsRef.current = options;
	}, [options, scripts]);

	const firstRun = useRef(true);
	useEffect(() => {
		if (firstRun.current) {
			firstRun.current = false;
			return;
		}
		handle.updateScripts(scripts);
	}, [handle, scripts]);

	useEffect(() => {
		let disposed = false;
		void (async () => {
			const { createScriptLoader } = await loadScriptLoaderModule();
			if (disposed) {
				return;
			}
			const created = createScriptLoader({
				kernel,
				onDebug: latestOptionsRef.current.onDebug,
				scripts: latestScriptsRef.current,
			});
			handleRef.current = created;
		})();

		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel]);

	return handle;
};

export type { Script, ScriptLoaderDebugEvent, ScriptLoaderHandle };
