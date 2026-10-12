'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps a surface mounted for `exitMs` after `open` turns false, so its
 * closing transition can play. The opening transition comes from CSS
 * `@starting-style`.
 */
export const usePresence = function usePresence(
	open: boolean,
	exitMs: number
): boolean {
	const [wasOpen, setWasOpen] = useState(open);
	const [isExiting, setIsExiting] = useState(false);

	if (open !== wasOpen) {
		setWasOpen(open);
		setIsExiting(!open);
	}

	useEffect(() => {
		if (!isExiting) {
			return;
		}
		const timer = setTimeout(() => setIsExiting(false), exitMs);
		return () => clearTimeout(timer);
	}, [isExiting, exitMs]);

	return open || isExiting;
};
