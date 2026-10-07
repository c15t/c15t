'use client';

import type { Product } from '@/lib/products';
import type { TrackedAddToCart } from '@/lib/use-track-add-to-cart';

import styles from './cart-toast.module.css';

interface CartToastProps {
	toast: { id: number; product: Product; tracked: TrackedAddToCart } | null;
	onDismiss: () => void;
}

const sharingNote = ({ analytics, meta }: TrackedAddToCart) => {
	if (analytics && meta) {
		return 'Sent to our analytics and to Meta.';
	}
	if (analytics) {
		return 'Sent to our analytics, not to Meta.';
	}
	if (meta) {
		return 'Sent to Meta, not to our analytics.';
	}
	return 'Not sent anywhere. Analytics and marketing are off.';
};

/** Confirms the add, and says where the add-to-cart event went. */
export const CartToast = ({ toast, onDismiss }: CartToastProps) => (
	<output className={styles.region}>
		{toast && (
			<div
				key={toast.id}
				className={styles.toast}
			>
				<div>
					<p className={styles.title}>{toast.product.name} is in your cart</p>
					<p
						className={styles.note}
						data-shared={
							toast.tracked.analytics || toast.tracked.meta ? '' : undefined
						}
					>
						{sharingNote(toast.tracked)}
					</p>
				</div>
				<button
					type="button"
					className={styles.close}
					onClick={onDismiss}
					aria-label="Dismiss"
				>
					<svg
						viewBox="0 0 16 16"
						width="16"
						height="16"
						aria-hidden="true"
					>
						<path
							d="M4 4l8 8M12 4l-8 8"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			</div>
		)}
	</output>
);
