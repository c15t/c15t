import Link from 'next/link';

const COFFEES = [
	{
		name: 'Rwanda Huye',
		notes: 'Red currant, black tea, cane sugar',
		price: '$19.00',
	},
	{
		name: 'Colombia Pitalito',
		notes: 'Milk chocolate, orange, hazelnut',
		price: '$18.00',
	},
	{
		name: 'House Espresso',
		notes: 'Cocoa, cherry, brown butter',
		price: '$17.00',
	},
];

const HomePage = () => (
	<div className="home">
		<section
			className="hero"
			aria-labelledby="hero-title"
		>
			<h1 id="hero-title">Single-origin coffee, roasted twice a week.</h1>
			<p className="lede">
				We buy from a dozen farms we know by name and roast in 12 kg batches on
				Tuesdays and Fridays. Your beans ship within two days of roasting.
			</p>
		</section>

		<section
			className="beans"
			aria-labelledby="beans-title"
		>
			<h2 id="beans-title">This week’s beans</h2>
			<ul className="products">
				{COFFEES.map((coffee) => (
					<li
						key={coffee.name}
						className="card product"
					>
						<h3>{coffee.name}</h3>
						<p>{coffee.notes}</p>
						<p className="price">{coffee.price} · 250 g</p>
					</li>
				))}
			</ul>
		</section>

		<section
			id="subscriptions"
			className="split"
		>
			<div>
				<h2>Subscriptions</h2>
				<p>
					A fresh bag every one, two or four weeks. Skip or pause a delivery
					from your account.
				</p>
			</div>
			<Link
				href="/account/subscriptions"
				className="button button-secondary"
			>
				Manage your subscription
			</Link>
		</section>

		<section
			id="journal"
			className="split"
		>
			<div>
				<h2>From the journal</h2>
				<p>Why we stopped roasting dark, and what changed when we did.</p>
			</div>
		</section>
	</div>
);

export default HomePage;
