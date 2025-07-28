'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

/**
 * Page actions component properties
 *
 * @interface PageActionsProps
 */
interface PageActionsProps {
	/** The markdown URL for the current page (optional, will be derived from pathname if not provided) */
	markdownUrl?: string;
	/** The GitHub URL for editing the page (optional, will be derived from pathname if not provided) */
	githubUrl?: string;
}

/**
 * Page actions component with feedback and utility buttons
 *
 * Provides interactive buttons for:
 * - Copying page markdown content for LLMs
 * - Opening ChatGPT with pre-filled prompt
 * - Opening Claude with pre-filled prompt
 * - Copying content to T3 Chat
 * - Editing on GitHub (auto-derives URL from current page path)
 * - Feedback collection
 *
 * @param props - The page actions properties
 * @returns The page actions JSX element
 */
export function PageActions({ markdownUrl, githubUrl }: PageActionsProps = {}) {
	const pathname = usePathname();
	const [copyStatus, setCopyStatus] = useState<
		'idle' | 'copying' | 'copied' | 'error'
	>('idle');
	const [t3ChatStatus, setT3ChatStatus] = useState<
		'idle' | 'copying' | 'copied' | 'error'
	>('idle');

	// Derive markdown URL from pathname if not provided
	const finalMarkdownUrl = markdownUrl || `${pathname}.mdx`;

	// Derive GitHub URL from pathname if not provided
	const finalGithubUrl =
		githubUrl ||
		(() => {
			// Convert pathname to GitHub content path
			// e.g., /docs/introduction -> docs/content/introduction.mdx
			const slug =
				pathname.replace('/docs/', '').replace(/^\/+|\/+$/g, '') || 'index';
			return `https://github.com/c15t/c15t/blob/main/apps/docs-new-layout/content/docs/${slug}.mdx`;
		})();

	/**
	 * Copies the page markdown content to clipboard
	 */
	const handleCopyMarkdown = async () => {
		setCopyStatus('copying');
		try {
			const response = await fetch(finalMarkdownUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status}`);
			}
			const content = await response.text();
			await navigator.clipboard.writeText(content);
			setCopyStatus('copied');
			setTimeout(() => setCopyStatus('idle'), 2000);
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.error('Failed to copy markdown:', error);
			setCopyStatus('error');
			setTimeout(() => setCopyStatus('idle'), 2000);
		}
	};

	/**
	 * Opens ChatGPT with a pre-filled prompt containing the page content
	 */
	const handleAskChatGPT = async () => {
		try {
			const response = await fetch(finalMarkdownUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status}`);
			}
			const content = await response.text();
			const prompt = `I have a question about this documentation:\n\n${content}\n\nMy question is: `;
			const encodedPrompt = encodeURIComponent(prompt);
			window.open(`https://chat.openai.com/?q=${encodedPrompt}`, '_blank');
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.error('Failed to open ChatGPT:', error);
			// Fallback to opening ChatGPT without content
			window.open('https://chat.openai.com/', '_blank');
		}
	};

	/**
	 * Opens Claude with a pre-filled prompt containing the page content
	 */
	const handleAskClaude = async () => {
		try {
			const response = await fetch(finalMarkdownUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status}`);
			}
			const content = await response.text();
			const prompt = `I have a question about this documentation:\n\n${content}\n\nMy question is: `;
			const encodedPrompt = encodeURIComponent(prompt);
			window.open(`https://claude.ai/chat?q=${encodedPrompt}`, '_blank');
		} catch (error) {
			console.error('Failed to open Claude:', error);
			// Fallback to opening Claude without content
			window.open('https://claude.ai/', '_blank');
		}
	};

	/**
	 * Copies content to T3 chat (or opens T3 chat with content)
	 */
	const handleCopyToT3Chat = async () => {
		setT3ChatStatus('copying');
		try {
			const response = await fetch(finalMarkdownUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status}`);
			}
			const content = await response.text();

			// Copy content to clipboard for T3 chat
			await navigator.clipboard.writeText(content);
			setT3ChatStatus('copied');
			setTimeout(() => setT3ChatStatus('idle'), 2000);

			// Optional: Open T3 chat platform if URL is available
			// window.open('https://t3-chat-url.com', '_blank');
		} catch (error) {
			console.error('Failed to copy to T3 chat:', error);
			setT3ChatStatus('error');
			setTimeout(() => setT3ChatStatus('idle'), 2000);
		}
	};

	return (
		<div className="border-base-200 border-t p-8 dark:border-base-800">
			<div className="gap-2 space-y-4">
				<button
					id="copy-markdown"
					type="button"
					onClick={handleCopyMarkdown}
					disabled={copyStatus === 'copying'}
					className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 disabled:opacity-50 dark:text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="icon size-4 text-base-900 dark:text-white"
						aria-hidden="true"
					>
						<path stroke="none" d="M0 0h24v24H0z" fill="none" />
						<path d="M3 5m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
						<path d="M7 15v-6l2 2l2 -2v6" />
						<path d="M14 13l2 2l2 -2m-2 2v-6" />
					</svg>
					{copyStatus === 'copying' && 'Copying...'}
					{copyStatus === 'copied' && 'Copied!'}
					{copyStatus === 'error' && 'Copy failed'}
					{copyStatus === 'idle' && 'Copy page Markdown for LLMs'}
				</button>
				<button
					id="ask-chatgpt"
					type="button"
					onClick={handleAskChatGPT}
					className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 dark:text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="icon size-4 text-base-900 dark:text-white"
						aria-hidden="true"
					>
						<path stroke="none" d="M0 0h24v24H0z" fill="none" />
						<path d="M11.217 19.384a3.501 3.501 0 0 0 6.783 -1.217v-5.167l-6 -3.35" />
						<path d="M5.214 15.014a3.501 3.501 0 0 0 4.446 5.266l4.34 -2.534v-6.946" />
						<path d="M6 7.63c-1.391 -.236 -2.787 .395 -3.534 1.689a3.474 3.474 0 0 0 1.271 4.745l4.263 2.514l6 -3.348" />
						<path d="M12.783 4.616a3.501 3.501 0 0 0 -6.783 1.217v5.067l6 3.45" />
						<path d="M18.786 8.986a3.501 3.501 0 0 0 -4.446 -5.266l-4.34 2.534v6.946" />
						<path d="M18 16.302c1.391 .236 2.787 -.395 3.534 -1.689a3.474 3.474 0 0 0 -1.271 -4.745l-4.308 -2.514l-5.955 3.42" />
					</svg>
					Ask ChatGPT
				</button>
				<button
					id="ask-claude"
					type="button"
					onClick={handleAskClaude}
					className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 dark:text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="0"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="icon size-4 text-base-900 dark:text-white"
						aria-hidden="true"
					>
						<path
							fill="currentColor"
							d="m5.92 15.3l3.94-2.2l.06-.2l-.06-.1h-.2L9 12.76l-2.24-.06l-1.96-.1l-1.9-.1l-.48-.1l-.42-.6l.04-.3l.4-.26l.58.04l1.26.1l1.9.12l1.38.08l2.04.24h.32l.04-.14l-.1-.08l-.08-.08L7.8 10.2L5.68 8.8l-1.12-.82l-.6-.4l-.3-.4l-.12-.84l.54-.6l.74.06l.18.04l.74.58l1.6 1.22L9.4 9.2l.3.24l.12-.08l.02-.06l-.14-.22L8.6 7L7.4 4.92l-.54-.86l-.14-.52c-.06-.2-.08-.4-.08-.6l.6-.84l.36-.1l.84.12l.32.28l.52 1.2l.82 1.86l1.3 2.52l.4.76l.2.68l.06.2h.14v-.1l.1-1.44l.2-1.74l.2-2.24l.06-.64l.32-.76l.6-.4l.52.22l.4.58l-.06.36L14.32 5l-.52 2.42l-.3 1.64h.18l.2-.22l.82-1.08l1.38-1.72l.6-.7l.72-.74l.46-.36h.86l.62.94l-.28.98l-.88 1.12l-.74.94l-1.06 1.42l-.64 1.14l.06.08h.14l2.4-.52l1.28-.22l1.52-.26l.7.32l.08.32l-.28.68l-1.64.4l-1.92.4l-2.86.66l-.04.02l.04.06l1.28.12l.56.04h1.36l2.52.2l.66.4l.38.54l-.06.4l-1.02.52l-1.36-.32l-3.2-.76l-1.08-.26h-.16v.08l.92.9l1.66 1.5l2.12 1.94l.1.48l-.26.4l-.28-.04l-1.84-1.4l-.72-.6l-1.6-1.36h-.1v.14l.36.54l1.96 2.94l.1.9l-.14.28l-.52.2l-.54-.12l-1.16-1.6l-1.2-1.8l-.94-1.64l-.1.08l-.58 6.04l-.26.3l-.6.24l-.5-.4l-.28-.6l.28-1.24l.32-1.6l.26-1.28l.24-1.58l.14-.52v-.04h-.14l-1.2 1.66l-1.8 2.46l-1.44 1.52l-.34.14l-.6-.3l.06-.56l.32-.46l2-2.56l1.2-1.58l.8-.92l-.02-.1h-.06l-5.28 3.44l-.94.12l-.4-.4l.04-.6l.2-.2l1.6-1.1z"
						/>
					</svg>
					Ask Claude
				</button>
				<button
					id="copy-to-t3-chat"
					type="button"
					onClick={handleCopyToT3Chat}
					disabled={t3ChatStatus === 'copying'}
					className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 disabled:opacity-50 dark:text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="icon size-4 text-base-900 dark:text-white"
						aria-hidden="true"
					>
						<path stroke="none" d="M0 0h24v24H0z" fill="none" />
						<path d="M8 9h8" />
						<path d="M8 13h6" />
						<path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" />
					</svg>
					{t3ChatStatus === 'copying' && 'Copying...'}
					{t3ChatStatus === 'copied' && 'Copied to T3 Chat!'}
					{t3ChatStatus === 'error' && 'Copy failed'}
					{t3ChatStatus === 'idle' && 'Copy to T3 Chat'}
				</button>
				<a
					href={finalGithubUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 dark:text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="icon size-4 text-base-900 dark:text-white"
						aria-hidden="true"
					>
						<path
							fill="currentColor"
							d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
						/>
					</svg>
					Edit on GitHub
				</a>
				<div id="feedback-buttons" className="flex items-center gap-2">
					<span className="text-base-500 text-xs dark:text-base-400">
						Was this helpful?
					</span>
					<button
						type="button"
						className="flex h-7.5 items-center justify-center rounded-full bg-base-100 px-3 py-2 font-medium text-base-900 text-xs transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
						id="yes-btn"
					>
						Yes
					</button>
					<button
						type="button"
						className="flex h-7.5 items-center justify-center rounded-full bg-base-100 px-3 py-2 font-medium text-base-900 text-xs transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
						id="no-btn"
					>
						No
					</button>
				</div>
			</div>
		</div>
	);
}
