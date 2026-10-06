/**
 * The script loader and the network blocker as one on-demand chunk.
 *
 * A page with consented scripts usually has blocker rules for the same
 * vendors, and a returning visitor's held requests wait for the blocker
 * while their scripts wait for the loader. As separate chunks, a preload
 * of both takes two connections and the second one often goes a round
 * trip later. One chunk arrives in one request.
 *
 * Both modules are written against their tools, so this chunk imports
 * nothing the first-load graph has. `loaderAndBlockerOnDemand` passes the
 * tools in.
 *
 * @internal
 */
// oxlint-disable-next-line oxc/no-barrel-file -- The chunk's entry: two modules a page loads together.
export { createNetworkBlockerWith } from './network-blocker/blocker';
// oxlint-disable-next-line oxc/no-barrel-file -- The chunk's entry.
export { createScriptLoaderWith } from './script-loader/loader';
