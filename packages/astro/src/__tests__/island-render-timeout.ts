/**
 * How long a test waits for a React dialog island's first render.
 *
 * `@c15t/react` loads the dialog from its own chunk the first time one
 * opens, so the first render in a test worker waits for that import as well
 * as React's first commit. That took up to 0.6 s in a parallel run on an idle
 * machine, which is too close to `vi.waitFor`'s 1 s default, and up to 3.6 s
 * with the CPU oversubscribed three times. The test's own 5 s timeout still
 * bounds the whole test.
 */
export const ISLAND_RENDER_TIMEOUT = { timeout: 4000 } as const;
