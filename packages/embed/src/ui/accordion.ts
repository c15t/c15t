/**
 * Vanilla JS accordion for consent category expand/collapse.
 */

export interface AccordionItemConfig {
	id: string;
	trigger: HTMLElement;
	content: HTMLElement;
}

export interface AccordionOptions {
	/** Allow multiple items open at once */
	multiple?: boolean;
}

/**
 * Creates an accordion controller that manages open/close state
 * for a set of items. Returns functions to add items and toggle them.
 */
export function createAccordion(options: AccordionOptions = {}) {
	const openItems = new Set<string>();
	const items = new Map<
		string,
		{ trigger: HTMLElement; content: HTMLElement }
	>();

	function updateItem(id: string) {
		const item = items.get(id);
		if (!item) return;

		const isOpen = openItems.has(id);

		// Update trigger arrow
		const arrow = item.trigger.querySelector('[data-accordion-arrow]');
		if (arrow) {
			arrow.textContent = isOpen ? '−' : '+';
		}

		// Update ARIA
		item.trigger.setAttribute('aria-expanded', String(isOpen));
		item.content.setAttribute('aria-hidden', String(!isOpen));

		// Animate content
		if (isOpen) {
			item.content.style.display = 'block';
			item.content.style.maxHeight = `${item.content.scrollHeight}px`;
			item.content.style.opacity = '1';
		} else {
			item.content.style.maxHeight = '0';
			item.content.style.opacity = '0';
			// Hide after animation
			setTimeout(() => {
				if (!openItems.has(id)) {
					item.content.style.display = 'none';
				}
			}, 200);
		}
	}

	function toggle(id: string) {
		if (openItems.has(id)) {
			openItems.delete(id);
		} else {
			if (!options.multiple) {
				// Close all others
				for (const openId of openItems) {
					openItems.delete(openId);
					updateItem(openId);
				}
			}
			openItems.add(id);
		}
		updateItem(id);
	}

	function addItem(config: AccordionItemConfig) {
		items.set(config.id, {
			trigger: config.trigger,
			content: config.content,
		});

		// Initial state: closed
		config.content.style.maxHeight = '0';
		config.content.style.opacity = '0';
		config.content.style.overflow = 'hidden';
		config.content.style.transition =
			'max-height var(--c15t-duration-normal, 250ms) var(--c15t-easing, ease), opacity var(--c15t-duration-fast, 150ms)';
		config.content.style.display = 'none';
		config.content.setAttribute('aria-hidden', 'true');

		config.trigger.setAttribute('aria-expanded', 'false');
		config.trigger.addEventListener('click', (e) => {
			// Don't toggle if clicking the switch
			if ((e.target as HTMLElement).closest('label')) return;
			toggle(config.id);
		});
	}

	return { addItem, toggle };
}
