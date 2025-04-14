import * as SwitchPrimitives from '@radix-ui/react-switch';

import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from 'react';
import { Box } from '~/components/shared/primitives/box';
import { useStyles } from '~/hooks/use-styles';
import type { ExtendThemeKeys, ThemeValue } from '~/types/theme';
import styles from './switch.module.css';

export type SwitchStylesKeys = {
  'switch.root': ThemeValue;
  'switch.thumb': ThemeValue;
  'switch.track': ThemeValue;
};
/**
 * Props for the description text component of the CookieBanner.
 * Extends standard HTML div attributes.
 *
 * @public
 */
export interface SwitchProps
  extends ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  theme?: {
    root: ExtendThemeKeys;
    thumb: ExtendThemeKeys;
    track: ExtendThemeKeys;
  };
}

const Switch = forwardRef<
  ComponentRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, disabled, slot, theme, ...rest }, forwardedRef) => {
  const switchRoot = useStyles(theme?.root.themeKey ?? 'switch.root', {
    ...theme?.root,
    baseClassName: [styles.root, theme?.root.baseClassName],
    className,
  });

  const switchThumb = useStyles(theme?.thumb.themeKey ?? 'switch.thumb', {
    ...theme?.thumb,
    baseClassName: [
      theme?.thumb.baseClassName,
      styles.thumb,
      disabled && styles['thumb-disabled'],
    ],
    style: {
      ...theme?.thumb.style,
      ['--mask' as string]:
        'radial-gradient(circle farthest-side at 50% 50%, #0000 1.95px, #000 2.05px 100%) 50% 50%/100% 100% no-repeat',
    },
  });

  return (
    <SwitchPrimitives.Root
      ref={forwardedRef}
      disabled={disabled}
      {...rest}
      {...switchRoot}
    >
      <Box
        themeKey={theme?.track.themeKey ?? 'switch.track'}
        baseClassName={[styles.track, disabled && styles['track-disabled']]}
        style={theme?.track.style}
      >
        <SwitchPrimitives.Thumb {...switchThumb} />
      </Box>
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch as Root };
