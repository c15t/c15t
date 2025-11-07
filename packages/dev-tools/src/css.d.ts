declare module '*.css' {
	const content: Record<string, string>;
	export default content;
}

declare module '*.module.css' {
	const classes: Record<string, string>;
	export default classes;
}

declare module '*.svg' {
	const content: string;
	export default content;
}
