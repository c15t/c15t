import { ConsentDialogLink } from 'c15t/react';

import '../../docs-recipe-page.css';
import type { ReactNode } from 'react';

/**
 * A plain site page the design recipes render over, so screenshots show the
 * banner in context. Demo scaffolding only; the docs publish the recipes.
 */
export const RecipePage = ({ children }: { children?: ReactNode }) => (
	<div className="recipe-page">
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
