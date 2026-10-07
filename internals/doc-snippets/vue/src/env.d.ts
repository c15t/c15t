// The part of Vite's `import.meta.env` that `ConsentDevTools.vue` reads. A
// Vite app gets the full type from `vite/client`.
interface ImportMeta {
	readonly env: { readonly DEV: boolean };
}
