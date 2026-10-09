# Deploy Petio's friends-only backend to Vercel + Neon

The repository contains two applications. The root is the Windows desktop app.
**Vercel Root Directory must be `backend`**, which has its own package/lockfile,
API functions and `vercel.json`. Do not deploy the Electron root directory.

1. In Neon, select a dedicated Petio database/branch. Open **SQL Editor** and
   run the contents of `backend/schema.sql` once. It is safe to run again.
2. Copy its **pooled** connection string from Neon → Connect. Keep it private.
3. In Vercel, import `y000yal/petio`. Name the project `petio-backend`, set
   **Root Directory** to `backend` and **Framework Preset** to **Other**.
   Leave the build command empty; the checked-in configuration serves `public`
   and builds the functions in `api`. The backend targets Node.js 22.
4. Add **Production** environment variable `DATABASE_URL` with that connection
   string. Optionally add `PETIO_REGISTRATION_CODE` with a private code that
   friends must enter when creating profiles. Choose a function region near
   your Neon database. Use a separate Neon branch/database for Preview builds.
5. Deploy. Visit `https://YOUR-PROJECT.vercel.app/api/health`; expect
   `{"ok":true,"service":"petio","version":1}`. A 503 means the database
   connection or schema is not ready. New environment values require redeploy.
6. The production URL must accept desktop API requests without a Vercel browser
   login. If deployment protection blocks it, configure production access in
   Vercel's Deployment Protection settings. Keep preview deployments protected;
   the Petio API independently checks profile credentials and group membership.
7. In Petio → Settings → Friends & visits, enter the production **origin**
   (`https://YOUR-PROJECT.vercel.app`) and click Connect. Everyone uses this same
   address. Create a profile, create/join a private group, and enable visits.
   If a registration code was configured, enter it in the profile form.
8. Save your private recovery code using **Copy private recovery code**. Restore
   it after reinstalling to recover the profile. Treat it like a password and
   use a profile on one computer at a time. Desktop tokens are encrypted using
   Windows credential protection; Neon holds only token hashes.

Build a fresh Windows installer with `npm run dist:self-signed`. Users can enter
the hosted address in settings, so it does not need to be hardcoded into the EXE.
The database connection string belongs only on Vercel, never in the installer.

## Validation and limits

Run `npm test` at the root, `npm ci --prefix backend`, then
`npm test --prefix backend`. Backend tests execute its schema and transaction
queries against embedded PostgreSQL. `electron tools/social-smoke.cjs` verifies
the native departure, arrival, replies, recall and outage recovery locally.

This beta supports up to 100 profiles, 12 members per group, and one visitor per
desktop. Neon holds one bounded JSONB state record locked inside a transaction;
this serializes competing transfers across Vercel instances. Recent history is
bounded to 200 returned visits globally. Persistent rate limits allow five new
profiles and 180 other requests per IP per minute. Visits expire after five
minutes or 30 seconds without either participant; clients poll every five
seconds and return an away pet after forty seconds of failed hosted requests.

This design is intended for a small friends-only beta. Before a wider public
release, migrate to separate relational rows and add normal account sign-in,
credential rotation, moderation and message-retention controls. Keep the
registration code enabled for the beta. Existing local profiles/groups are
separate from hosted profiles; switching servers preserves both locally.

Live deployment and two-computer internet delivery must be checked after your
Vercel project and Neon database are configured. Automated tests do not claim
that the real hosted database or deployment has already been verified.
