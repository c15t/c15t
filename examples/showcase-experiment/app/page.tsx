const roastDays = [
	{ coffees: ['Huila Pink Bourbon', 'House Blend'], day: 'Tuesday' },
	{ coffees: ['Guji Hambela', 'Decaf Huila'], day: 'Friday' },
];

const beans = [
	{
		band: '#c9826b',
		name: 'Huila Pink Bourbon',
		notes: 'Raspberry, cane sugar, cacao nib',
		origin: 'Washed, grown at 1,750 m in Colombia',
		price: '$21',
		roast: 'Light',
	},
	{
		band: '#b58a3a',
		name: 'Guji Hambela',
		notes: 'Blueberry, jasmine, honey',
		origin: 'Natural, grown at 2,100 m in Ethiopia',
		price: '$23',
		roast: 'Light',
	},
	{
		band: '#6b4a34',
		name: 'House Blend',
		notes: 'Milk chocolate, toasted almond, plum',
		origin: 'Pulped natural, from Brazil and Guatemala',
		price: '$17',
		roast: 'Medium',
	},
];

const subscriptionPoints = [
	{
		body: 'Pick one coffee, or let the roasters choose a different one each time.',
		title: 'Choose your coffee',
	},
	{
		body: 'Every week, two weeks or month. Skip a delivery or pause from your account.',
		title: 'Set the pace',
	},
	{
		body: 'Roasted to order and shipped the next morning. Shipping is always free.',
		title: 'Get it fresh',
	},
];

const CoffeeBag = ({ band }: { band: string }) => (
	<svg
		viewBox="0 0 120 140"
		aria-hidden="true"
		className="bag"
	>
		<path
			d="M24 18h72l8 112a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6l8-112Z"
			fill="#fffdf9"
			stroke="#e4dccf"
			strokeWidth="2"
		/>
		<path
			d="M24 18h72v10H24z"
			fill="#e4dccf"
		/>
		<rect
			x="30"
			y="62"
			width="60"
			height="34"
			rx="3"
			fill={band}
		/>
		<path
			d="M45 79c4-6 10-6 15 0s11 6 15 0"
			stroke="#fffdf9"
			strokeWidth="2.5"
			fill="none"
			strokeLinecap="round"
		/>
	</svg>
);

const Page = () => (
	<>
		<section className="hero">
			<div className="hero-copy">
				<h1>Coffee roasted on Tuesday, at your door by Thursday.</h1>
				<p className="lead">
					We roast in 12 kg batches in Portland and ship the morning after.
					Every bag lists the farm, the altitude and the day it came out of the
					drum.
				</p>
				<div className="hero-actions">
					<a
						className="button button-primary"
						href="#beans"
					>
						Shop this week&rsquo;s coffee
					</a>
					<a
						className="button button-secondary"
						href="#subscribe"
					>
						How subscriptions work
					</a>
				</div>
			</div>
			<aside
				className="roast-card"
				aria-labelledby="roast-card-title"
			>
				<h2 id="roast-card-title">On the roaster this week</h2>
				<dl>
					{roastDays.map((roast) => (
						<div
							className="roast-day"
							key={roast.day}
						>
							<dt>{roast.day}</dt>
							{roast.coffees.map((coffee) => (
								<dd key={coffee}>{coffee}</dd>
							))}
						</div>
					))}
				</dl>
				<p className="roast-note">Order by 9 pm to make the next roast.</p>
			</aside>
		</section>

		<section
			className="section"
			id="beans"
			aria-labelledby="beans-title"
		>
			<div className="section-head">
				<h2 id="beans-title">Featured beans</h2>
				<a href="/shop">See all 9 coffees</a>
			</div>
			<ul className="bean-grid">
				{beans.map((bean) => (
					<li
						className="bean"
						key={bean.name}
					>
						<CoffeeBag band={bean.band} />
						<h3>{bean.name}</h3>
						<p className="bean-notes">{bean.notes}</p>
						<p className="bean-origin">{bean.origin}</p>
						<div className="bean-foot">
							<span className="bean-price">
								{bean.price}
								<span> / 250 g</span>
							</span>
							<span className="bean-roast">{bean.roast} roast</span>
						</div>
						<button
							type="button"
							className="button button-secondary bean-add"
						>
							Add to bag
						</button>
					</li>
				))}
			</ul>
		</section>

		<section
			className="subscribe"
			id="subscribe"
			aria-labelledby="subscribe-title"
		>
			<div className="subscribe-inner">
				<div className="subscribe-copy">
					<h2 id="subscribe-title">Subscribe and save 10% on every bag</h2>
					<p>Bags start at $17. Cancel from your account at any time.</p>
					<a
						className="button button-primary"
						href="/subscriptions"
					>
						Start a subscription
					</a>
				</div>
				<ol className="subscribe-points">
					{subscriptionPoints.map((point) => (
						<li key={point.title}>
							<h3>{point.title}</h3>
							<p>{point.body}</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	</>
);

export default Page;
