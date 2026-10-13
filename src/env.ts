import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_SITE_URL: {
		public: true,
		description: 'Public origin (no trailing slash) used for the canonical and Open Graph URLs in app.html',
		// Unset (e.g. `npm run dev`) renders relative URLs, as before.
		schema: (value) => value ?? ''
	}
});
