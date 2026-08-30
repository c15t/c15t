'use client';

import {
	type Script,
	type ScriptLoaderDebugEvent,
	type ScriptLoaderHandle,
} from '@c15t/core/v3/modules/script-loader';
import { useEffect, useRef, useState } from 'react';

import { useRequiredKernel } from './shared';

export interface UseScriptLoaderOptions {
	onDebug?: (event: ScriptLoaderDebugEvent) => void;
}

export function useScriptLoader(
	scripts: Script[],
	options: UseScriptLoaderOptions = {}
): ScriptLoaderHandle {
	const kernel = useRequiredKernel();
	const handleRef = useRef<ScriptLoaderHandle | null>(null);
	const latestScriptsRef = useRef(scripts);
	const latestOptionsRef = useRef(options);

	latestScriptsRef.current = scripts;
	latestOptionsRef.current = options;

	const [handle] = useState<ScriptLoaderHandle>(() => ({
		dispose() {
			handleRef.current?.dispose();
			handleRef.current = null;
		},
		updateScripts(next) {
			latestScriptsRef.current = next;
			handleRef.current?.updateScripts(next);
		},
		getLoadedScriptIds() {
			return handleRef.current?.getLoadedScriptIds() ?? [];
		},
	}));

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
		void import('@c15t/core/v3/modules/script-loader').then(
			({ createScriptLoader }) => {
				if (disposed) return;
				const created = createScriptLoader({
					kernel,
					scripts: latestScriptsRef.current,
					onDebug: latestOptionsRef.current.onDebug,
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

	return handle;
}

export type { Script, ScriptLoaderDebugEvent, ScriptLoaderHandle };
