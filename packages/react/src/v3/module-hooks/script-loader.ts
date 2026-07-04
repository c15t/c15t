'use client';

import {
	createScriptLoader,
	type Script,
	type ScriptLoaderDebugEvent,
	type ScriptLoaderHandle,
} from 'c15t/v3/modules/script-loader';
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
	const [handle] = useState(() =>
		createScriptLoader({
			kernel,
			scripts,
			onDebug: options.onDebug,
		})
	);

	const firstRun = useRef(true);
	useEffect(() => {
		if (firstRun.current) {
			firstRun.current = false;
			return;
		}
		handle.updateScripts(scripts);
	}, [handle, scripts]);

	useEffect(() => {
		return () => handle.dispose();
	}, [handle]);

	return handle;
}

export type { Script, ScriptLoaderDebugEvent, ScriptLoaderHandle };
