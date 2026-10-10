// declaration.d.ts
// TypeScript 6 rejects side-effect imports of files it has no declaration for,
// so declare the CSS assets these apps import for their side effects, and the
// hero image the dialog-open bench renders.
declare module '*.css' {
	const content: Record<string, string>;
	export default content;
}

declare module '*.jpg' {
	const url: string;
	export default url;
}
