import { CoffeeBag } from '@/components/coffee-bag';
import { ProductForm } from '@/components/product-form';

import styles from '@/components/product.module.css';

const details = [
	['Producer', 'Finca La Esperanza'],
	['Region', 'Huila, Colombia'],
	['Altitude', '1,750 m'],
	['Variety', 'Pink Bourbon'],
	['Process', 'Washed'],
	['Roast', 'Light'],
] as const;

const recipes = [
	{
		method: 'Pour-over',
		recipe: '15 g coffee, 250 g water at 94°C, 3 minutes',
	},
	{ method: 'Espresso', recipe: '18 g in, 40 g out, 28 to 30 seconds' },
	{ method: 'Cafetière', recipe: '30 g coarse, 500 g water, 4 minutes' },
] as const;

const ProductPage = () => (
	<main className={styles.page}>
		<nav
			className={styles.breadcrumb}
			aria-label="Breadcrumb"
		>
			<a href="/">Shop</a>
			<span aria-hidden="true">/</span>
			<a href="/">Single origin</a>
			<span aria-hidden="true">/</span>
			<span aria-current="page">Huila Pink Bourbon</span>
		</nav>

		<div className={styles.product}>
			<div className={styles.media}>
				<CoffeeBag />
			</div>

			<div className={styles.details}>
				<div className={styles.summary}>
					<hgroup className={styles.heading}>
						<h1 className={styles.name}>Huila Pink Bourbon</h1>
						<p className={styles.notes}>Raspberry, panela, cocoa nib</p>
					</hgroup>
					<p className={styles.lede}>
						Grown by the Ramírez family on steep slopes above Pitalito. Pink
						Bourbon is a rare variety, brighter than most Colombian coffee, with
						red fruit up front and a brown-sugar finish. We roast it light to
						keep the fruit.
					</p>
				</div>

				<ProductForm />

				<dl className={styles.specs}>
					{details.map(([term, value]) => (
						<div key={term}>
							<dt>{term}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			</div>
		</div>

		<section
			className={styles.brew}
			aria-labelledby="brew-title"
		>
			<h2 id="brew-title">How we brew it</h2>
			<ul>
				{recipes.map(({ method, recipe }) => (
					<li key={method}>
						<h3>{method}</h3>
						<p>{recipe}</p>
					</li>
				))}
			</ul>
		</section>
	</main>
);

export default ProductPage;
