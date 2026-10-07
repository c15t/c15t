'use client';

import { useInit, useModel, useOverrides, useSetOverrides } from 'c15t/next';
import { useEffect, useId } from 'react';

import type { Dictionary } from '@/lib/dictionaries';

const visitors = [
	{ country: 'DE', key: 'de', region: undefined },
	{ country: 'US', key: 'usCa', region: 'CA' },
	{ country: 'BR', key: 'br', region: undefined },
] as const;

type Visitor = (typeof visitors)[number];

// Remembered for the tab, so the preview survives a reload or a language
// switch the way a real visitor's location would.
const STORAGE_KEY = 'northwind-preview-visitor';

/**
 * Shows the shop as a visitor from another region sees it. c15t matches the
 * location against its policy rules and the banner follows: opt-in in
 * Germany, opt-out with no banner in California, nothing in Brazil.
 *
 * With a backend, the location comes from the request and this control is
 * not needed.
 */
export const VisitorPreview = ({ copy }: { copy: Dictionary['preview'] }) => {
	const labelId = useId();
	const setOverrides = useSetOverrides();
	const init = useInit();
	const { country, region } = useOverrides();
	const model = useModel();

	const preview = (visitor: Visitor) => {
		setOverrides({ country: visitor.country, region: visitor.region });
		// Changing the location alone keeps the current policy. Init resolves
		// the rules again for the new one.
		void init();
		sessionStorage.setItem(STORAGE_KEY, visitor.key);
	};

	useEffect(() => {
		const saved = visitors.find(
			({ key }) => key === sessionStorage.getItem(STORAGE_KEY)
		);
		if (saved) {
			setOverrides({ country: saved.country, region: saved.region });
			void init();
		}
	}, [init, setOverrides]);

	let outcome: string | null = null;
	if (!country) {
		outcome = copy.outcome.unknown;
	} else if (model) {
		outcome = copy.outcome[model === 'iab' ? 'opt-in' : model];
	}

	return (
		<section className="preview">
			<div className="preview-inner">
				<p
					id={labelId}
					className="preview-label"
				>
					{copy.label}
				</p>
				<fieldset
					className="segmented"
					aria-labelledby={labelId}
				>
					{visitors.map((visitor) => (
						<button
							key={visitor.key}
							type="button"
							aria-pressed={
								country === visitor.country && region === visitor.region
							}
							onClick={() => preview(visitor)}
						>
							{copy.regions[visitor.key]}
						</button>
					))}
				</fieldset>
				<p
					className="preview-outcome"
					aria-live="polite"
				>
					{outcome}
				</p>
			</div>
		</section>
	);
};
