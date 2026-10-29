'use client';

import Link from 'next/link';

import { useCart } from '@/lib/cart';

export const SiteHeader = () => {
	const count = useCart((state) => state.data.totalQuantity);

	return (
		<header className="site-header">
			<Link
				className="site-name"
				href="/"
			>
				c15t Supply
			</Link>
			<Link
				className="cart-link"
				href="/cart"
			>
				Cart <span className="cart-count">{count}</span>
			</Link>
		</header>
	);
};
