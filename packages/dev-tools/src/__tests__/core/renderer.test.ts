import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	button,
	clearElement,
	createElement,
	createPortal,
	createSvgElement,
	div,
	input,
	label,
	replaceChildren,
	select,
	setClasses,
	span,
	toggleClass,
} from '../../core/renderer';

describe('Renderer', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('createElement', () => {
		it('should create a div element by default', () => {
			const el = createElement();
			expect(el.tagName).toBe('DIV');
		});

		it('should create element with specified tag', () => {
			const el = createElement({ tag: 'section' });
			expect(el.tagName).toBe('SECTION');
		});

		it('should set className', () => {
			const el = createElement({ className: 'test-class' });
			expect(el.className).toBe('test-class');
		});

		it('should set id', () => {
			const el = createElement({ id: 'test-id' });
			expect(el.id).toBe('test-id');
		});

		it('should set text content', () => {
			const el = createElement({ text: 'Hello World' });
			expect(el.textContent).toBe('Hello World');
		});

		it('should set HTML content', () => {
			const el = createElement({ html: '<strong>Bold</strong>' });
			expect(el.innerHTML).toBe('<strong>Bold</strong>');
		});

		it('should set inline styles', () => {
			const el = createElement({
				style: {
					backgroundColor: 'red',
					fontSize: '16px',
				},
			});
			expect(el.style.backgroundColor).toBe('red');
			expect(el.style.fontSize).toBe('16px');
		});

		it('should convert camelCase styles to kebab-case', () => {
			const el = createElement({
				style: {
					marginTop: '10px',
				},
			});
			expect(el.style.marginTop).toBe('10px');
		});

		it('should set data attributes', () => {
			const el = createElement({
				dataset: {
					testAttr: 'value',
					anotherAttr: 'another',
				},
			});
			expect(el.dataset.testAttr).toBe('value');
			expect(el.dataset.anotherAttr).toBe('another');
		});

		it('should append child elements', () => {
			const child1 = document.createElement('span');
			child1.textContent = 'Child 1';
			const child2 = document.createElement('span');
			child2.textContent = 'Child 2';

			const el = createElement({ children: [child1, child2] });

			expect(el.children.length).toBe(2);
			expect(el.children[0]).toBe(child1);
			expect(el.children[1]).toBe(child2);
		});

		it('should handle string children as text nodes', () => {
			const el = createElement({ children: ['Hello', ' ', 'World'] });
			expect(el.textContent).toBe('Hello World');
		});

		it('should skip null and undefined children', () => {
			const child = document.createElement('span');
			const el = createElement({ children: [null, child, undefined] });
			expect(el.children.length).toBe(1);
		});

		it('should set aria-label', () => {
			const el = createElement({ ariaLabel: 'Close dialog' });
			expect(el.getAttribute('aria-label')).toBe('Close dialog');
		});

		it('should set aria-expanded', () => {
			const el = createElement({ ariaExpanded: 'true' });
			expect(el.getAttribute('aria-expanded')).toBe('true');
		});

		it('should set aria-hidden', () => {
			const el = createElement({ ariaHidden: 'true' });
			expect(el.getAttribute('aria-hidden')).toBe('true');
		});

		it('should set aria-selected', () => {
			const el = createElement({ ariaSelected: 'true' });
			expect(el.getAttribute('aria-selected')).toBe('true');
		});

		it('should set aria-controls', () => {
			const el = createElement({ ariaControls: 'panel-1' });
			expect(el.getAttribute('aria-controls')).toBe('panel-1');
		});

		it('should set aria-checked', () => {
			const el = createElement({ ariaChecked: 'true' });
			expect(el.getAttribute('aria-checked')).toBe('true');
		});

		it('should set role attribute', () => {
			const el = createElement({ role: 'button' });
			expect(el.getAttribute('role')).toBe('button');
		});

		it('should set tabIndex', () => {
			const el = createElement({ tabIndex: 0 });
			expect(el.getAttribute('tabindex')).toBe('0');
		});

		it('should set title attribute', () => {
			const el = createElement({ title: 'Tooltip text' });
			expect(el.title).toBe('Tooltip text');
		});

		it('should set boolean attributes when true', () => {
			const el = createElement({ disabled: true });
			expect(el.hasAttribute('disabled')).toBe(true);
		});

		it('should not set boolean attributes when false', () => {
			const el = createElement({ disabled: false });
			expect(el.hasAttribute('disabled')).toBe(false);
		});

		it('should add click event listener', () => {
			const onClick = vi.fn();
			const el = createElement({ onClick });

			el.click();

			expect(onClick).toHaveBeenCalled();
		});

		it('should add mouseenter event listener', () => {
			const onMouseEnter = vi.fn();
			const el = createElement({ onMouseEnter });

			el.dispatchEvent(new MouseEvent('mouseenter'));

			expect(onMouseEnter).toHaveBeenCalled();
		});

		it('should add mouseleave event listener', () => {
			const onMouseLeave = vi.fn();
			const el = createElement({ onMouseLeave });

			el.dispatchEvent(new MouseEvent('mouseleave'));

			expect(onMouseLeave).toHaveBeenCalled();
		});

		it('should add keydown event listener', () => {
			const onKeyDown = vi.fn();
			const el = createElement({ onKeyDown });

			el.dispatchEvent(new KeyboardEvent('keydown'));

			expect(onKeyDown).toHaveBeenCalled();
		});

		it('should add keyup event listener', () => {
			const onKeyUp = vi.fn();
			const el = createElement({ onKeyUp });

			el.dispatchEvent(new KeyboardEvent('keyup'));

			expect(onKeyUp).toHaveBeenCalled();
		});

		it('should add focus event listener', () => {
			const onFocus = vi.fn();
			const el = createElement({ onFocus });

			el.dispatchEvent(new FocusEvent('focus'));

			expect(onFocus).toHaveBeenCalled();
		});

		it('should add blur event listener', () => {
			const onBlur = vi.fn();
			const el = createElement({ onBlur });

			el.dispatchEvent(new FocusEvent('blur'));

			expect(onBlur).toHaveBeenCalled();
		});

		it('should add change event listener', () => {
			const onChange = vi.fn();
			const el = createElement({ tag: 'input', onChange });

			el.dispatchEvent(new Event('change'));

			expect(onChange).toHaveBeenCalled();
		});

		it('should add input event listener', () => {
			const onInput = vi.fn();
			const el = createElement({ tag: 'input', onInput });

			el.dispatchEvent(new Event('input'));

			expect(onInput).toHaveBeenCalled();
		});

		it('should add animationend event listener', () => {
			const onAnimationEnd = vi.fn();
			const el = createElement({ onAnimationEnd });

			// AnimationEvent not available in jsdom, use Event
			el.dispatchEvent(new Event('animationend'));

			expect(onAnimationEnd).toHaveBeenCalled();
		});

		it('should add transitionend event listener', () => {
			const onTransitionEnd = vi.fn();
			const el = createElement({ onTransitionEnd });

			// TransitionEvent not available in jsdom, use Event
			el.dispatchEvent(new Event('transitionend'));

			expect(onTransitionEnd).toHaveBeenCalled();
		});
	});

	describe('div', () => {
		it('should create a div element', () => {
			const el = div();
			expect(el.tagName).toBe('DIV');
		});

		it('should pass options to createElement', () => {
			const el = div({ className: 'container', text: 'Content' });
			expect(el.className).toBe('container');
			expect(el.textContent).toBe('Content');
		});
	});

	describe('button', () => {
		it('should create a button element', () => {
			const el = button();
			expect(el.tagName).toBe('BUTTON');
		});

		it('should set type="button" by default', () => {
			const el = button();
			expect(el.type).toBe('button');
		});

		it('should allow overriding button type', () => {
			const el = button({ type: 'submit' });
			expect(el.type).toBe('submit');
		});
	});

	describe('span', () => {
		it('should create a span element', () => {
			const el = span();
			expect(el.tagName).toBe('SPAN');
		});

		it('should pass options to createElement', () => {
			const el = span({ text: 'Inline text' });
			expect(el.textContent).toBe('Inline text');
		});
	});

	describe('label', () => {
		it('should create a label element', () => {
			const el = label();
			expect(el.tagName).toBe('LABEL');
		});

		it('should set htmlFor attribute', () => {
			const el = label({ htmlFor: 'input-id' });
			expect(el.getAttribute('htmlfor')).toBe('input-id');
		});
	});

	describe('input', () => {
		it('should create an input element', () => {
			const el = input();
			expect(el.tagName).toBe('INPUT');
		});

		it('should set input type', () => {
			const el = input({ type: 'text' });
			expect(el.type).toBe('text');
		});

		it('should set placeholder', () => {
			const el = input({ placeholder: 'Enter value' });
			expect(el.placeholder).toBe('Enter value');
		});

		it('should set value', () => {
			const el = input({ value: 'initial' });
			expect(el.getAttribute('value')).toBe('initial');
		});
	});

	describe('select', () => {
		it('should create a select element', () => {
			const el = select();
			expect(el.tagName).toBe('SELECT');
		});

		it('should create options from options array', () => {
			const el = select({
				options: [
					{ value: 'a', label: 'Option A' },
					{ value: 'b', label: 'Option B' },
					{ value: 'c', label: 'Option C' },
				],
			});

			expect(el.options.length).toBe(3);
			expect(el.options[0]?.value).toBe('a');
			expect(el.options[0]?.textContent).toBe('Option A');
			expect(el.options[1]?.value).toBe('b');
			expect(el.options[2]?.value).toBe('c');
		});

		it('should select the option matching selectedValue', () => {
			const el = select({
				options: [
					{ value: 'a', label: 'Option A' },
					{ value: 'b', label: 'Option B' },
				],
				selectedValue: 'b',
			});

			expect(el.value).toBe('b');
			expect(el.options[1]?.selected).toBe(true);
		});

		it('should work without options', () => {
			const el = select({ className: 'my-select' });
			expect(el.options.length).toBe(0);
			expect(el.className).toBe('my-select');
		});
	});

	describe('createSvgElement', () => {
		const testSvg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';

		it('should create an SVG element from string', () => {
			const svg = createSvgElement(testSvg);
			expect(svg.tagName).toBe('svg');
		});

		it('should set aria-hidden by default', () => {
			const svg = createSvgElement(testSvg);
			expect(svg.getAttribute('aria-hidden')).toBe('true');
		});

		it('should not set aria-hidden when disabled', () => {
			const svg = createSvgElement(testSvg, { ariaHidden: false });
			expect(svg.getAttribute('aria-hidden')).toBeNull();
		});

		it('should set default width and height', () => {
			const svg = createSvgElement(testSvg);
			expect(svg.getAttribute('width')).toBe('24');
			expect(svg.getAttribute('height')).toBe('24');
		});

		it('should allow custom width and height', () => {
			const svg = createSvgElement(testSvg, { width: 16, height: 16 });
			expect(svg.getAttribute('width')).toBe('16');
			expect(svg.getAttribute('height')).toBe('16');
		});

		it('should set className', () => {
			const svg = createSvgElement(testSvg, { className: 'icon' });
			expect(svg.getAttribute('class')).toBe('icon');
		});
	});

	describe('clearElement', () => {
		it('should remove all children from element', () => {
			const parent = document.createElement('div');
			parent.appendChild(document.createElement('span'));
			parent.appendChild(document.createElement('span'));
			parent.appendChild(document.createElement('span'));

			expect(parent.children.length).toBe(3);

			clearElement(parent);

			expect(parent.children.length).toBe(0);
		});

		it('should handle empty element', () => {
			const parent = document.createElement('div');
			expect(() => clearElement(parent)).not.toThrow();
			expect(parent.children.length).toBe(0);
		});
	});

	describe('replaceChildren', () => {
		it('should replace all children with new elements', () => {
			const parent = document.createElement('div');
			parent.appendChild(document.createElement('span'));

			const newChild = document.createElement('p');
			replaceChildren(parent, [newChild]);

			expect(parent.children.length).toBe(1);
			expect(parent.children[0]).toBe(newChild);
		});

		it('should handle string children', () => {
			const parent = document.createElement('div');
			replaceChildren(parent, ['Hello', ' World']);

			expect(parent.textContent).toBe('Hello World');
		});

		it('should skip null and undefined', () => {
			const parent = document.createElement('div');
			const child = document.createElement('span');
			replaceChildren(parent, [null, child, undefined, 'text']);

			expect(parent.childNodes.length).toBe(2);
		});
	});

	describe('toggleClass', () => {
		it('should add class when condition is true', () => {
			const el = document.createElement('div');
			toggleClass(el, 'active', true);

			expect(el.classList.contains('active')).toBe(true);
		});

		it('should remove class when condition is false', () => {
			const el = document.createElement('div');
			el.classList.add('active');

			toggleClass(el, 'active', false);

			expect(el.classList.contains('active')).toBe(false);
		});
	});

	describe('setClasses', () => {
		it('should set multiple classes based on conditions', () => {
			const el = document.createElement('div');

			setClasses(el, {
				active: true,
				disabled: false,
				visible: true,
			});

			expect(el.classList.contains('active')).toBe(true);
			expect(el.classList.contains('disabled')).toBe(false);
			expect(el.classList.contains('visible')).toBe(true);
		});

		it('should remove previously set classes', () => {
			const el = document.createElement('div');
			el.classList.add('disabled');

			setClasses(el, {
				disabled: false,
			});

			expect(el.classList.contains('disabled')).toBe(false);
		});
	});

	describe('createPortal', () => {
		it('should append element to document.body', () => {
			const el = document.createElement('div');
			el.id = 'portal-test';

			createPortal(el);

			expect(document.body.querySelector('#portal-test')).toBe(el);
		});

		it('should return a cleanup function', () => {
			const el = document.createElement('div');
			el.id = 'portal-cleanup-test';

			const cleanup = createPortal(el);

			expect(document.body.querySelector('#portal-cleanup-test')).toBe(el);

			cleanup();

			expect(document.body.querySelector('#portal-cleanup-test')).toBeNull();
		});

		it('should handle cleanup when element already removed', () => {
			const el = document.createElement('div');
			const cleanup = createPortal(el);

			// Remove manually
			el.remove();

			// Should not throw
			expect(() => cleanup()).not.toThrow();
		});
	});
});
