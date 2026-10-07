import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ForwardedRef } from 'react';

interface BrandButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	tone?: 'solid' | 'outline';
}

const renderBrandButton = function renderBrandButton(
	{ className, tone = 'outline', type, ...props }: BrandButtonProps,
	ref: ForwardedRef<HTMLButtonElement>
) {
	return (
		<button
			ref={ref}
			{...props}
			className={['brand-button', className].filter(Boolean).join(' ')}
			data-tone={tone}
			// Under `asChild`, c15t passes no type. Default to `button` so an
			// action never submits a surrounding form.
			type={type === 'submit' ? 'submit' : 'button'}
		/>
	);
};

/**
 * Your design system's button. To work under `asChild`, it forwards its ref
 * and passes every other prop to the `button` element, so c15t's click
 * handler, `data-action` and class names reach the DOM.
 */
export const BrandButton = forwardRef(renderBrandButton);

BrandButton.displayName = 'BrandButton';
