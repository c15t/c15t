import { os } from '~/contracts';

export const postConsent = os.consent.post.handler(({ input }) => {
	return {
		id: '123',
		subjectId: '123',
		externalSubjectId: '123',
		domainId: '123',
		domain: '123',
		type: input.type,
		status: 'granted',
		recordId: '123',
		givenAt: new Date(),
		metadata: {},
	};
});
