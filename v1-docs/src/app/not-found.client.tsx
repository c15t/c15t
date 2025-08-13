'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Particles } from '~/components/docs/particles';

export default function NotFoundClient() {
	const { theme } = useTheme();
	const [color, setColor] = useState('#ffffff');

	useEffect(() => {
		setColor(theme === 'dark' ? '#ffffff' : '#000000');
	}, [theme]);

	return (
		<>
			<div className="relative top-[calc(var(--fd-banner-height)+var(--fd-nav-height))] flex w-full flex-1 flex-grow">
				{/* <Header /> */}
				<div className="relative z-10 flex flex-1 flex-grow flex-col space-y-4">
					<div className="mt-64 flex flex-col items-center justify-center space-y-4">
						<span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center font-semibold text-8xl text-transparent leading-none dark:from-white dark:to-slate-900/10">
							404
						</span>
						<p className="text-center font-semibold text-2xl">Page not found</p>
					</div>
					<Particles
						className="absolute inset-0"
						quantity={100}
						ease={80}
						color={color}
						refresh
					/>
				</div>
			</div>
		</>
	);
}
