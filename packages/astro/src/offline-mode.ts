/**
 * Offline mode's transport, in its own module so the browser client loads it
 * with a dynamic import only when an offline init runs.
 *
 * @internal
 */
export { createOfflineTransport } from '@c15t/core';
