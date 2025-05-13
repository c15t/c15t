'use client';

import { type ReactNode, useEffect } from 'react';
import { setCookie } from './set-cookie';

interface CookiesProps {
	children: ReactNode;
	cookies: Record<string, string>;
}

export function SetCookies({ children, cookies }: CookiesProps) {
	useEffect(() => {
		for (const [key, value] of Object.entries(cookies)) {
			setCookie(key, value);
		}
	}, [cookies]);

	return children;
}
