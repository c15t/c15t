'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
	{ href: '/account/profile', label: 'Profile' },
	{ href: '/account/orders', label: 'Orders' },
	{ href: '/account/subscriptions', label: 'Subscriptions' },
	{ href: '/account/privacy', label: 'Privacy' },
] as const;

export const AccountNav = () => {
	const pathname = usePathname();

	return (
		<nav
			aria-label="Account"
			className="account-nav"
		>
			<ul>
				{LINKS.map((link) => (
					<li key={link.href}>
						<Link
							href={link.href}
							aria-current={pathname === link.href ? 'page' : undefined}
						>
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
};
