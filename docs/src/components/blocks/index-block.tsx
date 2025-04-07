import { Card, Cards } from '../card';

export const IndexBlock = () => {
	return (
		<>
			<div className="flex flex-col space-y-10 pt-0">
				{/* Main feature cards */}
				<Cards>
					<Card
						href="/get-started"
						title="Get Started"
						icon={
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<polygon points="6 3 20 12 6 21 6 3"></polygon>
							</svg>
						}
					>
						Get started with our end-to-end tutorials and quickstart guides.
					</Card>

					<Card
						href="/api"
						title="API Reference"
						icon={
							<svg
								width="16"
								height="16"
								viewBox="0 0 18 18"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<circle
									cx="9"
									cy="4"
									r="2.3"
									stroke="currentColor"
									strokeWidth="1.1"
								></circle>
								<circle
									cx="14.5"
									cy="14"
									r="2.3"
									stroke="currentColor"
									strokeWidth="1.1"
								></circle>
								<circle
									cx="3.5"
									cy="14"
									r="2.3"
									stroke="currentColor"
									strokeWidth="1.1"
								></circle>
								<path
									d="M9 7.5V10M9 10L7 12M9 10L11 12"
									stroke="currentColor"
									strokeWidth="1.1"
								></path>
							</svg>
						}
					>
						Explore API endpoints for interacting with your application.
					</Card>
				</Cards>

				<div className="flex flex-col">
					<h4
						id="explore-by-category"
						className="text-muted-foreground scroll-m-20 text-sm uppercase"
					>
						Explore by category
					</h4>
					<hr className="border-t border-border/50 mt-0 mb-6" />

					<Cards>
						<Card
							href="/templates"
							title="Quickstart Templates"
							icon={
								<svg
									width="16"
									height="16"
									viewBox="0 0 25 16"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M21.7341 15.114L1.97607 15.114"
										stroke="currentColor"
										strokeWidth="1.1"
									></path>
									<path
										d="M1.04974 12.9636V7.76025H6.44958"
										stroke="currentColor"
										strokeWidth="1.1"
									></path>
									<path
										d="M4.56659 5.8419V0.88623H21.1918V5.8419"
										stroke="currentColor"
										strokeWidth="1.1"
									></path>
									<path
										d="M12.9514 12.9636V7.76025H18.0669"
										stroke="currentColor"
										strokeWidth="1.1"
									></path>
									<path
										d="M23.9503 12.9636V7.76025H19.7518"
										stroke="currentColor"
										strokeWidth="1.1"
									></path>
								</svg>
							}
						>
							Full-stack starter-kits, including front-end and back-end
							components.
						</Card>

						<Card
							href="/development"
							title="Development Tools"
							icon={
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="16 18 22 12 16 6"></polyline>
									<polyline points="8 6 2 12 8 18"></polyline>
								</svg>
							}
						>
							Kickstart your development journey with our powerful toolset.
						</Card>

						<Card
							href="/data"
							title="Data & Events"
							icon={
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
									<path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
									<path d="M3 12A9 3 0 0 0 21 12"></path>
								</svg>
							}
						>
							Create custom event streams for real-time data processing.
						</Card>

						<Card
							href="/frontend"
							title="Frontend Development"
							icon={
								<svg
									width="16"
									height="16"
									viewBox="0 0 22 18"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M1.19843 2.19873V16.0931"
										stroke="currentColor"
										strokeWidth="1.3"
									></path>
									<path
										d="M20.8015 2.19873V16.0931"
										stroke="currentColor"
										strokeWidth="1.3"
									></path>
									<path
										d="M18.7293 1.25684L3.27064 1.25684"
										stroke="currentColor"
										strokeWidth="1.3"
									></path>
									<path
										d="M18.7293 16.7432L3.27064 16.7432"
										stroke="currentColor"
										strokeWidth="1.3"
									></path>
									<circle
										cx="4.75156"
										cy="4.83826"
										r="1.04114"
										fill="currentColor"
									></circle>
									<circle
										cx="7.94226"
										cy="4.83826"
										r="1.04114"
										fill="currentColor"
									></circle>
									<circle
										cx="11.1177"
										cy="4.83826"
										r="1.04114"
										fill="currentColor"
									></circle>
								</svg>
							}
						>
							Build interactive web applications with our modern frontend
							library.
						</Card>
					</Cards>
				</div>

				<div className="flex flex-col">
					<h4
						id="explore-by-tool"
						className="text-muted-foreground scroll-m-20 text-sm uppercase"
					>
						Explore by tool
					</h4>
					<hr className="border-t border-border/50 mt-0 mb-6" />

					<Cards>
						<Card
							href="/cli"
							title="Command Line Interface"
							icon={
								<svg
									width="15"
									height="12"
									viewBox="0 0 15 12"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M9.51367 11.865L13.2384 0.835693H14.657L10.9323 11.865H9.51367Z"
										fill="currentColor"
									></path>
									<path
										d="M0.257812 11.8648L3.98254 0.835449H5.40038L1.6764 11.8648H0.257812Z"
										fill="currentColor"
									></path>
									<path
										d="M9.56251 5.76172H5.7494L5.35205 6.93744H9.16516L9.56251 5.76172Z"
										fill="currentColor"
									></path>
								</svg>
							}
						>
							Powerful CLI tools for automating your workflow.
						</Card>

						<Card
							href="/sdk"
							title="SDK"
							icon={
								<svg
									width="18"
									height="18"
									viewBox="0 0 18 18"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M13.5314 0.699463V0.699463C11.5848 0.699463 10.0068 2.27749 10.0068 4.22408V13.7909C10.0068 15.7375 11.5848 17.3155 13.5314 17.3155V17.3155"
										stroke="currentColor"
										strokeWidth="1.2"
									></path>
									<path
										d="M9.14333 0.699463V0.699463C7.19674 0.699463 5.61871 2.27749 5.61871 4.22408V13.7909C5.61871 15.7375 7.19674 17.3155 9.14333 17.3155V17.3155"
										stroke="currentColor"
										strokeWidth="1.2"
									></path>
									<path
										d="M4.75546 0.699463V0.699463C2.80886 0.699463 1.23083 2.27749 1.23083 4.22408V13.7909C1.23083 15.7375 2.80886 17.3155 4.75546 17.3155V17.3155"
										stroke="currentColor"
										strokeWidth="1.2"
									></path>
									<circle
										cx="14.8269"
										cy="9.11588"
										r="1.94229"
										stroke="currentColor"
										strokeWidth="1.2"
									></circle>
								</svg>
							}
						>
							Software Development Kit for building applications.
						</Card>
					</Cards>
				</div>

				<div className="footer relative mt-24 mb-8 bg-fd-card rounded-lg p-8 not-prose text-card-foreground transition-colors">
					<div className="flex flex-col space-y-3">
						{[
							{
								title: 'Questions?',
								description: (
									<>
										Get help in the{' '}
										<span className="font-bold">#community</span> channel on{' '}
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
										className="w-5 h-5"
										xmlns="http://www.w3.org/2000/svg"
										width="21"
										height="21"
										viewBox="0 0 21 21"
										fill="none"
									>
										<path
											d="M10.5 2.2c-1.6 0-3.2 0.48-4.5 1.37-1.3 0.9-2.4 2.16-3 3.65-0.6 1.48-0.77 3.12-0.46 4.7 0.31 1.57 1.09 3.02 2.22 4.16 1.14 1.14 2.58 1.91 4.16 2.22 1.57 0.31 3.22 0.15 4.7-0.46 1.48-0.61 2.74-1.65 3.64-2.99 0.9-1.34 1.37-2.91 1.37-4.52 0-2.15-0.85-4.22-2.38-5.74-1.52-1.52-3.6-2.38-5.75-2.38ZM10.5 15.33c-0.19 0-0.37-0.05-0.52-0.15-0.15-0.1-0.27-0.25-0.34-0.42-0.07-0.17-0.09-0.36-0.05-0.54 0.04-0.18 0.13-0.35 0.26-0.48 0.13-0.13 0.3-0.22 0.48-0.26 0.18-0.04 0.37-0.02 0.54 0.05 0.17 0.07 0.32 0.19 0.42 0.34 0.1 0.16 0.16 0.34 0.16 0.52 0 0.25-0.1 0.49-0.27 0.66-0.18 0.18-0.41 0.28-0.66 0.28ZM11.16 11.53v0.05c0 0.17-0.07 0.33-0.18 0.44-0.12 0.12-0.28 0.18-0.44 0.18-0.17 0-0.33-0.07-0.44-0.18-0.12-0.12-0.18-0.28-0.18-0.44v-0.63c0-0.17 0.07-0.33 0.18-0.44 0.12-0.12 0.28-0.18 0.44-0.18 1.03 0 1.87-0.7 1.87-1.56s-0.84-1.56-1.87-1.56c-1.03 0-1.87 0.7-1.87 1.56v0.3c0 0.17-0.07 0.33-0.18 0.44-0.12 0.12-0.28 0.18-0.44 0.18s-0.33-0.07-0.44-0.18c-0.12-0.12-0.18-0.28-0.18-0.44v-0.3c0-1.55 1.4-2.81 3.12-2.81s3.12 1.26 3.12 2.81c0 1.36-1.07 2.5-2.5 2.76Z"
											fill="currentColor"
										></path>
									</svg>
								),
							},
							{
								title: 'Stay updated',
								description: (
									<>
										Sign up to our{' '}
										<a
											className="underline hover:text-primary"
											href="/newsletter"
										>
											Newsletter
										</a>{' '}
										and read our{' '}
										<a className="underline hover:text-primary" href="/blog">
											Blog
										</a>
										.
									</>
								),
								icon: (
									<svg
										className="w-5 h-5"
										xmlns="http://www.w3.org/2000/svg"
										width="21"
										height="21"
										viewBox="0 0 21 21"
										fill="none"
									>
										<path
											d="M17.41 4.08H4.91c-0.33 0-0.65 0.13-0.88 0.37-0.24 0.23-0.37 0.55-0.37 0.88v9.38c0 0.17-0.07 0.32-0.18 0.44-0.12 0.12-0.28 0.18-0.44 0.18-0.17 0-0.33-0.07-0.44-0.18-0.12-0.12-0.18-0.28-0.18-0.44V7.2c0-0.17-0.07-0.32-0.18-0.44-0.12-0.12-0.28-0.18-0.44-0.18-0.17 0-0.33 0.07-0.44 0.18-0.12 0.12-0.18 0.28-0.18 0.44v7.51c0 0.5 0.2 0.97 0.55 1.32 0.35 0.35 0.83 0.55 1.32 0.55h13.75c0.5 0 0.97-0.2 1.33-0.55 0.35-0.35 0.55-0.83 0.55-1.32V5.33c0-0.33-0.13-0.65-0.37-0.88-0.23-0.24-0.55-0.37-0.88-0.37ZM14.29 12.21H8.04c-0.17 0-0.32-0.07-0.44-0.18-0.12-0.12-0.19-0.28-0.19-0.44 0-0.17 0.07-0.32 0.19-0.44 0.12-0.12 0.28-0.19 0.44-0.19h6.25c0.17 0 0.32 0.07 0.44 0.19 0.12 0.12 0.19 0.28 0.19 0.44 0 0.17-0.07 0.32-0.19 0.44-0.12 0.12-0.28 0.18-0.44 0.18ZM14.29 9.71H8.04c-0.17 0-0.32-0.07-0.44-0.18-0.12-0.12-0.19-0.28-0.19-0.44 0-0.17 0.07-0.32 0.19-0.44 0.12-0.12 0.28-0.19 0.44-0.19h6.25c0.17 0 0.32 0.07 0.44 0.19 0.12 0.12 0.19 0.28 0.19 0.44 0 0.17-0.07 0.32-0.19 0.44-0.12 0.12-0.28 0.18-0.44 0.18Z"
											fill="currentColor"
										></path>
									</svg>
								),
							},
							{
								title: "Something's not right?",
								description: (
									<>
										Check{' '}
										<a className="underline hover:text-primary" href="/status">
											System Status
										</a>
										.
									</>
								),
								icon: (
									<svg
										className="w-5 h-5"
										xmlns="http://www.w3.org/2000/svg"
										width="21"
										height="21"
										viewBox="0 0 21 21"
										fill="none"
									>
										<path
											d="M17.41 3.46H3.66c-0.33 0-0.65 0.13-0.88 0.37-0.24 0.23-0.37 0.55-0.37 0.88v11.25c0 0.33 0.13 0.65 0.37 0.88 0.23 0.24 0.55 0.37 0.88 0.37h13.75c0.33 0 0.65-0.13 0.88-0.37 0.24-0.23 0.37-0.55 0.37-0.88V4.71c0-0.33-0.13-0.65-0.37-0.88-0.23-0.24-0.55-0.37-0.88-0.37ZM16.79 10.96h-1.51l-2.32 4.06c-0.05 0.1-0.13 0.17-0.23 0.23-0.1 0.05-0.2 0.08-0.31 0.08h-0.04c-0.12-0.01-0.23-0.05-0.32-0.11-0.1-0.07-0.17-0.16-0.22-0.27l-3.26-7.6-1.87 3.29c-0.06 0.1-0.13 0.18-0.23 0.23-0.1 0.05-0.21 0.08-0.32 0.08H4.29c-0.17 0-0.32-0.07-0.44-0.18-0.12-0.12-0.18-0.28-0.18-0.44 0-0.17 0.07-0.32 0.18-0.44 0.12-0.12 0.28-0.18 0.44-0.18h1.51l2.32-4.06c0.06-0.1 0.14-0.18 0.24-0.24 0.1-0.06 0.22-0.08 0.33-0.08 0.12 0.01 0.23 0.05 0.32 0.11 0.1 0.07 0.17 0.16 0.21 0.27l3.25 7.6 1.88-3.29c0.05-0.1 0.13-0.17 0.23-0.23 0.1-0.05 0.2-0.08 0.31-0.08h1.88c0.17 0 0.32 0.07 0.44 0.18 0.12 0.12 0.18 0.28 0.18 0.44 0 0.17-0.07 0.32-0.18 0.44-0.12 0.12-0.28 0.18-0.44 0.18Z"
											fill="currentColor"
										></path>
									</svg>
								),
							},
						].map((item, index) => (
							<div key={index} className="flex items-center space-x-3 w-full">
								<div className="flex gap-2 items-center">
									{item.icon}
									<span>{item.title}</span>
								</div>
								<span className="font-inter text-muted-foreground font-regular">
									{item.description}
								</span>
							</div>
						))}
					</div>
					<img
						src="https://docs.hiro.so/footer.svg"
						alt="Footer Logo"
						className="absolute bottom-0 right-0 hidden lg:block"
					/>
				</div>
			</div>
		</>
	);
};
