/**
 * Tells the shared global setup that this cell has no server: the stub runs
 * on its own port, `next build` exports to `out/`, and a static file server
 * serves it. See `shared/src/suite/cell-config.ts`.
 */
const config = { mode: 'static-export' } as const;

export default config;
