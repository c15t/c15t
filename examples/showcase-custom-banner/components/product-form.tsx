'use client';

import { useEffect, useState } from 'react';

import styles from './product.module.css';

const sizes = [
	{ id: '250g', label: '250 g', price: 19.5 },
	{ id: '1kg', label: '1 kg', price: 62 },
] as const;

const grinds = ['Whole bean', 'Filter', 'Espresso', 'Cafetière', 'AeroPress'];

const formatPrice = (value: number) =>
	new Intl.NumberFormat('en-US', { currency: 'USD', style: 'currency' }).format(
		value
	);

export const ProductForm = () => {
	const [sizeId, setSizeId] = useState<(typeof sizes)[number]['id']>('250g');
	const [grind, setGrind] = useState('Whole bean');
	const [added, setAdded] = useState(false);
	const size = sizes.find((option) => option.id === sizeId) ?? sizes[0];

	useEffect(() => {
		if (!added) {
			return;
		}
		const timer = setTimeout(() => setAdded(false), 2400);
		return () => clearTimeout(timer);
	}, [added]);

	return (
		<form
			className={styles.form}
			onSubmit={(event) => {
				event.preventDefault();
				setAdded(true);
				// `window.posthog` only exists once c15t has loaded PostHog, which
				// it does after the visitor allows Analytics.
				if ('posthog' in window) {
					window.posthog.capture('add_to_cart', {
						grind,
						product: 'huila-pink-bourbon',
						size: size.id,
					});
				}
			}}
		>
			<p className={styles.price}>{formatPrice(size.price)}</p>

			<fieldset className={styles.fieldset}>
				<legend className={styles.label}>Size</legend>
				<div className={styles.sizes}>
					{sizes.map((option) => (
						<label
							key={option.id}
							className={styles.size}
						>
							<input
								type="radio"
								name="size"
								value={option.id}
								checked={sizeId === option.id}
								onChange={() => setSizeId(option.id)}
							/>
							<span>{option.label}</span>
						</label>
					))}
				</div>
			</fieldset>

			<label className={styles.field}>
				<span className={styles.label}>Grind</span>
				<select
					className={styles.select}
					value={grind}
					onChange={(event) => setGrind(event.target.value)}
				>
					{grinds.map((option) => (
						<option key={option}>{option}</option>
					))}
				</select>
			</label>

			<div className={styles.submit}>
				<button
					type="submit"
					className={styles.addToCart}
				>
					{added ? 'Added to cart' : 'Add to cart'}
				</button>
				<p className={styles.shipping}>
					Free delivery over $40. Roasted to order and shipped within two days.
				</p>
			</div>
		</form>
	);
};
