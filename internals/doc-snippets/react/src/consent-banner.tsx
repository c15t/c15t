// #region docs:headless-banner
import { useHeadlessConsentUI, useTranslations } from 'c15t/react/headless';

const ACTION_LABELS = {
	accept: 'acceptAll',
	customize: 'customize',
	dismiss: 'acknowledge',
	reject: 'rejectAll',
	save: 'save',
} as const;

export const Banner = () => {
	const { banner, performAction, openDialog } = useHeadlessConsentUI();
	const { common, rights } = useTranslations();

	if (!banner.isVisible) {
		return null;
	}

	return (
		<section aria-label="Privacy">
			{banner.preferenceControls.map((right) => (
				<button
					key={right}
					type="button"
					onClick={openDialog}
				>
					{right === 'opt-out' ? rights?.optOut : rights?.preferences}
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
							{common[ACTION_LABELS[action]]}
						</button>
					))}
				</div>
			))}
		</section>
	);
};
// #endregion docs:headless-banner
