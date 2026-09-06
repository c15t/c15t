export type CssLayerSurface = 'banner' | 'dialog' | 'widget';
export type CssLayerEnvironmentId = 'tw3' | 'tw4' | 'no-tw';

export interface CssLayerEnvironment {
	id: CssLayerEnvironmentId;
	label: string;
	port: number;
	description: string;
}
