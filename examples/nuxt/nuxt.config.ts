// #region docs:nuxt-config
// #hide docs
// The demo project, so the example runs without a .env file.
process.env.NUXT_PUBLIC_C15T_BACKEND_URL ??= 'https://benchmarks-inth.inth.app';
// #endhide docs

// The module reads NUXT_PUBLIC_C15T_BACKEND_URL.
export default defineNuxtConfig({
	compatibilityDate: '2026-07-04',
	modules: ['c15t/vue'],
});
// #endregion docs:nuxt-config
