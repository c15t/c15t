import Link from 'next/link';

export const SiteFooter = () => (
	<footer className="site-footer">
		<div className="site-footer-inner">
			<p>Northwind Coffee. Small-batch roasting since 2014.</p>
			<Link href="/account/privacy">Privacy settings</Link>
		</div>
	</footer>
);
