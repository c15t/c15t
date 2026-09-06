---
'@c15t/ui': patch
---

Serve the component class maps under `@c15t/ui/styles/components/*` through a `node` export condition that omits the `import "./<name>.css"` side effect. Runtimes that load the package with plain Node (such as the Next.js Pages Router externalising `node_modules`) no longer fail with `ERR_UNKNOWN_FILE_EXTENSION ".css"`, and no longer need `@c15t/ui`, `@c15t/react`, or `@c15t/nextjs` in `transpilePackages`. Bundlers keep resolving the `import` condition, so the CSS still ships with the class map there; Node-loaded consumers rely on the aggregated stylesheet (`@c15t/ui/styles.css`) as before.
