/**
 * The plain site page the design recipes render over, as the markup the
 * React, Vue and Svelte `RecipePage` components produce. Demo scaffolding
 * only; the docs publish the recipes.
 *
 * Pure strings, so the Node prerender can compose the page around the
 * server-rendered parts.
 *
 * @param parts - Server-rendered HTML: the footer's preferences control and
 * the recipe (banner and dialog) that follows the page content.
 * @returns The page markup.
 */
export const recipePageHtml = function recipePageHtml(parts: {
	preferencesControl: string;
	recipe: string;
}): string {
	return `<div class="recipe-page"><header><strong>Northwind Coffee</strong><nav aria-label="Main"><a href="#menu">Menu</a><a href="#stores">Stores</a><a href="#about">About</a></nav></header><main><h1>Fresh roasts, delivered weekly</h1><p>Pick a roast, choose how often it arrives, and change your plan any time. Every bag is roasted the day before it ships.</p><div class="recipe-page__cards"><section><h2>Light</h2><p>Bright and floral, with a clean finish.</p></section><section><h2>Medium</h2><p>Balanced, with notes of caramel and cocoa.</p></section><section><h2>Dark</h2><p>Heavy body and a smoky, bittersweet edge.</p></section></div></main><footer><span>© Northwind Coffee</span>${parts.preferencesControl}</footer>${parts.recipe}</div>`;
};
