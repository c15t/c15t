import Link from 'next/link';

export const SiteHeader = () => (
	<header className="site-header">
		<div className="site-header-inner">
			<Link
				href="/"
				className="wordmark"
			>
				Northwind <span>Coffee</span>
			</Link>
			<nav aria-label="Main">
				<ul className="site-nav">
					<li>
						<Link href="/">Shop</Link>
					</li>
					<li>
						<Link href="/#subscriptions">Subscriptions</Link>
					</li>
					<li>
						<Link href="/#journal">Journal</Link>
					</li>
					<li>
						<Link href="/account/profile">Account</Link>
					</li>
				</ul>
			</nav>
		</div>
	</header>
);
