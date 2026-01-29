import { CTA } from '../components/cta';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { Hero } from '../components/hero';
import { HowItWorks } from '../components/how-it-works';
import { Pricing } from '../components/pricing';
import { Stats } from '../components/stats';
import { Testimonials } from '../components/testimonials';
import { VideoDemo } from '../components/video-demo';

export default function Home() {
	return (
		<main className="min-h-screen">
			<Header />
			<Hero />
			<Stats />
			{/* <Features /> */}
			<VideoDemo />
			<HowItWorks />
			<Pricing />
			<Testimonials />
			<CTA />
			<Footer />
		</main>
	);
}
