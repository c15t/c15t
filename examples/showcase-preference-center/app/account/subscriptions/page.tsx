import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Subscriptions · Northwind Coffee',
};

const SubscriptionsPage = () => (
	<section
		aria-labelledby="subscriptions-title"
		className="account-section"
	>
		<h1 id="subscriptions-title">Subscriptions</h1>
		<div className="card">
			<h2>Roaster’s choice, 500 g every two weeks</h2>
			<p>Next delivery October 12. Whole bean, $34.00 per delivery.</p>
		</div>
	</section>
);

export default SubscriptionsPage;
