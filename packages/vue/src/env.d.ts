/// <reference path="./c15t-aliases.d.ts" />
/// <reference path="./schema.d.ts" />

declare module '*.vue' {
	import type { DefineComponent } from 'vue';

	const component: DefineComponent<object, object, unknown>;
	export default component;
}

declare module '*.module.css' {
	const classes: Record<string, string>;
	export default classes;
}
