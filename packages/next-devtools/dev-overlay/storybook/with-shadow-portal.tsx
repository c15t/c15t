import '../global.css';
import { ShadowPortal } from '../components/shadow-portal';
import { ComponentStyles } from '../styles/component-styles';

export const withShadowPortal = (Story: any) => (
	<ShadowPortal>
		<ComponentStyles />
		<Story />
	</ShadowPortal>
);
