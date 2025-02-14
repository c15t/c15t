'use client';
import { Check, Copy } from 'lucide-react';
import {
	type ButtonHTMLAttributes,
	type HTMLAttributes,
	type ReactNode,
	forwardRef,
	useCallback,
	useRef,
} from 'react';

import { cn } from '@c15t/shadcn/libs';
import type { ScrollAreaViewportProps } from '@radix-ui/react-scroll-area';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
	ScrollArea,
	ScrollBar,
	ScrollViewport,
} from 'fumadocs-ui/components/ui/scroll-area';
import { useCopyButton } from '~/lib/use-copy-button';

export type CodeBlockProps = HTMLAttributes<HTMLElement> & {
	/**
	 * Icon of code block
	 *
	 * When passed as a string, it assumes the value is the HTML of icon
	 */
	icon?: ReactNode;

	/**
	 * Allow to copy code with copy button
	 *
	 * @defaultValue true
	 */
	allowCopy?: boolean;

	/**
	 * Keep original background color generated by Shiki or Rehype Code
	 *
	 * @defaultValue false
	 */
	keepBackground?: boolean;

	viewportProps?: ScrollAreaViewportProps;
};

export const Pre = forwardRef<HTMLPreElement, HTMLAttributes<HTMLPreElement>>(
	({ className, ...props }, ref) => {
		return (
			<pre
				ref={ref}
				className={cn('p-4 focus-visible:outline-none', className)}
				{...props}
			>
				{props.children}
			</pre>
		);
	}
);

Pre.displayName = 'Pre';

export const CodeBlock = forwardRef<HTMLElement, CodeBlockProps>(
	(
		{
			title,
			allowCopy = true,
			keepBackground = false,
			icon,
			viewportProps,
			...props
		},
		ref
	) => {
		const areaRef = useRef<HTMLDivElement>(null);
		const onCopy = useCallback(() => {
			const pre = areaRef.current?.getElementsByTagName('pre').item(0);

			if (!pre) {
				return;
			}
			const clone = pre.cloneNode(true) as HTMLElement;
			for (const node of clone.querySelectorAll('.nd-copy-ignore')) {
				node.remove();
			}

			// biome-ignore lint/complexity/noVoid: <explanation>
			void navigator.clipboard.writeText(clone.textContent ?? '');
		}, []);

		return (
			<figure
				ref={ref}
				{...props}
				className={cn(
					'not-prose group fd-codeblock relative my-6 overflow-hidden rounded-lg border bg-fd-card text-sm shadow-sm ring-1 ring-fd-primary/5',
					keepBackground &&
						'bg-[var(--shiki-light-bg)] dark:bg-[var(--shiki-dark-bg)]',
					props.className
				)}
			>
				{title ? (
					<div className="flex border-fd-primary/10 border-b bg-gradient-to-b from-fd-background/80 to-transparent px-4 py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
						{icon ? (
							<div
								className="text-fd-muted-foreground [&_svg]:size-3.5"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
								// biome-ignore lint/security/noDangerouslySetInnerHtmlWithChildren: <explanation>
								dangerouslySetInnerHTML={
									typeof icon === 'string'
										? {
												__html: icon,
											}
										: undefined
								}
							>
								{typeof icon !== 'string' ? icon : null}
							</div>
						) : null}
						<figcaption className="flex-1 truncate text-fd-muted-foreground">
							{title}
						</figcaption>
						{allowCopy ? (
							<CopyButton className="-me-2" onCopy={onCopy} />
						) : null}
					</div>
				) : (
					allowCopy && (
						<CopyButton
							className="absolute top-2 right-2 z-[2] backdrop-blur-md"
							onCopy={onCopy}
						/>
					)
				)}
				<ScrollArea ref={areaRef} dir="ltr">
					<ScrollViewport
						{...viewportProps}
						className={cn('max-h-[600px]', viewportProps?.className)}
					>
						{props.children}
					</ScrollViewport>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</figure>
		);
	}
);

CodeBlock.displayName = 'CodeBlock';

function CopyButton({
	className,
	onCopy,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	onCopy: () => void;
}) {
	const [checked, onClick] = useCopyButton(onCopy);

	return (
		<button
			type="button"
			className={cn(
				buttonVariants({
					color: 'ghost',
				}),
				'transition-opacity group-hover:opacity-100 [&_svg]:size-3.5',
				!checked && '[@media(hover:hover)]:opacity-0',
				className
			)}
			aria-label={checked ? 'Copied Text' : 'Copy Text'}
			onClick={onClick}
			{...props}
		>
			<Check className={cn('transition-transform', !checked && 'scale-0')} />
			<Copy
				className={cn('absolute transition-transform', checked && 'scale-0')}
			/>
		</button>
	);
}
