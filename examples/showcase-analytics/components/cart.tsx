'use client';

import { createContext, use, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface CartContextValue {
	count: number;
	add: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
	const [count, setCount] = useState(0);
	const value = useMemo(
		() => ({ add: () => setCount((current) => current + 1), count }),
		[count]
	);
	return <CartContext value={value}>{children}</CartContext>;
};

export const useCart = () => {
	const cart = use(CartContext);
	if (!cart) {
		throw new Error('useCart must be used inside <CartProvider>.');
	}
	return cart;
};
