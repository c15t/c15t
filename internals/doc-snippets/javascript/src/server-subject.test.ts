import { describe, expect, it } from 'vitest';

import { handleRequest } from './server-subject';

// The server subject example in the persistence guide, run with the real
// resolveRequestSubject().
const page = (cookie?: string) =>
	new Request(
		'https://app.example.com/account',
		cookie ? { headers: { cookie } } : {}
	);

describe('server subject doc snippet', () => {
	it('sets the subject cookie on a redirect the render returns', async () => {
		let rendered: Request | undefined;
		const response = await handleRequest(page(), (request) => {
			rendered = request;
			return Promise.resolve(
				Response.redirect('https://app.example.com/login', 302)
			);
		});
		const subjectId = /c15t-sid=(?<id>[^;]+)/u.exec(
			rendered?.headers.get('cookie') ?? ''
		)?.groups?.id;
		expect(subjectId).toMatch(/^sub_/u);
		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe(
			'https://app.example.com/login'
		);
		expect(response.headers.getSetCookie()).toEqual([
			`c15t-sid=${subjectId}; Max-Age=31536000; Path=/; Secure; SameSite=Lax`,
		]);
	});

	it('keeps the status, headers, cookies and body the render sets', async () => {
		const response = await handleRequest(page('theme=dark'), () =>
			Promise.resolve(
				new Response('<p>Account</p>', {
					headers: {
						'content-type': 'text/html',
						'set-cookie': 'app=1; Path=/',
					},
					status: 201,
					statusText: 'Created',
				})
			)
		);
		expect(response.status).toBe(201);
		expect(response.statusText).toBe('Created');
		expect(response.headers.get('content-type')).toBe('text/html');
		const cookies = response.headers.getSetCookie();
		expect(cookies).toHaveLength(2);
		expect(cookies[0]).toBe('app=1; Path=/');
		expect(cookies[1]).toMatch(/^c15t-sid=sub_/u);
		expect(await response.text()).toBe('<p>Account</p>');
	});

	it('returns the render response itself to a returning visitor', async () => {
		const redirect = Response.redirect('https://app.example.com/login', 302);
		const response = await handleRequest(page('c15t-sid=sub_existing'), () =>
			Promise.resolve(redirect)
		);
		expect(response).toBe(redirect);
		expect(response.headers.getSetCookie()).toEqual([]);
	});
});
