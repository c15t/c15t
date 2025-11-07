import { Icon, type IconName } from '~/components/icons';
import styles from './header.module.css';
import { Button } from './ui/button';
import { C15TIcon } from './ui/logo';

interface HeaderProps {
	onClose?: () => void;
}

export function Header({ onClose }: HeaderProps) {
	return (
		<div className={styles.header}>
			<div className={styles.title}>
				<C15TIcon className={styles.logo} />
				{/* <span>Consent Management</span> */}
			</div>
			<div className={styles.actions}>
				{onClose && (
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label="Close"
					>
						<Icon name="close" size={16} />
					</Button>
				)}
			</div>
		</div>
	);
}
