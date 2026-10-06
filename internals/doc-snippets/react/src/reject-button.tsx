// #region docs:reject-button
import { useSaveConsents } from 'c15t/react';

export const RejectButton = () => {
	const save = useSaveConsents();
	return (
		<button
			type="button"
			onClick={() => {
				void save('none');
			}}
		>
			Reject optional
		</button>
	);
};
// #endregion docs:reject-button
