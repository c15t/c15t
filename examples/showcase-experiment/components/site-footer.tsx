'use client';

import { ConsentDialogLink } from 'c15t/next';

export const SiteFooter = () => (
	<footer className="site-footer">
		<div className="site-footer-inner">
			<p>Northwind Coffee. Roasting in Portland, Oregon, since 2014.</p>
			<ul className="footer-links">
				<li>
					<a href="/shipping">Shipping</a>
				</li>
				<li>
					<a href="/wholesale">Wholesale</a>
				</li>
				<li>
					<ConsentDialogLink className="footer-button">
						Privacy settings
					</ConsentDialogLink>
				</li>
			</ul>
		</div>
	</footer>
);
