'use client';

import { buttonVariants } from '~/components/docs/button';

import Link from 'next/link';
import { useRef } from 'react';
import { cn } from '~/lib/cn';

import { ArrowRight } from 'lucide-react';
import { ConsentManagementIcon } from '~/components/icons/logo';
import { AuroraText } from '../../../components/marketing/aurora-text';
import { BorderIcon } from '../../../components/marketing/border-icon';
import { GoogleGeminiEffect } from '../../../components/marketing/gemini';
import { Section } from '../../../components/marketing/section';
import { siteConfig } from '../config';

export function Hero() {
	const ref = useRef(null);

	const pathAnimations = [
		{
			startColor: '#076EFF',
			stopColor: '#4FABFF',
			delay: 0.4,
		},
		{
			startColor: '#4FABFF',
			stopColor: '#B1C5FF',
			delay: 0.6,
		},
		{
			startColor: '#B1C5FF',
			stopColor: '#FFDDB7',
			delay: 0,
		},
		{
			startColor: '#FFDDB7',
			stopColor: '#FFB7C5',
			delay: 0.2,
		},
		{
			startColor: '#FFB7C5',
			stopColor: '#FFE7EA',
			delay: 0.3,
		},
	];

	return (
		<Section id="hero">
			<div className="relative mt-8 grid w-full gap-x-8 border">
				<div className="relative flex flex-col items-start justify-start space-y-6 px-4 pt-8 pb-6 sm:px-12">
					<h1 className="text-left font-semibold text-3xl text-foreground leading-tighter tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
						<span className="inline-block text-balance">
							<AuroraText className="leading-normal">
								{siteConfig.hero.title}
							</AuroraText>
						</span>
					</h1>
					<div className="flex w-full flex-col justify-between gap-6 sm:flex-row">
						<p className="z-20 max-w-xl text-balance text-left text-muted-foreground text-sm leading-normal sm:text-base lg:text-lg">
							{siteConfig.hero.description}
						</p>
						<div className="relative flex flex-col items-start justify-start gap-4 sm:flex-row sm:items-center sm:justify-end">
							<Link
								href={siteConfig.hero.cta.href}
								className={cn(
									buttonVariants({ variant: 'outline' }),
									'flex w-full gap-2 rounded-lg text-background sm:w-auto'
								)}
							>
								{siteConfig.hero.cta.text}
								<ArrowRight className="h-4 w-4 sm:h-6 sm:w-6" />
							</Link>
						</div>
					</div>
				</div>
				<div className="h-[250px] w-full scale-100 sm:h-[300px] md:h-[400px] md:scale-100 ">
					<div
						className="relative h-full w-full overflow-clip rounded-md"
						ref={ref}
					>
						{/* <div className="w-full absolute inset-0 bg-linear-to-r from-background via-background/0 to-background z-30" /> */}
						<div className="absolute inset-0 z-20 flex items-center justify-center">
							<div className="rounded-full border-2 border-fd-foreground/10 bg-fd-background px-2 py-2 font-bold text-fd-accent-foreground text-xs sm:block sm:px-4 sm:py-3 md:text-base">
								<ConsentManagementIcon className="h-3 w-auto sm:h-4 md:h-6" />
							</div>
						</div>
						<div className="absolute inset-0 z-10 flex items-center justify-center">
							<GoogleGeminiEffect pathAnimations={pathAnimations} />
						</div>
					</div>
				</div>

				<BorderIcon className="-top-2 sm:-top-3 -left-2 sm:-left-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
				<BorderIcon className="-bottom-2 sm:-bottom-3 -left-2 sm:-left-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
				<BorderIcon className="-top-2 sm:-top-3 -right-2 sm:-right-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
				<BorderIcon className="-bottom-2 sm:-bottom-3 -right-2 sm:-right-3 absolute h-4 w-4 text-black sm:h-6 sm:w-6 dark:text-white" />
			</div>
		</Section>
	);
}
