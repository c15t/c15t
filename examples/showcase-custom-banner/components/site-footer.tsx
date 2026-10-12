import { PrivacySettingsLink } from './privacy-settings-link';

import styles from './site-chrome.module.css';

export const SiteFooter = () => (
	<footer className={styles.footer}>
		<div className={styles.footerInner}>
			<p className={styles.footerNote}>
				Northwind Coffee Roasters. Roasted Tuesdays and Fridays, shipped within
				two days.
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
					<PrivacySettingsLink />
				</li>
			</ul>
		</div>
	</footer>
);
