'use client';

import { dispatcher } from 'next/dist/compiled/next-devtools';
import { useEffect, useTransition } from 'react';

export const useAppDevRenderingIndicator = () => {
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (isPending) {
			dispatcher.renderingIndicatorShow();
		} else {
			dispatcher.renderingIndicatorHide();
		}
	}, [isPending]);

	return startTransition;
};
