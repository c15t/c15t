/**
 * Test support for opening the React dialog island.
 *
 * `@c15t/react` loads its preference dialog from a separate chunk the first
 * time a dialog opens. Vite compiles that chunk on its first import, which
 * took 2 to 4 s in a parallel run, inside the first test that opened a
 * React island. Importing the chunk here compiles it while the test file
 * loads, and the dialog's own import then resolves from the module cache.
 * The package does not export the chunk, so this names the file its build
 * output imports.
 */
import '../../../react/dist/components/panel/index.js';

/**
 * How long a test waits for the React dialog to render after it opens.
 * React's first commit of the dialog in jsdom takes about 0.2 s alone and
 * took up to 3.3 s with the CPU oversubscribed, past `vi.waitFor`'s 1 s
 * default. The test's own 5 s timeout still bounds the whole test.
 */
export const ISLAND_RENDER_TIMEOUT = { timeout: 4000 } as const;
