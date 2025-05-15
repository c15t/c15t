import type { CardProps } from '~/components/card';

export const examples: CardProps[] = [
	{
		title: 'Next.js',
		description:
			'A simple example of how to use @c15t/nextjs in a Next.js application.',
		href: 'https://github.com/c15t/c15t/tree/main/docs/examples/nextjs',
		external: true,
		image: '/examples/nextjs.png',
	},
	{
		title: 'Vite',
		description:
			'Using the @c15t/react package in a React application with Vite.',
		href: 'https://github.com/c15t/c15t/tree/main/docs/examples/astro-react',
		external: true,
		image: '/examples/vite.png',
	},
	{
		title: 'Svelte',
		description:
			"How to use c15t's core package in a Svelte application or any other non-React framework.",
		href: 'https://github.com/c15t/c15t/tree/main/docs/examples/svelte',
		external: true,
		image: '/examples/svelte.png',
	},
	{
		title: 'Self-Hosted Backend on Cloudflare',
		description:
			'Using the @c15t/backend package to host your own backend on Cloudflare.',
		href: 'https://github.com/c15t/c15t/tree/main/docs/examples/cloudflare-backend',
		external: true,
		image: '/examples/cloudflare.png',
	},
];
