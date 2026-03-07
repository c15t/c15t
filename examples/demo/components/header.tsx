import { Bird } from 'lucide-react';
import { ThemeSwitcherButton } from './consent-manager/theme-switcher';
import { I18nButton } from './i18n-button';
import { Button } from './ui/button';

export function Header() {
	return (
		<header className="fixed top-0 right-0 left-0 z-50 border-border border-b bg-background/80 backdrop-blur-md">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					<div className="flex items-center gap-2">
						<Bird className="h-6 w-6" />
						<span className="font-semibold text-xl">PigeonPost</span>
					</div>

					<nav className="hidden items-center gap-8 md:flex">
						<a
							href="#features"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							Features
						</a>
						<a
							href="#how-it-works"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							How It Works
						</a>
						<a
							href="#pricing"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							Pricing
						</a>
						<a
							href="#testimonials"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							Testimonials
						</a>
						<a
							href="/ssr"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							SSR Demo
						</a>
						<a
							href="/policy"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							Policy
						</a>
						<a
							href="/policy-offline"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							Offline Policy
						</a>
					</nav>

					<div className="flex items-center gap-4">
						<Button variant="ghost" size="sm">
							Log in
						</Button>
						<Button size="sm" asChild>
							<a href="#pricing">Get Started</a>
						</Button>
						<I18nButton />
						<ThemeSwitcherButton />
					</div>
				</div>
			</div>
		</header>
	);
}
