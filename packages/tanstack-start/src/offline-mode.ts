/**
 * Offline mode for `ConsentRoot`, in its own module so the root can load it
 * with a dynamic import only when no backend URL is configured.
 *
 * @internal
 */
export { offline } from '@c15t/react';
