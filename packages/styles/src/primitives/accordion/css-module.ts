// Import the CSS file
import styles from './accordion.module.css';

// CSS Module exports for accordion
export const accordionStyles = {
	root:    styles.root,
	item: styles.item,
	triggerInner: styles.triggerInner,
	content: styles.content,
  icon: styles.icon,
  contentInner: styles.contentInner,
  arrowOpen: styles.arrowOpen,
  arrowClose: styles.arrowClose,
};

export default accordionStyles;