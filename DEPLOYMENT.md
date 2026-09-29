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

The API is not deployed by this Vercel project. The API needs a persistent writable disk for its SQLite database and uploaded media; Vercel's function filesystem is temporary. Deploy `apps/api` on a service with a persistent volume, then set `NEXT_PUBLIC_API_URL` to that service's HTTPS origin. Until this is done, the web deployment can render but login, map data, and uploads will not work.

## API service requirements

- Build from the repository root with `pnpm install --frozen-lockfile` and `pnpm --filter @layr/api build`.
- Start with `pnpm --filter @layr/api start` and expose the configured `PORT` (default `3001`).
- Set `DATABASE_URL` to a SQLite file on the persistent volume, such as `file:/data/layr.db`.
- Persist the API working directory's `uploads/` folder, or replace local media storage with durable object storage before deploying without a persistent filesystem.
- Set unique random values of at least 32 characters for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Set `CORS_ORIGINS` to the exact Vercel production domain (and any preview domains that should be allowed).
- Set `NODE_ENV=production`. Configure Redis and OpenAI only if those integrations are enabled for the deployment.

The Prisma schema currently uses SQLite. A PostgreSQL URL in `DATABASE_URL` will not work until the Prisma datasource is migrated and the generated client and database migrations are updated.

## Local checks before deployment

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

After the API is deployed, check `https://<api-domain>/health`, then set the Vercel environment variables and redeploy the web project.
