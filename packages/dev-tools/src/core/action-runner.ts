import { createElement } from './elements';

/** Runs a UI command with pending, success, and failure feedback. */
export type RunAction = (
	pending: string,
	task: () => Promise<unknown>,
	success: string
) => void;

export interface ActionFeedback {
	status: 'pending' | 'success' | 'error';
	message: string;
}

export const appendActionFeedback = (
	document: Document,
	panel: HTMLElement,
	content: HTMLElement,
	action: ActionFeedback | undefined
): void => {
	if (action?.status === 'pending') {
		content.setAttribute('aria-busy', 'true');
		for (const control of content.querySelectorAll<
			HTMLInputElement | HTMLButtonElement | HTMLSelectElement
		>('button, input, select')) {
			control.disabled = true;
		}
	}
	if (action) {
		const feedback = createElement(
			document,
			'p',
			'c15t-dev-tools__feedback',
			action.message
		);
		feedback.setAttribute(
			'role',
			action.status === 'error' ? 'alert' : 'status'
		);
		feedback.dataset.status = action.status;
		panel.append(feedback);
	}
};
