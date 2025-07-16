import { Box, CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import type React from 'react';
import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

type CalloutProps = Omit<
	HTMLAttributes<HTMLDivElement>,
	'title' | 'type' | 'icon'
> & {
	title?: React.ReactNode;
	/**
	 * @defaultValue info
	 */
	type?: 'info' | 'warn' | 'error' | 'success' | 'warning' | 'note';

	/**
	 * Force an icon
	 */
	icon?: React.ReactNode;
};

const getColorClasses = (type: string) => {
	switch (type) {
		case 'warning':
			return {
				bg: 'bg-orange-50/50 dark:bg-orange-600/5',
				outline: 'outline-orange-100 dark:outline-orange-500/10',
				iconColor: 'text-orange-500 dark:text-orange-300',
				titleColor: 'text-orange-500 dark:text-orange-300',
			};
		case 'error':
			return {
				bg: 'bg-rose-50/50 dark:bg-rose-600/5',
				outline: 'outline-rose-100 dark:outline-rose-500/10',
				iconColor: 'text-rose-500 dark:text-rose-300',
				titleColor: 'text-rose-500 dark:text-rose-300',
			};
		case 'success':
			return {
				bg: 'bg-emerald-50/50 dark:bg-emerald-600/5',
				outline: 'outline-emerald-100 dark:outline-emerald-500/15',
				iconColor: 'text-emerald-500 dark:text-emerald-300',
				titleColor: 'text-emerald-500 dark:text-emerald-300',
			};
		case 'note':
			return {
				bg: 'bg-base-50/50 dark:bg-base-600/5',
				outline: 'outline-base-100 dark:outline-base-500/15',
				iconColor: 'text-base-500 dark:text-base-300',
				titleColor: 'text-base-500 dark:text-base-300',
			};
		default:
			return {
				bg: 'bg-cyan-50/50 dark:bg-cyan-600/5',
				outline: 'outline-cyan-100 dark:outline-cyan-500/15',
				iconColor: 'text-cyan-500 dark:text-cyan-300',
				titleColor: 'text-cyan-500 dark:text-cyan-300',
			};
	}
};

export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
	({ className, children, title, type = 'info', icon, ...props }, ref) => {
		let normalizedType = type;
		if (type === 'warn') {
			normalizedType = 'warning';
		}
		if ((type as unknown) === 'tip') {
			normalizedType = 'info';
		}

		const colors = getColorClasses(normalizedType);

		const getDefaultIcon = () => {
			switch (normalizedType) {
				case 'warning':
					return (
						<TriangleAlert
							className={`size-4 ${colors.iconColor}`}
							aria-hidden="true"
						/>
					);
				case 'error':
					return (
						<CircleX
							className={`size-4 ${colors.iconColor}`}
							aria-hidden="true"
						/>
					);
				case 'success':
					return (
						<CircleCheck
							className={`size-4 ${colors.iconColor}`}
							aria-hidden="true"
						/>
					);
				case 'note':
					return (
						<Box className={`size-4 ${colors.iconColor}`} aria-hidden="true" />
					);
				default:
					return (
						<Info className={`size-4 ${colors.iconColor}`} aria-hidden="true" />
					);
			}
		};

		const getDefaultTitle = () => {
			switch (normalizedType) {
				case 'warning':
					return 'Caution';
				case 'error':
					return 'Error';
				case 'success':
					return 'Success';
				case 'note':
					return 'Note';
				default:
					return 'Info';
			}
		};

		return (
			<div className="not-prose flex flex-col gap-2">
				<div
					ref={ref}
					className={cn(
						'relative rounded-xl p-4 outline',
						colors.bg,
						colors.outline,
						className
					)}
					role="alert"
					aria-live={normalizedType === 'error' ? 'assertive' : 'polite'}
					{...props}
				>
					<div className="flex items-start">
						<div className="shrink-0">{icon || getDefaultIcon()}</div>
						<div className="ml-3">
							<h3
								className={cn(
									'-mt-1 font-medium text-base leading-6',
									colors.titleColor
								)}
							>
								{title || getDefaultTitle()}
							</h3>
							<div className="mt-2 text-base-600 text-sm leading-5 dark:text-base-400">
								{children}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
);

Callout.displayName = 'Callout';
