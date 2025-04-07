import { Preview } from '~/components/ui/preview';
import { pages } from './example-page';

export default function WidgetExample() {
	return <Preview name="widget" code={pages} defaultFile="CustomWidget.tsx" />;
}
