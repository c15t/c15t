'use client';

import { useCartAnalytics } from '@shopify/hydrogen/react';
import type { ReactNode } from 'react';

import { CartProvider } from '@/lib/cart';
import type { getCart } from '@/lib/storefront';

// Turns confirmed cart changes into Hydrogen's add and remove events.
const CartAnalytics = () => {
	useCartAnalytics();
	return null;
};

export const StoreProviders = ({
	cart,
	children,
}: {
	cart: ReturnType<typeof getCart>;
	children: ReactNode;
}) => (
	<CartProvider initialData={cart}>
		<CartAnalytics />
		{children}
	</CartProvider>
);
