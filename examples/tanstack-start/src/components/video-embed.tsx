/* oxlint-disable react/iframe-missing-sandbox -- The cross-origin YouTube player requires scripts and its own origin. */
// #region docs:video-embed
import { ConsentDialogLink, ConsentGate } from 'c15t/tanstack-start';

export const VideoEmbed = () => (
	<ConsentGate
		category="measurement"
		placeholder={
			<div>
				<p>
					Allow measurement to load this YouTube video. No video request is sent
					before permission.
				</p>
				<ConsentDialogLink>Open privacy settings</ConsentDialogLink>
			</div>
		}
	>
		<iframe
			src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
			title="YouTube video"
			sandbox="allow-scripts allow-same-origin allow-presentation"
			allowFullScreen
		/>
	</ConsentGate>
);
// #endregion docs:video-embed
