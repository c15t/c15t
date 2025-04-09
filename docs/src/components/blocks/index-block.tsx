import { Card, Cards } from '../card';
import { JSIcon, NextIcon, ReactIcon } from '../icons';

// const mainFeatures = [
// 	{
// 		href: '/get-started',
// 		title: 'Get Started',
// 		icon: (
// 			<svg
// 				xmlns="http://www.w3.org/2000/svg"
// 				width="16"
// 				height="16"
// 				viewBox="0 0 24 24"
// 				fill="none"
// 				stroke="currentColor"
// 				strokeWidth="2"
// 				strokeLinecap="round"
// 				strokeLinejoin="round"
// 			>
// 				<polygon points="6 3 20 12 6 21 6 3" />
// 			</svg>
// 		),
// 		description: 'Get started with our end-to-end tutorials and quickstart guides.',
// 	},
// 	{
// 		href: '/api',
// 		title: 'API Reference',
// 		icon: (
// 			<svg
// 				width="16"
// 				height="16"
// 				viewBox="0 0 18 18"
// 				fill="none"
// 				xmlns="http://www.w3.org/2000/svg"
// 			>
// 				<circle
// 					cx="9"
// 					cy="4"
// 					r="2.3"
// 					stroke="currentColor"
// 					strokeWidth="1.1"
// 				/>
// 				<circle
// 					cx="14.5"
// 					cy="14"
// 					r="2.3"
// 					stroke="currentColor"
// 					strokeWidth="1.1"
// 				/>
// 				<circle
// 					cx="3.5"
// 					cy="14"
// 					r="2.3"
// 					stroke="currentColor"
// 					strokeWidth="1.1"
// 				/>
// 				<path
// 					d="M9 7.5V10M9 10L7 12M9 10L11 12"
// 					stroke="currentColor"
// 					strokeWidth="1.1"
// 				/>
// 			</svg>
// 		),
// 		description: 'Explore API endpoints for interacting with your application.',
// 	},
// ];

const frameworkCards = [
	{
		href: '/nextjs/installation',
		title: 'Next.js',
		icon: <NextIcon />,
		description:
			'Easily add secure, beautiful, and fast Consent Manager to Next.js with C15T.',
	},
	{
		href: '/react/installation',
		title: 'React',
		icon: <ReactIcon />,
		description:
			'Get started installing and initializing C15T in a new React + Vite app.',
	},
	{
		href: '/javascript/installation',
		title: 'Javascript',
		icon: <JSIcon />,
		description:
			'The C15T JavaScript SDK gives you access to core functionality for managing consent.',
	},
];

