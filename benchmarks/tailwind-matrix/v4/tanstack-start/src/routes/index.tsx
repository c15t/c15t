import { createFileRoute } from '@tanstack/react-router';

const Home = () => (
	<p
		className="bg-emerald-600 text-white"
		data-testid="tailwind-probe"
	>
		Tailwind utilities are active on this page.
	</p>
);

export const Route = createFileRoute('/')({ component: Home });
