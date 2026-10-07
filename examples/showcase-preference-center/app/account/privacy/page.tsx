import type { Metadata } from 'next';

import { PrivacyPreferences } from '@/components/privacy-preferences';

export const metadata: Metadata = { title: 'Privacy · Northwind Coffee' };

const PrivacyPage = () => (
	<section
		aria-labelledby="privacy-title"
		className="account-section"
	>
		<h1 id="privacy-title">Privacy</h1>
		<p className="lede">
			Choose what Northwind may use beyond what the shop needs to work. Your
			choices apply to this browser, and you can change them here at any time.
		</p>
		<PrivacyPreferences />
	</section>
);

export default PrivacyPage;
