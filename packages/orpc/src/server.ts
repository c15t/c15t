import { createServer } from 'node:http';
import { OpenAPIGenerator } from '@orpc/openapi';
import { OpenAPIHandler } from '@orpc/openapi/node';
import { CORSPlugin } from '@orpc/server/plugins';
import { ZodSmartCoercionPlugin, ZodToJsonSchemaConverter } from '@orpc/zod';
import { router } from './router';

const openAPIHandler = new OpenAPIHandler(router, {
	plugins: [new CORSPlugin(), new ZodSmartCoercionPlugin()],
});

const openAPIGenerator = new OpenAPIGenerator({
	schemaConverters: [new ZodToJsonSchemaConverter()],
});

const server = createServer(async (req, res) => {
	const { matched } = await openAPIHandler.handle(req, res, {
		prefix: '/api',
		context: { headers: req.headers },
	});

	if (matched) {
		return;
	}

	if (req.url === '/spec.json') {
		const spec = await openAPIGenerator.generate(router, {
			info: {
				title: 'My Playground',
				version: '1.0.0',
			},
			servers: [{ url: '/api' } /** Should use absolute URLs in production */],
			security: [{ bearerAuth: [] }],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
					},
				},
			},
		});

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(spec));
		return;
	}

	const html = `
    <!doctype html>
    <html>
      <head>
        <title>My Client</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="https://orpc.unnoq.com/icon.svg" />
      </head>
      <body>
        <script
          id="api-reference"
          data-url="/spec.json"
          data-configuration="${JSON.stringify({
						authentication: {
							preferredSecurityScheme: 'bearerAuth',
							http: {
								bearer: { token: 'default-token' },
							},
						},
					}).replaceAll('"', '&quot;')}">
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  `;

	res.writeHead(200, { 'Content-Type': 'text/html' });
	res.end(html);
});

server.listen(3000, () => {
	console.log('Playground is available at http://localhost:3000');
});
