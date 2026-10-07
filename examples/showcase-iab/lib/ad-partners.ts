// The partners that fill the Journal's ad slots, with the TCF purposes each
// one needs consent for. The vendor IDs match public/vendor-list.json.
//
// IAB purposes used here:
// 1 Store and/or access information on a device
// 2 Use limited data to select advertising
// 3 Create profiles for personalised advertising
// 4 Use profiles to select personalised advertising
// 7 Measure advertising performance

export interface AdPartner {
	vendorId: number;
	name: string;
	/** Where this partner shows up on the page, in the reader's words. */
	placement: string;
	purposes: number[];
}

export const adPartners = {
	// A contextual ad: picked from the article, not from a profile.
	leaderboard: {
		name: 'Larkspur Ad Server',
		placement: 'Banner ad above the article',
		purposes: [1, 2],
		vendorId: 1,
	},
	// A personalised ad: needs the two profile purposes.
	rectangle: {
		name: 'Harbor Exchange',
		placement: 'Personalised ad beside the article',
		purposes: [1, 3, 4],
		vendorId: 2,
	},
	// A paid story, measured so the sponsor knows how it performed.
	sponsored: {
		name: 'Fieldnote Native',
		placement: 'Sponsored story after the article',
		purposes: [1, 2, 7],
		vendorId: 3,
	},
} satisfies Record<string, AdPartner>;
