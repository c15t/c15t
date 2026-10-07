import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Orders · Northwind Coffee' };

const ORDERS = [
	{
		date: 'Sep 28, 2026',
		id: 'NW-10482',
		items: 'Rwanda Huye, 250\u00a0g',
		total: '$19.00',
	},
	{
		date: 'Aug 31, 2026',
		id: 'NW-10317',
		items: 'House Espresso, 1\u00a0kg',
		total: '$48.00',
	},
	{
		date: 'Aug 3, 2026',
		id: 'NW-10166',
		items: 'Kalita Wave 185',
		total: '$36.00',
	},
];

const OrdersPage = () => (
	<section
		aria-labelledby="orders-title"
		className="account-section"
	>
		<h1 id="orders-title">Orders</h1>
		<table className="orders">
			<thead>
				<tr>
					<th scope="col">Order</th>
					<th scope="col">Date</th>
					<th scope="col">Items</th>
					<th
						scope="col"
						className="numeric"
					>
						Total
					</th>
				</tr>
			</thead>
			<tbody>
				{ORDERS.map((order) => (
					<tr key={order.id}>
						<td className="nowrap">{order.id}</td>
						<td>{order.date}</td>
						<td>{order.items}</td>
						<td className="numeric">{order.total}</td>
					</tr>
				))}
			</tbody>
		</table>
	</section>
);

export default OrdersPage;
