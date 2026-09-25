/** Accepts consent writes and session reports so nothing leaves the machine. */
export const GET = () => Response.json({});

export const POST = () => Response.json({ ok: true });

export const PATCH = POST;
