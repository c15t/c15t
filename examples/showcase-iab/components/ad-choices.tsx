'use client';

import { ConsentDialogLink } from 'c15t/next';

import { adPartners } from '@/lib/ad-partners';
import { canServe, useTcfData } from '@/lib/use-tcf-data';

/**
 * Which partners may show ads on this page, read from the same TC string
 * the partners read, and a way back into the preference center.
 */
export const AdChoices = () => {
	const tcData = useTcfData();

	return (
		<section
			className="ad-choices"
			aria-labelledby="ad-choices-title"
		>
			<h2 id="ad-choices-title">Your ad choices</h2>
			<p>
				Ads pay for the Journal. These partners can show them on this page if
				you let them.
			</p>
			<ul className="partner-list">
				{Object.values(adPartners).map((partner) => {
					let status = 'Not chosen';
					if (tcData) {
						status = canServe(tcData, partner) ? 'Allowed' : 'Off';
					}
					return (
						<li key={partner.vendorId}>
							<span className="partner-name">
								{partner.name}
								<span className="partner-placement">{partner.placement}</span>
							</span>
							<span
								className="partner-status"
								data-status={status.toLowerCase().replace(' ', '-')}
							>
								{status}
							</span>
						</li>
					);
				})}
			</ul>
			<p className="ad-choices-note">
				Your choice is saved in this browser as a TCF consent string, the format
				ad partners read before they show an ad.
			</p>
			<ConsentDialogLink className="button-secondary">
				Change ad choices
			</ConsentDialogLink>
		</section>
	);
};
