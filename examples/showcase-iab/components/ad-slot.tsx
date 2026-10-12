'use client';

import type { ReactNode } from 'react';

import type { AdPartner } from '@/lib/ad-partners';
import { canServe, useTcfData } from '@/lib/use-tcf-data';

interface AdSlotProps {
	partner: AdPartner;
	format: 'leaderboard' | 'rectangle' | 'native';
	label?: string;
	/** The creative. Real sites hand this space to the partner's ad tag. */
	children: ReactNode;
}

/**
 * Space reserved for one partner's ad. It stays blank while the visitor
 * decides, fills once the TC string allows the partner and its purposes,
 * and says why it is empty otherwise. The size never changes, so the
 * article does not jump when an ad arrives.
 */
export const AdSlot = ({
	partner,
	format,
	label = 'Advertisement',
	children,
}: AdSlotProps) => {
	const tcData = useTcfData();
	let state: 'waiting' | 'filled' | 'empty' = 'waiting';
	if (tcData) {
		state = canServe(tcData, partner) ? 'filled' : 'empty';
	}

	return (
		<aside
			className={`ad-slot ad-slot-${format}`}
			aria-label={label}
			data-state={state}
		>
			<p
				className="ad-label"
				aria-hidden="true"
			>
				{label}
			</p>
			<div className="ad-frame">
				{state === 'filled' && children}
				{state === 'empty' && (
					<p className="ad-empty">
						No {format === 'native' ? 'sponsored story' : 'ad'} here.{' '}
						{partner.name} needs your consent to show one.
					</p>
				)}
			</div>
		</aside>
	);
};
