'use client';

import { useCart } from './cart';

import styles from './site-chrome.module.css';

const navItems = ['Shop', 'Subscriptions', 'Journal', 'Account'];

export const SiteHeader = () => {
	const { count } = useCart();

	return (
		<header className={styles.header}>
			<div className={styles.headerInner}>
				<a
					href="/"
					className={styles.wordmark}
				>
					<svg
						viewBox="0 0 20 20"
						width="20"
						height="20"
						aria-hidden="true"
					>
						<ellipse
							cx="10"
							cy="10"
							rx="6.5"
							ry="8.5"
							transform="rotate(30 10 10)"
							fill="currentColor"
						/>
						<path
							d="M13.5 3.5c-3 2.5-4 5-3.5 6.5s-.5 4-3.5 6.5"
							fill="none"
							stroke="var(--nw-cream)"
							strokeWidth="1.3"
							strokeLinecap="round"
						/>
					</svg>
					Northwind Coffee
				</a>
				<nav
					className={styles.nav}
					aria-label="Main"
				>
					{navItems.map((item) => (
						<a
							key={item}
							href="/"
							aria-current={item === 'Shop' ? 'page' : undefined}
						>
							{item}
						</a>
					))}
				</nav>
				<a
					href="/"
					className={styles.cart}
				>
					Cart
					<span
						className={styles.count}
						aria-label={`${count} ${count === 1 ? 'item' : 'items'}`}
					>
						{count}
					</span>
				</a>
			</div>
		</header>
	);
};
