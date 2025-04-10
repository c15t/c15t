'use client';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactElement } from 'react';
import { cn } from '../../lib/cn';
import { buttonVariants } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export type LanguageSelectProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function LanguageToggle(props: LanguageSelectProps): ReactElement {
	const context = useI18n();
	if (!context.locales) {
		throw new Error('Missing `<I18nProvider />`');
	}

	return (
		<Popover>
			<PopoverTrigger
				aria-label={context.text.chooseLanguage}
				{...props}
				className={cn(
					buttonVariants({
						color: 'ghost',
						className: 'gap-1.5 p-1.5',
					}),
					props.className
				)}
			>
				{props.children}
			</PopoverTrigger>
			<PopoverContent className="flex flex-col overflow-hidden p-0">
				<p className="mb-1 p-2 font-medium text-fd-muted-foreground text-xs">
					{context.text.chooseLanguage}
				</p>
				{context.locales.map((item) => (
					<button
						key={item.locale}
						type="button"
						className={cn(
							'p-2 text-start text-sm',
							item.locale === context.locale
								? 'bg-fd-primary/10 font-medium text-fd-primary'
								: 'hover:bg-fd-accent hover:text-fd-accent-foreground'
						)}
						onClick={() => {
							context.onChange?.(item.locale);
						}}
					>
						{item.name}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}

export function LanguageToggleText(
	props: HTMLAttributes<HTMLSpanElement>
): ReactElement {
	const context = useI18n();
	const text = context.locales?.find(
		(item) => item.locale === context.locale
	)?.name;

	return <span {...props}>{text}</span>;
}
