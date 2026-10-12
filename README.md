# Miyovra — GitHub Pages Edition

Miyovra is a static anime frontend hosted on **GitHub Pages**.

HentaiOcean is an optional restricted streaming source. It is only exposed to signed-in users who complete the adult verification prompt in their Miyovra account panel, and playback uses HentaiOcean's documented embed API. The browser gate is a product access control; production deployments should add server-side age or identity verification.

Features include email/password accounts through Supabase, profile avatars, Continue Watching sync, public/private lists, player customization, and browser offline downloads.

## Monetization

Miyovra is **ads-only**. There is no PayPal integration, Premium tier, subscription billing, or paid membership code.

The active publisher script is included directly in `index.html`:

```html
<script src="https://pl31543304.profitableratecpmnetwork.com/e7/8d/82/e78d820541c26ca920191a7d24b6e49d.js"></script>
```

That script URL is public publisher code, not a password or API secret.

Do not click your own advertisements or manufacture impressions/clicks. Follow the ad network's publisher rules.

## GitHub Pages

In the repository open:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

The workflow in `.github/workflows/pages.yml` deploys pushes to `main`.

Keep the Pages source set to **GitHub Actions**. **Deploy from a branch** publishes the empty configuration template in `src/runtime-config.js` and can overwrite the configured workflow deployment, causing the account button to show **Cloud setup** even when the Supabase variables exist.

Expected site URL:

```
https://brysona320-coder.github.io/Miyovra/
```

## Supabase accounts and sync

Supabase is optional for the public browser/player, but required for cloud accounts, avatars, cross-device Continue Watching, and synced lists.

Create a Supabase project and run:

```
supabase/schema.sql
```

in Supabase **SQL Editor**.

Then add these GitHub repository variables under:

**Settings → Secrets and variables → Actions → Variables**

```
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

The workflow also accepts `SUPABASE_ANON_KEY`, and it checks both Actions Variables and Actions Secrets. After adding or changing them, run the **Deploy GitHub Pages** workflow again or push a new commit so `src/runtime-config.js` is regenerated.

Add this URL to the allowed Supabase Auth site/redirect URLs:

```
https://brysona320-coder.github.io/Miyovra/
```

The publishable key is a browser-facing key. Never expose a Supabase service-role/secret key on GitHub Pages.

## If account signup shows "Load failed"

Miyovra accounts require an active and reachable Supabase project. If someone opens the site from an Instagram message, they should open the site URL in Safari or Chrome and retry; embedded browsers can fail cross-origin requests.

If signup still fails in a normal browser, the owner should:

1. Check the Supabase project is running and that email signup is enabled under **Authentication → Providers**.
2. Check **Supabase → Logs → Auth** around the failed signup, and verify the **Authentication → URL Configuration** site/redirect URL includes the published GitHub Pages URL above.
3. Verify the GitHub Actions variables **SUPABASE_URL** and **SUPABASE_PUBLISHABLE_KEY** are correct, then re-run the Pages deployment.
4. Make sure `supabase/schema.sql` has been applied in the project: it creates the signup trigger that initializes each account's profile and lists.

Do not publish private credentials or ask someone to send you their password to debug a failure.

## Offline downloads

The Service Worker stores supported media in browser Cache Storage and tracks downloads with IndexedDB. Whether a video can be saved depends on the upstream host's CORS/access rules and browser storage quota.

## Tests

```sh
npm test
```
