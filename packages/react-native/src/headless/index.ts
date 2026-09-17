/**
 * Function-child components for apps that build their own consent UI.
 *
 * These are the thinnest possible wrappers: each subscribes to the smallest
 * slice it needs and calls a function with it. Use them where a hook would
 * force an extra component just to hold the call.
 */

export { ConsentGate } from './consent-gate';
export type { ConsentGateProps, ConsentGateState } from './consent-gate';
export { ConsentPrompt } from './consent-prompt';
export type { ConsentPromptProps, ConsentPromptState } from './consent-prompt';
export { ConsentReady } from './consent-ready';
export type { ConsentReadyProps, ConsentReadyState } from './consent-ready';
