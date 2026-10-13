// #region docs:headless-banner
import {
	useBannerCopy,
	useConsentLabels,
	useHeadlessConsentUI,
} from 'c15t/react/headless';

export const Banner = () => {
	const { banner, performAction, openDialog } = useHeadlessConsentUI();
	const { title, description } = useBannerCopy();
	const labels = useConsentLabels();

	if (!banner.isVisible) {
		return null;
	}

	return (
		<section aria-label={title}>
			<h2>{title}</h2>
			<p>{description}</p>
			{banner.preferenceControls.map((right) => (
				<button
					key={right}
					type="button"
					onClick={openDialog}
				>
					{labels.preferenceControls[right]}
				</button>
			))}
			{banner.actionGroups.map((group) => (
				<div key={group.join('-')}>
					{group.map((action) => (
						<button
							key={action}
							type="button"
							data-primary={banner.primaryActions.includes(action) || undefined}
							onClick={() => performAction(action)}
						>
							{labels.actions[action]}
						</button>
					))}
				</div>
			))}
		</section>
	);
};
// #endregion docs:headless-banner
