import { notFound } from 'next/navigation';

import { CoffeeBag } from '@/components/coffee-bag';
import { getDictionary } from '@/lib/dictionaries';
import { isLocale } from '@/lib/locales';

const bagColors = ['#c98b7a', '#c6a15b', '#8a5a36'];

const HomePage = async ({ params }: PageProps<'/[lang]'>) => {
	const { lang } = await params;
	if (!isLocale(lang)) {
		notFound();
	}
	const { hero, roasts } = getDictionary(lang);
	const price = new Intl.NumberFormat(lang, {
		currency: roasts.currency,
		maximumFractionDigits: 0,
		style: 'currency',
	});

	return (
		<>
			<section className="hero">
				<div className="hero-copy">
					<h1>{hero.title}</h1>
					<p className="dek">{hero.dek}</p>
					<a
						className="button"
						href="#roasts"
					>
						{hero.cta}
					</a>
				</div>
				<div className="hero-art">
					{bagColors.map((color) => (
						<CoffeeBag
							key={color}
							color={color}
						/>
					))}
				</div>
			</section>

			<section
				id="roasts"
				className="roasts"
				aria-labelledby="roasts-title"
			>
				<h2 id="roasts-title">{roasts.title}</h2>
				<ul className="roast-grid">
					{roasts.items.map((item, index) => (
						<li
							key={item.name}
							className="roast"
						>
							<div className="roast-art">
								<CoffeeBag color={bagColors[index] ?? '#c6a15b'} />
							</div>
							<h3>{item.name}</h3>
							<p className="roast-notes">
								{item.origin}. {item.notes}
							</p>
							<div className="roast-buy">
								<p>
									<span className="roast-price">
										{price.format(item.price)}
									</span>{' '}
									<span className="roast-weight">· {roasts.weight}</span>
								</p>
								<button
									type="button"
									className="button button-quiet"
								>
									{roasts.addToCart}
								</button>
							</div>
						</li>
					))}
				</ul>
			</section>
		</>
	);
};

export default HomePage;
