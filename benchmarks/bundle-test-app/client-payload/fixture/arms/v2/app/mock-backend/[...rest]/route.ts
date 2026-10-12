/** Accepts consent writes so the browser never sees an error. */
export const GET = () => Response.json({});

export const POST = () => Response.json({ ok: true });

export const PATCH = POST;
