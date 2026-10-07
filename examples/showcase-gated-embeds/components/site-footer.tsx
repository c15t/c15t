'use client';

import { ConsentDialogLink } from 'c15t/next';

export const SiteFooter = () => (
	<footer className="site-footer">
		<div className="site-footer-inner">
			<p>Northwind Coffee. Small-batch roasters in Portland, Oregon.</p>
			<ul className="footer-links">
				<li>
					<ConsentDialogLink className="footer-button">
						Privacy settings
					</ConsentDialogLink>
				</li>
			</ul>
		</div>
	</footer>
);
