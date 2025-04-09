import { Preview } from '~/components/docs/preview';
import { pages } from './example-page';

export default function WidgetExample() {
	return <Preview name="widget" code={pages} defaultFile="custom-widget.tsx" />;
}
