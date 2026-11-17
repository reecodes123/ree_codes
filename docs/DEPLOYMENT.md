# GitHub and Vercel deployment

This app uses Next.js 15, Prisma 6, PostgreSQL, and Vercel Blob.

## GitHub

Create a private repository and push this project directory (the one containing
package.json). Commit package-lock.json and prisma/migrations. Review staged
files before committing. The ignore files exclude local secrets, dependencies,
build output, database backups, and locally uploaded media.

## Vercel

Owner-selected project:
https://vercel.com/morenoairelynmae-gmailcoms-projects/v0-random-quote-frontend/settings/build-and-deployment

Connect the GitHub repository and select main as the production branch.
Choose Next.js. Use the repository root as Root Directory if package.json is at
the top level; otherwise choose tmt-portal-v4. Leave Output Directory at its
default. vercel.json configures npm ci and npm run vercel-build. The build
regenerates Prisma Client, applies committed migrations, and builds Next.js.

## Environment variables

Set these in Vercel before deploying:

| Variable | Production value |
| --- | --- |
| DATABASE_URL | Hosted PostgreSQL connection string with SSL and the provider's serverless/pooling settings. Never localhost. |
| AUTH_SECRET | A fresh cryptographically random secret of at least 32 bytes. |
| NEXTAUTH_URL | Final HTTPS production domain. |
| NEXT_PUBLIC_SITE_URL | Same HTTPS domain, used for metadata and password reset links. |
| BLOB_READ_WRITE_TOKEN | Token for the project's Vercel Blob store; required for production uploads. |
| GMAIL_USER | Optional password reset email sender. |
| GMAIL_APP_PASSWORD | Gmail app password, required with GMAIL_USER to send reset emails. |

AUTH_SECRET is preferred. If NEXTAUTH_SECRET is also configured, keep both
identical. Do not copy the local .env wholesale. Leave DEV_PREVIEW_ROLE unset.
Use separate databases and Blob stores for Preview and Production. Every build
runs migrations against its configured database, including preview builds.

## Database and content

A new hosted database starts empty. Migrations create the schema but do not copy
local articles, accounts, or images. To initialize a fresh database, run
npm run db:seed from a trusted environment configured with the hosted
DATABASE_URL, SEED_ADMIN_EMAIL, SEED_EDITOR_EMAIL, and strong values for
SEED_ADMIN_PASSWORD and SEED_EDITOR_PASSWORD. The seed adds sample content and
can update accounts; review prisma/seed.ts before running on existing data.

To preserve current content, transfer the local PostgreSQL database separately.
Move public/uploads media into Blob and update stored image URLs. Local uploads
are excluded from GitHub and deployments; they do not move automatically.

## Verification

Run npm run typecheck and npm run build locally. After Vercel reports Ready:

- Open the homepage and a published article.
- Open /login and confirm /dashboard redirects there while signed out.
- Sign in and check dashboard permissions.
- Upload an image and confirm it is served from Vercel Blob.
- Test password reset when email is configured.

Pushes to main trigger production deployment after Git integration is enabled.

References:
https://vercel.com/docs/project-configuration
https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
