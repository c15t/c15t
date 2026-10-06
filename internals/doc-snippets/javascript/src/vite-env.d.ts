// The parts of Vite's `import.meta` that the DevTools snippets use. Vite is
// not installed here, so its `vite/client` types are not available.
interface ImportMetaEnv {
	readonly DEV: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
	readonly hot?: { dispose: (callback: () => void) => void };
}
