'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { BorderIcon } from '~/components/marketing/border-icon';
import { cn } from '~/lib/cn';

interface FeatureOption {
	id: number;
	title: string;
	description: string;
	code: ReactNode;
}

interface ExamplesClientProps {
	features: FeatureOption[];
}

export function ExamplesClient({ features }: ExamplesClientProps) {
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const [progress, setProgress] = useState(0);

	return (
		<motion.div
			className="relative grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-8"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
		>
			{/* Features Selection */}
			<motion.div className="sticky top-[var(--header-height)] z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:col-span-2">
				<div className="min-w-full space-y-8">
					{features.map((option, index) => (
						<motion.button
							key={option.id}
							onClick={() => {
								setSelectedIndex(index);
								setProgress(0);
							}}
							className={cn(
								'group relative w-full flex-none snap-center border p-4 text-left',
								selectedIndex === index ? 'bg-accent/70' : 'hover:bg-muted/50'
								// 'w-[280px] sm:w-[320px] md:w-full'
							)}
							animate={{
								opacity: index === selectedIndex ? 1 : 0.7,
								scale: index === selectedIndex ? 1.02 : 1,
							}}
							transition={{ duration: 0.5 }}
						>
							<div className="flex items-center gap-4">
								<motion.div
									className={cn(
										'flex shrink-0 items-center justify-center rounded-full border-2',
										index === selectedIndex
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-muted-foreground bg-muted',
										'size-6 sm:size-8'
									)}
								>
									<span className="font-semibold text-base sm:text-lg">
										{index + 1}
									</span>
								</motion.div>
								<div>
									<h3 className="font-medium text-sm tracking-tight sm:text-base">
										{option.title}
									</h3>
									<p className="text-muted-foreground text-xs sm:text-sm">
										{option.description}
									</p>
								</div>
							</div>
							{index === selectedIndex && (
								<motion.div
									className="absolute bottom-0 left-0 mx-4 h-1 bg-primary"
									initial={{ width: '0%' }}
									animate={{ width: `${progress}%` }}
									transition={{ duration: 0.1, ease: 'linear' }}
								/>
							)}

							<BorderIcon className="-top-2 sm:-top-3 -left-2 sm:-left-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
							<BorderIcon className="-bottom-2 sm:-bottom-3 -left-2 sm:-left-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
							<BorderIcon className="-top-2 sm:-top-3 -right-2 sm:-right-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
							<BorderIcon className="-bottom-2 sm:-bottom-3 -right-2 sm:-right-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
						</motion.button>
					))}
				</div>
			</motion.div>

			{/* Code Display */}
			<div className="relative mt-4 border sm:mt-0 md:col-span-3">
				<AnimatePresence mode="wait">
					{features.map(
						(feature, index) =>
							index === selectedIndex && (
								<motion.div
									key={feature.id}
									className="w-full overflow-hidden [&>figure]:my-0! [&>figure]:border-0! [&>figure]:bg-transparent! [&_code]:break-all"
									layout
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.3, ease: 'easeInOut' }}
								>
									{feature.code}
								</motion.div>
							)
					)}
				</AnimatePresence>
				<BorderIcon className="-top-2 sm:-top-3 -left-2 sm:-left-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
				<BorderIcon className="-bottom-2 sm:-bottom-3 -left-2 sm:-left-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
				<BorderIcon className="-top-2 sm:-top-3 -right-2 sm:-right-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
				<BorderIcon className="-bottom-2 sm:-bottom-3 -right-2 sm:-right-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
			</div>
		</motion.div>
	);
}
