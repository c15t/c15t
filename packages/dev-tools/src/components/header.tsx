import { X } from 'lucide-react';
import { Button } from './ui/button';
import './header.css';
import { C15TIcon } from './ui/logo';

interface HeaderProps {
	onClose?: () => void;
}

export function Header({ onClose }: HeaderProps) {
	return (
		<div className="c15t-devtool-header">
			<div className="c15t-devtool-header-title">
				<C15TIcon className="c15t-devtool-header-logo" />
				{/* <span>Consent Management</span> */}
			</div>
			<div className="c15t-devtool-header-actions">
				{onClose && (
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label="Close"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}
