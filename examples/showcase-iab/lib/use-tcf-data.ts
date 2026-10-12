'use client';

import type { TCData } from 'c15t';
import { useEffect, useState } from 'react';

import type { AdPartner } from '@/lib/ad-partners';

/**
 * The visitor's TCF choices, read the way an ad tag reads them: through
 * `window.__tcfapi`, the standard CMP API that c15t's IAB module installs.
 * Google Publisher Tag, Prebid.js and other TCF vendors call the same API,
 * so nothing here depends on c15t.
 *
 * @returns The latest saved TC data, or `null` while there is no choice.
 */
export const useTcfData = function useTcfData(): TCData | null {
	const [tcData, setTcData] = useState<TCData | null>(null);

	useEffect(() => {
		const { __tcfapi: api } = window;
		if (!api) {
			return;
		}
		let listenerId: number | undefined;
		let disposed = false;
		const removeListener = () => {
			if (listenerId !== undefined) {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					() => {
						// Nothing to do once the listener is gone.
					},
					listenerId
				);
			}
		};
		api('addEventListener', 2, (data, success) => {
			if (!(success && data)) {
				return;
			}
			({ listenerId } = data);
			if (disposed) {
				removeListener();
				return;
			}
			// `tcloaded` brings a saved choice and `useractioncomplete` a new
			// one. `cmpuishown` means the banner or dialog is open, so the slots
			// keep what they show until the visitor saves. No status means there
			// is no choice, for example after the saved one expired.
			if (data.eventStatus === 'cmpuishown') {
				return;
			}
			const hasChoice =
				data.eventStatus === 'tcloaded' ||
				data.eventStatus === 'useractioncomplete';
			setTcData(hasChoice ? data : null);
		});
		return () => {
			disposed = true;
			removeListener();
		};
	}, []);

	return tcData;
};

/**
 * Whether a partner may serve: the visitor consented to the partner and to
 * every purpose it needs. Where GDPR does not apply, TCF needs no consent.
 *
 * @param tcData - TC data from {@link useTcfData}.
 * @param partner - The partner and the purposes it needs.
 * @returns `true` when the partner may serve an ad.
 */
export const canServe = function canServe(
	tcData: TCData,
	partner: AdPartner
): boolean {
	if (tcData.gdprApplies === false) {
		return true;
	}
	return (
		tcData.vendor.consents[partner.vendorId] === true &&
		partner.purposes.every((id) => tcData.purpose.consents[id] === true)
	);
};
