// #region docs:optional-feature
import { useConsent } from 'c15t/react';

export const OptionalFeature = () => {
	const allowed = useConsent('marketing');
	return allowed ? <div>Optional marketing content</div> : null;
};
// #endregion docs:optional-feature
