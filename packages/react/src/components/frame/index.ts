export * from './atoms';
export * from './types';

import * as atoms from './atoms';
import { Frame as FrameComponent } from './frame';
import type { FrameCompoundComponent } from './types';

const Frame = Object.assign(FrameComponent, {
	Root: atoms.FrameRoot,
	Title: atoms.FrameTitle,
	Button: atoms.FrameButton,
}) as FrameCompoundComponent;

export { Frame };
