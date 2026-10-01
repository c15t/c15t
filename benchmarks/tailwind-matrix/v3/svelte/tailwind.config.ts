// #region docs:tailwind-config title="tailwind.config.ts"
import type { Config } from 'tailwindcss';

export default {
	content: ['./index.html', './src/**/*.{svelte,ts}'],
	darkMode: 'class',
} satisfies Config;
// #endregion docs:tailwind-config
