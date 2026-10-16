'use client';

import { AnalyticsEvent } from '@shopify/hydrogen';
import type { AnalyticsCart, AnalyticsCartLine } from '@shopify/hydrogen';
import Link from 'next/link';
import { Suspense, useEffect, useRef } from 'react';

import { getAnalytics } from '@/lib/analytics';
import { useCart, useCartForm, useSuspenseCart } from '@/lib/cart';
import { imageUrl, money } from '@/lib/format';

type Cart = ReturnType<typeof useCartData>;
type Line = Cart['lines']['nodes'][number];

const useCartData = () => useSuspenseCart((state) => state.data);

const toAnalyticsLine = (line: Line): AnalyticsCartLine | null => {
	const { merchandise } = line;
	const product = merchandise?.product;
	if (!(merchandise?.id && product?.id)) {
		return null;
	}
	return {
		id: line.id,
		merchandise: {
			id: merchandise.id,
			price: line.cost.amountPerQuantity,
			product: {
				handle: product.handle,
				id: product.id,
				title: product.title,
				vendor: product.vendor,
			},
			sku: merchandise.sku ?? null,
			title: merchandise.title ?? product.title,
		},
		quantity: line.quantity,
	};
};

/** The cart in the shape Hydrogen's analytics wants, or `null` if it is incomplete. */
const toAnalyticsCart = (cart: Cart): AnalyticsCart | null => {
	if (!cart.id) {
		return null;
	}
	const lines = cart.lines.nodes.map(toAnalyticsLine);
	if (lines.some((line) => line === null)) {
		return null;
	}
	return {
		cost: cart.cost,
		id: cart.id,
		lines: { nodes: lines.filter((line) => line !== null) },
		updatedAt: cart.updatedAt,
	};
};

/** Publishes one cart view per visit, once the cart has settled. */
const CartViewed = ({ cart }: { cart: Cart }) => {
	const settled = useCart(
		(state) => !(state.revalidating || state.pending.cost || state.pending.note)
	);
	const published = useRef(false);

	useEffect(() => {
		if (!settled || published.current) {
			return;
		}
		const analyticsCart = toAnalyticsCart(cart);
		// An empty cart Shopify hasn't created yet is `null`. A cart with lines
		// waits until Shopify confirms them.
		if (!analyticsCart && cart.lines.nodes.length > 0) {
			return;
		}
		published.current = true;
		getAnalytics()?.publish(AnalyticsEvent.CART_VIEWED, {
			cart: analyticsCart,
		});
	}, [cart, settled]);

	return null;
};

const CartLine = ({ line }: { line: Line }) => {
	const { formProps, register } = useCartForm();
	const pending = useCart((state) => state.pending.lines.has(line.id));
	const { merchandise } = line;
	const image = merchandise?.image;
	const options = merchandise?.selectedOptions?.filter(
		(option) => option.value !== 'Default Title'
	);

	return (
		<li
			className="cart-line"
			data-pending={pending}
		>
			{image ? (
				<img
					alt={image.altText ?? merchandise?.product?.title ?? ''}
					height={96}
					src={imageUrl(image.url, 200)}
					width={96}
				/>
			) : (
				<span className="cart-line-image" />
			)}
			<div className="cart-line-details">
				<Link href={`/products/${merchandise?.product?.handle ?? ''}`}>
					{merchandise?.product?.title}
				</Link>
				{options && options.length > 0 ? (
					<p className="cart-line-options">
						{options.map((option) => option.value).join(' / ')}
					</p>
				) : null}
				<form
					className="quantity"
					{...formProps()}
				>
					<button
						{...register('set')}
						hidden
						type="submit"
					/>
					<input
						type="hidden"
						{...register('lineId', { value: line.id })}
					/>
					<button
						aria-label="Decrease quantity"
						{...register('decrease')}
						type="submit"
					>
						−
					</button>
					<input
						aria-label="Quantity"
						{...register('quantity', {
							interactive: true,
							value: line.quantity,
						})}
					/>
					<button
						aria-label="Increase quantity"
						{...register('increase')}
						type="submit"
					>
						+
					</button>
					<button
						className="remove"
						{...register('remove')}
						type="submit"
					>
						Remove
					</button>
				</form>
			</div>
			<span className="cart-line-price">{money(line.cost.totalAmount)}</span>
		</li>
	);
};

const CartBody = () => {
	const cart = useCartData();
	const costPending = useCart(
		(state) => state.revalidating || state.pending.cost
	);
	const lines = cart.lines.nodes;

	if (lines.length === 0) {
		return (
			<>
				<CartViewed cart={cart} />
				<p>
					Your cart is empty. <Link href="/">Keep shopping</Link>
				</p>
			</>
		);
	}

	return (
		<>
			<CartViewed cart={cart} />
			<ul className="cart-lines">
				{lines.map((line) => (
					<CartLine
						key={line.id}
						line={line}
					/>
				))}
			</ul>
			<div
				className="cart-summary"
				data-pending={costPending}
			>
				<p>
					<span>Subtotal</span>
					<span>{money(cart.cost.subtotalAmount)}</span>
				</p>
				<a
					className="checkout"
					href={cart.checkoutUrl}
				>
					Check out
				</a>
			</div>
		</>
	);
};

export const CartView = () => (
	<Suspense fallback={<p>Loading cart…</p>}>
		<CartBody />
	</Suspense>
);
