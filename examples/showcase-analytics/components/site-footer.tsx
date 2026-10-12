'use client';

import { ConsentDialogLink } from 'c15t/next';

import styles from './site-chrome.module.css';

export const SiteFooter = () => (
	<footer className={styles.footer}>
		<div className={styles.footerInner}>
			<p className={styles.footerNote}>
				Northwind Coffee Roasters, Portland, Oregon.
			</p>
			<ul className={styles.footerLinks}>
				<li>
					<a href="/">Shipping</a>
				</li>
				<li>
					<a href="/">Wholesale</a>
				</li>
				<li>
					<a href="/">Contact</a>
				</li>
				<li>
					<ConsentDialogLink className={styles.privacy}>
						Privacy settings
					</ConsentDialogLink>
				</li>
			</ul>
		</div>
	</footer>
);
