'use client';

import { useVendorAllowed } from 'c15t/next';

import { ChatPreview } from './embed-previews';
import { GatedEmbed } from './gated-embed';

const openChat = () => {
	// Commands queue on `$crisp` until the Crisp script has loaded.
	const queue = window.$crisp ?? [];
	queue.push(['do', 'chat:open']);
	window.$crisp = queue;
};

const ChatReady = () => {
	// Functionality can be on while the visitor switched Crisp itself off in
	// Privacy settings. The script stays out then, so say so.
	const crispAllowed = useVendorAllowed('crisp');

	return (
		<div className="chat-ready">
			<ChatPreview />
			<div className="chat-ready-body">
				<p className="embed-label">Live chat, run by Crisp</p>
				{crispAllowed ? (
					<>
						<p>
							Chat is on. A roaster answers during café hours, usually within a
							few minutes.
						</p>
						<button
							type="button"
							className="button button-primary"
							onClick={openChat}
						>
							Open chat
						</button>
					</>
				) : (
					<p>Crisp is switched off in your Privacy settings.</p>
				)}
			</div>
		</div>
	);
};

/**
 * The chat itself is the Crisp script registered in `consent.tsx`. This card
 * is its in-page placeholder: it grants Functionality, which lets c15t load
 * the script, and then offers a button that opens the chat window.
 */
export const SupportChat = () => (
	<GatedEmbed
		category="functionality"
		className="chat-card"
		label="Live chat, run by Crisp"
		disclosure="Loading the chat sends your IP address, browser details and anything you type to Crisp, and sets a cookie that keeps your conversation."
		allowLabel="Allow and load chat"
		preview={<ChatPreview />}
	>
		<ChatReady />
	</GatedEmbed>
);
