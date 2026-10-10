/**
 * Offline mode, as the chunk `clientMode()` loads on first init.
 *
 * Bundled with everything it imports, for the reason `lazy-hosted.ts`
 * gives: offline mode shares `@c15t/schema`'s policy wire helpers with a
 * page's first load, and Rolldown splits shared modules out of the page's
 * chunk.
 *
 * @internal
 */
export { offline } from '../transports/offline';
