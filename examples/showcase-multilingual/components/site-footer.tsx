'use client';

import { ConsentDialogLink } from 'c15t/next';

import type { Dictionary } from '@/lib/dictionaries';

export const SiteFooter = ({ copy }: { copy: Dictionary['footer'] }) => (
	<footer className="site-footer">
		<div className="site-footer-inner">
			<p>{copy.note}</p>
			<ul className="footer-links">
				<li>
					<a href="/">{copy.shipping}</a>
				</li>
				<li>
					<a href="/">{copy.wholesale}</a>
				</li>
				<li>
					<a href="/">{copy.contact}</a>
				</li>
				<li>
					<ConsentDialogLink className="footer-button">
						{copy.privacySettings}
					</ConsentDialogLink>
				</li>
			</ul>
		</div>
	</footer>
);
