# StartShield Supabase setup

This app is now prepared for Supabase-backed persistent memory.

## What is already wired in code

- `index.html` loads Supabase before `app.js` starts.
- `supabase-config.js` holds the public Supabase URL and public anon key placeholder.
- `supabase-memory.js` hydrates selected localStorage keys from Supabase, then syncs them back to Supabase after local changes.
- `supabase/schema.sql` contains the table, trigger, unique constraint, Row Level Security enablement, and client policies.
- `scripts/build-web.js` copies the Supabase files into `dist/` for web deploys.

## 1. Create the Supabase project

In Supabase, create the project normally.

Recommended options:

- Enable Data API: on
- Automatically expose new tables: off, if Supabase lets you control this
- Enable automatic RLS: on, if available
- Region: closest to your users

## 2. Create the database table

After the Supabase project finishes provisioning:

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Open this repo file: `supabase/schema.sql`.
4. Copy the whole file.
5. Run it in the SQL Editor.

## 3. Add the public project values

Open Supabase Dashboard:

Project Settings -> API

Copy:

- Project URL
- anon public key

Then update `supabase-config.js`:

```js
window.STARTSHIELD_SUPABASE = {
    url: 'https://YOUR-PROJECT.supabase.co',
    anonKey: 'YOUR_PUBLIC_ANON_KEY'
};
```

Do not use the `service_role` key in the frontend. That key is private and backend-only.

## 4. Deploy or run

For the web build:

```bash
npm run build:web
```

The `dist/` folder will include:

- `index.html`
- `styles.css`
- `app.js`
- `supabase-config.js`
- `supabase-memory.js`

## Current memory behavior

The app syncs these keys:

- `sessionCount`
- `currentTask`
- `startshieldSettings`
- `startshieldStats`
- `startshieldOnboardingDismissed`

This gives the app persistent memory for focus progress, current task, settings, stats, and onboarding state.

## Security note

This version uses a browser-generated device ID so the existing no-login app can sync memory without forcing user accounts yet. That is fine for a simple personal MVP, but it is not true user authentication.

The next serious upgrade should add Supabase Auth so each user owns their own memory through `auth.uid()` policies.
