declare module 'virtual:c15t-astro-prerendered' {
	const prerendered: Record<
		string,
		{ html: string; config: unknown; options: unknown }
	>;
	export default prerendered;
}

declare module '*.astro' {
	const component: unknown;
	export default component;
}
