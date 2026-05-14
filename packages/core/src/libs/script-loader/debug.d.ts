import type {
	ScriptDebugEvent,
	ScriptDebugEventInput,
	ScriptDebugListener,
} from './types';
export declare function emitScriptDebugEvent(
	event: ScriptDebugEventInput
): ScriptDebugEvent;
export declare function subscribeToScriptDebugEvents(
	listener: ScriptDebugListener
): () => void;
