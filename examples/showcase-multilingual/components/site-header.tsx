import Link from 'next/link';

import type { Dictionary } from '@/lib/dictionaries';
import { locales } from '@/lib/locales';
import type { Locale } from '@/lib/locales';

const languageNames: Record<Locale, string> = {
	de: 'Deutsch',
	en: 'English',
	fr: 'Français',
};

export const SiteHeader = ({
	locale,
	dictionary,
}: {
	locale: Locale;
	dictionary: Dictionary;
}) => {
	const { nav } = dictionary;
	const navItems = [nav.shop, nav.subscriptions, nav.journal, nav.account];

	return (
		<header className="site-header">
			<div className="site-header-inner">
				<Link
					href={`/${locale}`}
					className="wordmark"
				>
					<svg
						className="wordmark-mark"
						viewBox="0 0 20 20"
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
							stroke="var(--cream)"
							strokeWidth="1.3"
							strokeLinecap="round"
						/>
					</svg>
					Northwind Coffee
				</Link>
				<nav aria-label={nav.label}>
					<ul className="site-nav">
						{navItems.map((item, index) => (
							<li key={item}>
								<a
									href={`/${locale}`}
									aria-current={index === 0 ? 'page' : undefined}
								>
									{item}
								</a>
							</li>
						))}
					</ul>
				</nav>
				<div className="header-tools">
					<nav aria-label={dictionary.language}>
						<ul className="languages">
							{locales.map((code) => (
								<li key={code}>
									<Link
										href={`/${code}`}
										hrefLang={code}
										lang={code}
										aria-current={code === locale ? 'true' : undefined}
										title={languageNames[code]}
									>
										{code.toUpperCase()}
										<span className="visually-hidden">
											{' '}
											{languageNames[code]}
										</span>
									</Link>
								</li>
							))}
						</ul>
					</nav>
					<a
						href={`/${locale}`}
						className="cart"
					>
						{nav.cart}
					</a>
				</div>
			</div>
		</header>
	);
};
