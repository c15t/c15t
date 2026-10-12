// declaration.d.ts
// This bench deliberately omits @c15t/nextjs (it measures the CSS layer on its
// own), so it does not inherit that package's CSS module declaration. TypeScript
// 6 rejects an unresolved side-effect import, so declare it here.
declare module '*.css' {
	const content: Record<string, string>;
	export default content;
}
