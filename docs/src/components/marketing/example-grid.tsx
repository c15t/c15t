'use client';

import { type FC, useState } from 'react';

interface FeatureOption {
	id: number;
	title: string;
	description: string;
	code: string;
}

interface FeatureSelectorProps {
	features: FeatureOption[];
}

export const ExampleGrid: FC<FeatureSelectorProps> = ({ features }) => {
	const [selectedIndex, setSelectedIndex] = useState<number>(0);

	return (
		<div className="relative grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-0">
			<div className="sticky top-[var(--header-height)] z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:col-span-2 md:h-[calc(100vh-var(--header-height))] md:border-r md:border-b-0 dark:border-neutral-800">
				<div className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto md:block md:h-full md:snap-none md:overflow-y-auto">
					<div className="flex min-w-full flex-none gap-2 p-4 md:flex-col">
						{features.map((option, index) => (
							<button
								type="button"
								key={option.id}
								onClick={() => setSelectedIndex(index)}
								className={`flex-none snap-center rounded-lg border px-4 py-3 text-left transition-colors md:w-full dark:border-neutral-800 ${
									selectedIndex === index
										? 'border-accent-foreground/20 bg-accent/70'
										: 'hover:bg-muted/50'
								}`}
							>
								<h3 className="font-medium tracking-tight">{option.title}</h3>
								<p className="mt-1 text-muted-foreground text-sm">
									{option.description}
								</p>
							</button>
						))}
					</div>
				</div>
			</div>
			<div className="relative col-span-1 min-h-[400px] md:col-span-3 md:h-[calc(100vh-var(--header-height))] md:overflow-y-auto">
				<div className="p-4">{features[selectedIndex]?.code}</div>
			</div>
		</div>
	);
};
