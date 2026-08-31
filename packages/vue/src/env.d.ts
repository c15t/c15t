import './c15t-aliases';
import './schema';

declare module '*.vue' {
	import type { DefineComponent } from 'vue';

	const component: DefineComponent<object, object, unknown>;
	export default component;
}

declare module '*.module.css' {
	const classes: Record<string, string>;
	export default classes;
}
