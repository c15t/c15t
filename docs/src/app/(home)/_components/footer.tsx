import Link from 'next/link';

import { C15TLogo } from '~/components/logo';
import { siteConfig } from '../config';

export function Footer() {
	return (
		<div className="border-white/20 border-t bg-gradient-to-b from-transparent to-fd-background/50">
			<footer className="container relative mx-auto grid grid-cols-2 gap-8 overflow-hidden pt-8 sm:grid-cols-3 sm:pt-12 md:pt-16 lg:gap-16 lg:pt-24 xl:grid-cols-5 xl:pt-32">
				{/* Logo and Description Column */}
				<div className="col-span-2 flex flex-col items-center sm:col-span-3 sm:items-start xl:col-span-2">
					<C15TLogo className='h-10 w-auto' />
					<div className="mt-8 font-normal text-sm leading-6 dark:text-white/60">
						{siteConfig.footer.bottomText}
					</div>
				</div>

				{/* Links Columns */}
				{siteConfig.footer.links.map((section) => (
					<div
						key={section.title}
						className="col-span-1 flex flex-col gap-8 text-left"
					>
						<span className="w-full font-display font-medium text-sm tracking-wider dark:text-white">
							{section.title}
						</span>
						<ul className="flex flex-col gap-4 md:gap-6">
							{section.items.map((link) => (
								<li key={link.text}>
									<Link
										href={link.url}
										className="font-normal text-sm transition dark:text-white/70 hover:dark:text-white/40"
									>
										{link.text}
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</footer>

			{/* BorderText Component */}
			<div className="container mt-4 h-[135px] overflow-hidden">
				<div className="flex w-full justify-center">
					<div className="bg-gradient-to-tr from-black/40 to-black/10 bg-clip-text font-bold text-[125px] text-transparent tracking-tighter dark:from-white/40 dark:to-white/10">
						c15t.com
					</div>
				</div>
			</div>
		</div>
	);
}
