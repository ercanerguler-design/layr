# GitHub and Vercel deployment

## Vercel web app

Import `ercanerguler-design/layr` from GitHub as a Vercel project and set:

- Root Directory: `apps/web`
- Framework: Next.js (detected from `apps/web/vercel.json`)
- Include source files outside the Root Directory: enabled (the web app imports `packages/types`)
- Node.js: 20 or newer

Vercel detects pnpm from the repository lockfile and builds the Next.js app. Add these Production, Preview, and Development environment variables in the Vercel project settings:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public HTTPS origin of the separately hosted API, e.g. `https://api.example.com` |
| `NEXT_PUBLIC_APP_URL` | The Vercel production domain, e.g. `https://layr.example.com` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | A Mapbox public token if the selected map style requires it |

The web and API are separate Vercel projects in this monorepo. Deploy the API as described below, then set `NEXT_PUBLIC_API_URL` on the web project to the API project's HTTPS origin. The web deployment renders without the API, but login and map data require it.

## Vercel API project

- Create a second Vercel project connected to this repository, named `layr-api`.
- Set Root Directory to `apps/api`, Framework Preset to Fastify, and enable access to source files outside the root (`packages/db` and `packages/types`).
- Use the Neon pooled `DATABASE_URL` and set `NODE_ENV=production`.
- Set unique random values of at least 32 characters for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Set `CORS_ORIGINS` to `https://layr-sceinnovation.vercel.app,https://layr-azure.vercel.app` (plus any other allowed web domains).
- Configure OpenAI only if AI features should be enabled.
- Set the web project's `NEXT_PUBLIC_API_URL` to the API project's public HTTPS origin and redeploy the web project.

The Prisma schema uses PostgreSQL for Neon. API media uploads currently write to local disk, which is temporary on Vercel Functions. Configure durable object storage before relying on uploaded images, audio, or models in production.

## Local checks before deployment

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

After the API is deployed, check `https://<api-domain>/health`, then set the Vercel environment variables and redeploy the web project.
