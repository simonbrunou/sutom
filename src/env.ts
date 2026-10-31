import { defineEnvVars } from '@sveltejs/kit/env';

// Declare here every %sveltekit.env.PUBLIC_X% that src/app.html uses. SvelteKit 3
// substitutes only declared variables: an undeclared one still builds, and the
// page ships an empty value (a canonical URL of "/").
export const variables = defineEnvVars({
	PUBLIC_SITE_URL: {
		public: true,
		description:
			'Public origin (no trailing slash) used for the canonical and Open Graph URLs in app.html',
		// Unset (e.g. `npm run dev`) renders relative URLs, as before.
		schema: (value) => value ?? ''
	}
});
