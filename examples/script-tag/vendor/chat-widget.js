// Stands in for a chat widget. Gated on `functionality`; note it draws
// into the page, so consent decides whether the bubble ever appears.
(() => {
	const bubble = document.createElement('button');
	bubble.type = 'button';
	bubble.id = 'example-chat';
	bubble.textContent = 'Chat';
	bubble.setAttribute(
		'aria-label',
		'Chat widget (loaded after functionality consent)'
	);
	bubble.style.cssText = [
		'position:fixed;top:16px;right:16px;border-radius:999px',
		'padding:.6rem 1rem;background:#0a66ff;color:#fff;border:0',
		'font:600 14px system-ui;cursor:pointer',
	].join(';');
	document.body.append(bubble);
	window.dispatchEvent(
		new CustomEvent('example:log', { detail: 'vendor/chat-widget.js executed' })
	);
})();
