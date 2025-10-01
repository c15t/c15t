// Import the CSS file
import styles from './switch.module.css';

// CSS Module exports for switch
export const switchStyles = {
	root: styles.root,
	thumb: styles.thumb,
	track: styles.track,
  'track-disabled': styles['track-disabled'],
  'thumb-disabled': styles['thumb-disabled'],
};

export default switchStyles;