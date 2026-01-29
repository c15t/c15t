import { Bird } from 'lucide-react';

export function Footer() {
	return (
		<footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
			<div className="container mx-auto max-w-6xl">
				<div className="grid md:grid-cols-4 gap-8 mb-8">
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<Bird className="h-6 w-6" />
							<span className="text-xl font-semibold">PigeonPost</span>
						</div>
						<p className="text-sm text-muted-foreground">
							Revolutionary pigeon-powered courier service for modern London.
						</p>
					</div>

					<div className="space-y-4">
						<h3 className="font-semibold">Product</h3>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<a
									href="#features"
									className="hover:text-foreground transition-colors"
								>
									Features
								</a>
							</li>
							<li>
								<a
									href="#pricing"
									className="hover:text-foreground transition-colors"
								>
									Pricing
								</a>
							</li>
							<li>
								<a
									href="#api"
									className="hover:text-foreground transition-colors"
								>
									pnpm API
								</a>
							</li>
							<li>
								<a
									href="#documentation"
									className="hover:text-foreground transition-colors"
								>
									Documentation
								</a>
							</li>
						</ul>
					</div>

					<div className="space-y-4">
						<h3 className="font-semibold">Company</h3>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<a
									href="#about"
									className="hover:text-foreground transition-colors"
								>
									About
								</a>
							</li>
							<li>
								<a
									href="#blog"
									className="hover:text-foreground transition-colors"
								>
									Blog
								</a>
							</li>
							<li>
								<a
									href="#careers"
									className="hover:text-foreground transition-colors"
								>
									Careers
								</a>
							</li>
							<li>
								<a
									href="#contact-us"
									className="hover:text-foreground transition-colors"
								>
									Contact
								</a>
							</li>
						</ul>
					</div>

					<div className="space-y-4">
						<h3 className="font-semibold">Legal</h3>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<a
									href="#privacy"
									className="hover:text-foreground transition-colors"
								>
									Privacy
								</a>
							</li>
							<li>
								<a
									href="#terms"
									className="hover:text-foreground transition-colors"
								>
									Terms
								</a>
							</li>
							<li>
								<a
									href="#security"
									className="hover:text-foreground transition-colors"
								>
									Security
								</a>
							</li>
						</ul>
					</div>
				</div>

				<div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
					<p>© 2025 PigeonPost. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
