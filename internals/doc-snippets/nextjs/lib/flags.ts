/** Stands in for the Vercel Flags SDK flag in the banner experiments guide. */
export const bannerExperimentFlag = (): Promise<'off' | 'control' | 'wall'> =>
	Promise.resolve('control');
