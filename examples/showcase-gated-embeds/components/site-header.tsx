const nav = [
	{ href: '#', label: 'Shop' },
	{ href: '#', label: 'Subscriptions' },
	{ current: true, href: '/', label: 'Journal' },
	{ href: '#', label: 'Account' },
];

export const SiteHeader = () => (
	<header className="site-header">
		<div className="site-header-inner">
			<a
				className="wordmark"
				href="/"
			>
				<svg
					viewBox="0 0 24 24"
					aria-hidden="true"
					className="wordmark-mark"
				>
					<path
						d="M12 2c-4.4 2.6-6.5 6-6.5 10S7.6 19.4 12 22c4.4-2.6 6.5-6 6.5-10S16.4 4.6 12 2Z"
						fill="currentColor"
					/>
					<path
						d="M12 3.5c-1.6 3-1.6 5.6 0 8.5s1.6 5.5 0 8.5"
						stroke="#fbf8f3"
						strokeWidth="1.6"
						fill="none"
						strokeLinecap="round"
					/>
				</svg>
				Northwind Coffee
			</a>
			<nav aria-label="Main">
				<ul className="site-nav">
					{nav.map((item) => (
						<li key={item.label}>
							<a
								href={item.href}
								aria-current={item.current ? 'page' : undefined}
							>
								{item.label}
							</a>
						</li>
					))}
				</ul>
			</nav>
		</div>
	</header>
);
