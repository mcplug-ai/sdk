/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { z } from 'zod';
import { tool, createHandler } from '@mcplug/server/cloudflare';

export default createHandler({
	secret: 'secret',
	versions: {
		'1.0.0': {
			name: 'Weather_Mcp',
			tools: {
				'get-weather': tool('Use this tool to get the weather in a given city')
					.input(
						z.object({
							city: z.string(),
							_GOOGLE_API_KEY: z.string(),
						})
					)
					.handle(async ({ input }) => {
						return {
							city: input.city,
							temp: 20,
							unit: 'C',
							condition: 'sunny',
						};
					}),
			},
		},
	},
});
