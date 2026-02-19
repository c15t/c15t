import { Bird } from 'lucide-react';
import { ThemeSwitcherButton } from './consent-manager/theme-switcher';
import { I18nButton } from './i18n-button';
import { Button } from './ui/button';

export function Header() {
	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					<div className="flex items-center gap-2">
						<Bird className="h-6 w-6" />
						<span className="text-xl font-semibold">PigeonPost</span>
					</div>

					<nav className="hidden md:flex items-center gap-8">
						<a
							href="#features"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Features
						</a>
						<a
							href="#how-it-works"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							How It Works
						</a>
						<a
							href="#pricing"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Pricing
						</a>
						<a
							href="#testimonials"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Testimonials
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
