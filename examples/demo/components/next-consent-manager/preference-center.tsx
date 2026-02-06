'use client';
import { ConsentManagerWidget } from '@c15t/react';
import { ConsentManagerDialog } from '@c15t/react/consent-manager-dialog';

// export default function () {
// 	return (
// 		<ConsentManagerDialog />
// 	);
// }

export default function () {
	return (
		<ConsentManagerDialog.Root>
			<ConsentManagerDialog.Card>
				<ConsentManagerDialog.Header>
					<ConsentManagerDialog.HeaderTitle />
					<ConsentManagerDialog.HeaderDescription />
				</ConsentManagerDialog.Header>
				<ConsentManagerDialog.Content>
					<ConsentManagerWidget />
				</ConsentManagerDialog.Content>
				<ConsentManagerDialog.Footer />
			</ConsentManagerDialog.Card>
		</ConsentManagerDialog.Root>
	);
}
