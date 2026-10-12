'use client';

import { useEffect, useRef, useState } from 'react';

import { products } from '@/lib/products';
import type { Product } from '@/lib/products';
import { useTrackAddToCart } from '@/lib/use-track-add-to-cart';
import type { TrackedAddToCart } from '@/lib/use-track-add-to-cart';

import { BagArt } from './bag-art';
import { useCart } from './cart';
import { CartToast } from './cart-toast';

import styles from './product-grid.module.css';

interface Toast {
	id: number;
	product: Product;
	tracked: TrackedAddToCart;
}

const TOAST_MS = 6000;

const formatPrice = (price: number) => `$${price.toFixed(2)}`;

export const ProductGrid = () => {
	const cart = useCart();
	const trackAddToCart = useTrackAddToCart();
	const [toast, setToast] = useState<Toast | null>(null);
	const toastCount = useRef(0);

	useEffect(() => {
		if (!toast) {
			return;
		}
		const timer = setTimeout(() => setToast(null), TOAST_MS);
		return () => clearTimeout(timer);
	}, [toast]);

	const addToCart = (product: Product) => {
		cart.add();
		const tracked = trackAddToCart(product);
		toastCount.current += 1;
		setToast({ id: toastCount.current, product, tracked });
	};

	return (
		<>
			<ul className={styles.grid}>
				{products.map((product) => (
					<li
						key={product.id}
						className={styles.card}
					>
						<div className={styles.art}>
							<BagArt tint={product.tint} />
						</div>
						<div className={styles.body}>
							<h3 className={styles.name}>{product.name}</h3>
							<p className={styles.notes}>
								{product.origin ? `${product.origin}. ` : null}
								{product.notes}
							</p>
							<div className={styles.buy}>
								<p className={styles.price}>
									{formatPrice(product.price)}
									<span className={styles.weight}>{product.weight}</span>
								</p>
								<button
									type="button"
									className={styles.add}
									onClick={() => addToCart(product)}
									aria-label={`Add ${product.name} to cart`}
								>
									Add to cart
								</button>
							</div>
						</div>
					</li>
				))}
			</ul>
			<CartToast
				toast={toast}
				onDismiss={() => setToast(null)}
			/>
		</>
	);
};
