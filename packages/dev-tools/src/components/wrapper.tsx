'use client';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './wrapper.css';
import { cn } from '~/libs/utils';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * Dev Tool Wrapper Component
 *
 * This component serves as both an icon and a wrapper for the development tool interface.
 * It provides a button that, when clicked, toggles the visibility of a pop-up containing
 * the router pages.
 *
 * @component
 * @returns {JSX.Element} The rendered component
 */
export function DevToolWrapper({
	children,
	isOpen,
	toggleOpen,
	position = 'bottom-right',
}: {
	children: ReactNode;
	isOpen: boolean;
	toggleOpen: () => void;
	position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
}) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
		return () => setIsMounted(false);
	}, []);

	const DevToolContent = (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="c15t-devtool-wrapper-overlay"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ type: 'spring', stiffness: 400, damping: 40 }}
				>
					<motion.div
						className="c15t-devtool-wrapper-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={toggleOpen}
					/>
					<motion.div
						className={cn('c15t-devtool-wrapper-content', position)}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
					>
						<Card className="c15t-devtool-wrapper-card">{children}</Card>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);

	return (
		<>
			<AnimatePresence>
				{!isOpen && (
					<motion.div
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.95, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 400, damping: 40 }}
						className="c15t-devtool-wrapper-button-container"
					>
						<Button
							variant="outline"
							size="icon"
							className="c15t-devtool-wrapper-button"
							onClick={toggleOpen}
						>
							<svg
								viewBox="0 0 149 149"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="c15t-devtool-wrapper-button-icon"
							>
								<title>c15t-devtool-icon</title>
								<path
									fillRule="evenodd"
									clipRule="evenodd"
									d="M74.5436 14.2802C68.963 14.2802 64.4391 18.8042 64.4391 24.3848C64.4391 29.9654 68.963 34.4893 74.5436 34.4893C80.1243 34.4893 84.6482 29.9654 84.6482 24.3848C84.6482 18.8042 80.1243 14.2802 74.5436 14.2802ZM50.9663 24.3848C50.9663 11.3634 61.5222 0.807434 74.5436 0.807434C87.5651 0.807434 98.121 11.3634 98.121 24.3848C98.121 37.4062 87.5651 47.9621 74.5436 47.9621C70.4834 47.9621 66.6628 46.9358 63.3272 45.1283L44.7645 63.6911C45.5299 65.1037 46.1553 66.6033 46.6219 68.1713H102.466C105.364 58.4322 114.386 51.3303 125.067 51.3303C138.088 51.3303 148.644 61.8862 148.644 74.9076C148.644 87.929 138.088 98.4849 125.067 98.4849C114.386 98.4849 105.364 91.3831 102.466 81.644H46.6219C46.0071 83.7098 45.1168 85.657 43.9935 87.4429L62.0084 105.458C65.6396 103.174 69.9373 101.853 74.5436 101.853C87.5651 101.853 98.121 112.409 98.121 125.43C98.121 138.452 87.5651 149.008 74.5436 149.008C61.5222 149.008 50.9663 138.452 50.9663 125.43C50.9663 121.925 51.7315 118.597 53.104 115.607L33.8445 96.3472C30.854 97.7197 27.5268 98.4849 24.0209 98.4849C10.9995 98.4849 0.443604 87.929 0.443604 74.9076C0.443604 61.8862 10.9995 51.3303 24.0209 51.3303C28.0814 51.3303 31.9022 52.3567 35.2379 54.1643L53.8004 35.6018C51.9928 32.2661 50.9663 28.4453 50.9663 24.3848ZM114.962 74.9076L114.962 74.9578C114.989 80.5153 119.503 85.0122 125.067 85.0122C130.647 85.0122 135.171 80.4882 135.171 74.9076C135.171 69.327 130.647 64.803 125.067 64.803C119.503 64.803 114.989 69.2999 114.962 74.8574L114.962 74.9076ZM24.0209 64.803C18.4403 64.803 13.9164 69.327 13.9164 74.9076C13.9164 80.4882 18.4403 85.0122 24.0209 85.0122C29.6015 85.0122 34.1255 80.4882 34.1255 74.9076C34.1255 69.327 29.6015 64.803 24.0209 64.803ZM64.4391 125.43C64.4391 119.85 68.963 115.326 74.5436 115.326C80.1243 115.326 84.6482 119.85 84.6482 125.43C84.6482 131.011 80.1243 135.535 74.5436 135.535C68.963 135.535 64.4391 131.011 64.4391 125.43Z"
									fill="currentColor"
								/>
							</svg>
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
			{isMounted && createPortal(DevToolContent, document.body)}
		</>
	);
}

export default DevToolWrapper;
