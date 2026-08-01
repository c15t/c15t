// declaration.d.ts
// TypeScript 6 rejects side-effect imports of files it has no declaration for,
// so declare the CSS assets these apps import for their side effects.
declare module '*.css' {
	const content: Record<string, string>;
	export default content;
}
