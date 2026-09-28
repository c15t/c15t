/**
 * The full hosted transport for `ConsentRoot`, in its own module so the root
 * loads its init path with a dynamic import, and only when the browser has
 * to resolve init itself.
 *
 * @internal
 */
export { createHostedTransport } from '@c15t/core';