const footerItems = [
	{
		title: 'Questions?',
		description: (
			<>
				Get help in the <span className="font-bold">#community</span> channel on{' '}
				<a
					className="underline hover:text-primary"
					href="https://discord.gg/example"
				>
					Discord
				</a>
				.
			</>
		),
		icon: (
			<svg
				className="h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				width="21"
				height="21"
				viewBox="0 0 21 21"
				fill="none"
			>
				<title>Question mark icon</title>
				<path
					d="M10.5 2.2c-1.6 0-3.2 0.48-4.5 1.37-1.3 0.9-2.4 2.16-3 3.65-0.6 1.48-0.77 3.12-0.46 4.7 0.31 1.57 1.09 3.02 2.22 4.16 1.14 1.14 2.58 1.91 4.16 2.22 1.57 0.31 3.22 0.15 4.7-0.46 1.48-0.61 2.74-1.65 3.64-2.99 0.9-1.34 1.37-2.91 1.37-4.52 0-2.15-0.85-4.22-2.38-5.74-1.52-1.52-3.6-2.38-5.75-2.38ZM10.5 15.33c-0.19 0-0.37-0.05-0.52-0.15-0.15-0.1-0.27-0.25-0.34-0.42-0.07-0.17-0.09-0.36-0.05-0.54 0.04-0.18 0.13-0.35 0.26-0.48 0.13-0.13 0.3-0.22 0.48-0.26 0.18-0.04 0.37-0.02 0.54 0.05 0.17 0.07 0.32 0.19 0.42 0.34 0.1 0.16 0.16 0.34 0.16 0.52 0 0.25-0.1 0.49-0.27 0.66-0.18 0.18-0.41 0.28-0.66 0.28ZM11.16 11.53v0.05c0 0.17-0.07 0.33-0.18 0.44-0.12 0.12-0.28 0.18-0.44 0.18-0.17 0-0.33-0.07-0.44-0.18-0.12-0.12-0.18-0.28-0.18-0.44v-0.63c0-0.17 0.07-0.33 0.18-0.44 0.12-0.12 0.28-0.18 0.44-0.18 1.03 0 1.87-0.7 1.87-1.56s-0.84-1.56-1.87-1.56c-1.03 0-1.87 0.7-1.87 1.56v0.3c0 0.17-0.07 0.33-0.18 0.44-0.12 0.12-0.28 0.18-0.44 0.18s-0.33-0.07-0.44-0.18c-0.12-0.12-0.18-0.28-0.18-0.44v-0.3c0-1.55 1.4-2.81 3.12-2.81s3.12 1.26 3.12 2.81c0 1.36-1.07 2.5-2.5 2.76Z"
					fill="currentColor"
				/>
			</svg>
		),
	},
	// {
	// 	title: 'Stay updated',
	// 	description: (
	// 		<>
	// 			Sign up to our{' '}
	// 			<a className="underline hover:text-primary" href="/newsletter">
	// 				Newsletter
	// 			</a>{' '}
	// 			and read our{' '}
	// 			<a className="underline hover:text-primary" href="/blog">
	// 				Blog
	// 			</a>
	// 			.
	// 		</>
	// 	),
	// 	icon: (
	// 		<svg
	// 			className="h-5 w-5"
	// 			xmlns="http://www.w3.org/2000/svg"
	// 			width="21"
	// 			height="21"
	// 			viewBox="0 0 21 21"
	// 			fill="none"
	// 		>
	// 			<title>Newsletter icon</title>
	// 			<path
	// 				d="M17.41 4.08H4.91c-0.33 0-0.65 0.13-0.88 0.37-0.24 0.23-0.37 0.55-0.37 0.88v9.38c0 0.17-0.07 0.32-0.18 0.44-0.12 0.12-0.28 0.18-0.44 0.18-0.17 0-0.33-0.07-0.44-0.18-0.12-0.12-0.18-0.28-0.18-0.44V7.2c0-0.17-0.07-0.32-0.18-0.44-0.12-0.12-0.28-0.18-0.44-0.18-0.17 0-0.33 0.07-0.44 0.18-0.12 0.12-0.18 0.28-0.18 0.44v7.51c0 0.5 0.2 0.97 0.55 1.32 0.35 0.35 0.83 0.55 1.32 0.55h13.75c0.5 0 0.97-0.2 1.33-0.55 0.35-0.35 0.55-0.83 0.55-1.32V5.33c0-0.33-0.13-0.65-0.37-0.88-0.23-0.24-0.55-0.37-0.88-0.37ZM14.29 12.21H8.04c-0.17 0-0.32-0.07-0.44-0.18-0.12-0.12-0.19-0.28-0.19-0.44 0-0.17 0.07-0.32 0.19-0.44 0.12-0.12 0.28-0.19 0.44-0.19h6.25c0.17 0 0.32 0.07 0.44 0.19 0.12 0.12 0.19 0.28 0.19 0.44 0 0.17-0.07 0.32-0.19 0.44-0.12 0.12-0.28 0.18-0.44 0.18ZM14.29 9.71H8.04c-0.17 0-0.32-0.07-0.44-0.18-0.12-0.12-0.19-0.28-0.19-0.44 0-0.17 0.07-0.32 0.19-0.44 0.12-0.12 0.28-0.19 0.44-0.19h6.25c0.17 0 0.32 0.07 0.44 0.19 0.12 0.12 0.19 0.28 0.19 0.44 0 0.17-0.07 0.32-0.19 0.44-0.12 0.12-0.28 0.18-0.44 0.18Z"
	// 				fill="currentColor"
	// 			/>
	// 		</svg>
	// 	),
	// },
	// {
	// 	title: "Something's not right?",
	// 	description: (
	// 		<>
	// 			Check{' '}
	// 			<a className="underline hover:text-primary" href="/status">
	// 				System Status
	// 			</a>
	// 			.
	// 		</>
	// 	),
	// 	icon: (
	// 		<svg
	// 			className="h-5 w-5"
	// 			xmlns="http://www.w3.org/2000/svg"
	// 			width="21"
	// 			height="21"
	// 			viewBox="0 0 21 21"
	// 			fill="none"
	// 		>
	// 			<title>System status icon</title>
	// 			<path
	// 				d="M17.41 3.46H3.66c-0.33 0-0.65 0.13-0.88 0.37-0.24 0.23-0.37 0.55-0.37 0.88v11.25c0 0.33 0.13 0.65 0.37 0.88 0.23 0.24 0.55 0.37 0.88 0.37h13.75c0.33 0 0.65-0.13 0.88-0.37 0.24-0.23 0.37-0.55 0.37-0.88V4.71c0-0.33-0.13-0.65-0.37-0.88-0.23-0.24-0.55-0.37-0.88-0.37ZM16.79 10.96h-1.51l-2.32 4.06c-0.05 0.1-0.13 0.17-0.23 0.23-0.1 0.05-0.2 0.08-0.31 0.08h-0.04c-0.12-0.01-0.23-0.05-0.32-0.11-0.1-0.07-0.17-0.16-0.22-0.27l-3.26-7.6-1.87 3.29c-0.06 0.1-0.13 0.18-0.23 0.23-0.1 0.05-0.21 0.08-0.32 0.08H4.29c-0.17 0-0.32-0.07-0.44-0.18-0.12-0.12-0.18-0.28-0.18-0.44 0-0.17 0.07-0.32 0.18-0.44 0.12-0.12 0.28-0.18 0.44-0.18h1.51l2.32-4.06c0.06-0.1 0.14-0.18 0.24-0.24 0.1-0.06 0.22-0.08 0.33-0.08 0.12 0.01 0.23 0.05 0.32 0.11 0.1 0.07 0.17 0.16 0.21 0.27l3.25 7.6 1.88-3.29c0.05-0.1 0.13-0.17 0.23-0.23 0.1-0.05 0.2-0.08 0.31-0.08h1.88c0.17 0 0.32 0.07 0.44 0.18 0.12 0.12 0.18 0.28 0.18 0.44 0 0.17-0.07 0.32-0.18 0.44-0.12 0.12-0.28 0.18-0.44 0.18Z"
	// 				fill="currentColor"
	// 			/>
	// 		</svg>
	// 	),
	// },
];

export const IndexBlock = () => {
	return (
		<>
			<div className="flex flex-col space-y-10 pt-0">
				{/* Main feature cards */}
				{/* <Cards>
					{mainFeatures.map((card, index) => (
						<Card key={index} href={card.href} title={card.title} icon={card.icon}>
							{card.description}
						</Card>
					))}
				</Cards> */}

				<div className="flex flex-col">
					<h4
						id="explore-by-category"
						className="scroll-m-20 text-muted-foreground text-sm uppercase"
					>
						Explore by Framework
					</h4>
					<hr className="mt-0 mb-6 border-border/50 border-t" />

					<Cards>
						{frameworkCards.map((card, index) => (
							<Card
								key={index}
								href={card.href}
								title={card.title}
								icon={card.icon}
							>
								{card.description}
							</Card>
						))}
					</Cards>
				</div>
			</div>
		</>
	);
};
