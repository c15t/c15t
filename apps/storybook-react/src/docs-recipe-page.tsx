import { ConsentDialogLink } from 'c15t/react';
import type { ReactNode } from 'react';

const recipePageCSS = `
.recipe-page {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: #ffffff;
	color: #1f2328;
	font: 16px/1.6 system-ui, sans-serif;
}
.recipe-page header,
.recipe-page footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem 2rem;
	border-bottom: 1px solid #e5e7eb;
}
.recipe-page nav { display: flex; gap: 1.25rem; }
.recipe-page a { color: inherit; }
.recipe-page main { flex: 1; max-width: 60rem; padding: 2.5rem 2rem; }
.recipe-page h1 { margin: 0 0 0.75rem; font-size: 2.25rem; line-height: 1.2; }
.recipe-page main > p { max-width: 36rem; margin: 0 0 2rem; color: #4b5563; }
.recipe-page__cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	gap: 1rem;
}
.recipe-page__cards section {
	padding: 1.25rem;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
}
.recipe-page__cards h2 { margin: 0 0 0.25rem; font-size: 1.125rem; }
.recipe-page__cards p { margin: 0; color: #4b5563; }
.recipe-page footer {
	border-top: 1px solid #e5e7eb;
	border-bottom: 0;
	color: #4b5563;
	font-size: 0.875rem;
	/* Room for a bottom bar, so the footer link stays reachable. */
	margin-bottom: 6rem;
}
`;

/**
 * A plain site page the design recipes render over, so screenshots show the
 * banner in context. Demo scaffolding only; the docs publish the recipes.
 */
export const RecipePage = ({ children }: { children?: ReactNode }) => (
	<div className="recipe-page">
		<style>{recipePageCSS}</style>
		<header>
			<strong>Northwind Coffee</strong>
			<nav aria-label="Main">
				<a href="#menu">Menu</a>
				<a href="#stores">Stores</a>
				<a href="#about">About</a>
			</nav>
		</header>
		<main>
			<h1>Fresh roasts, delivered weekly</h1>
			<p>
				Pick a roast, choose how often it arrives, and change your plan any
				time. Every bag is roasted the day before it ships.
			</p>
			<div className="recipe-page__cards">
				<section>
					<h2>Light</h2>
					<p>Bright and floral, with a clean finish.</p>
				</section>
				<section>
					<h2>Medium</h2>
					<p>Balanced, with notes of caramel and cocoa.</p>
				</section>
				<section>
					<h2>Dark</h2>
					<p>Heavy body and a smoky, bittersweet edge.</p>
				</section>
			</div>
		</main>
		<footer>
			<span>© Northwind Coffee</span>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
		{children}
	</div>
);
