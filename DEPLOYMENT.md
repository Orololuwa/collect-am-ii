# Deploying CollectAm

CollectAm runs on a VPS (Contabo) with Docker Compose, behind the server's
existing Caddy container (the `proxy` compose project). Caddy reaches the app
over the shared external `web` network, like the portfolio and Eleven:

```
internet ──443──▶ caddy (proxy project) ──(web network)──▶ collect-am-app:3001 ──▶ collect-am-db:5432
```

|                |                                                     |
| -------------- | --------------------------------------------------- |
| URL            | https://collect-am.orololuwa.dev                    |
| Checkout       | `/srv/collect-am`                                   |
| Compose project| `collect-am` (from the folder name)                 |
| Containers     | `collect-am-db`, `collect-am-app`                   |
| App            | `collect-am-app:3001` on the `web` network; `127.0.0.1:3001` on the host |
| Postgres       | `127.0.0.1:5433` on the host, `db:5432` in compose  |
| Data           | Docker volume `collect-am_pgdata`                   |

The host ports are bound to loopback only, for checks and tools on the server.
Docker's port rules bypass host firewalls like UFW, so a plain `3001:3001` would
be open to the internet. The public way in is Caddy.

`docker-compose.yml` joins the app to `web`, the external network Caddy's
compose declares. To run the app container locally too, create the network once
with `docker network create web` (`npm run db:up` doesn't need it).

## 1. Before the server

1. **Push the code.** The server deploys the `dev` branch from GitHub, so
   commit and push `dev`.
2. **DNS.** Add an `A` record `collect-am.orololuwa.dev` → the VPS's IPv4
   address (and an `AAAA` record if the VPS has IPv6), set up the same way as
   `orololuwa.dev`. Caddy gets a Let's Encrypt certificate for it; if the
   domain's DNS is on Cloudflare, keep the record **DNS only** (grey cloud), as
   for `orololuwa.dev`, so the certificate challenge reaches Caddy. `.dev` sites
   only work over HTTPS.
3. **Auth0** (Applications → CollectAm → Settings):
   - **Allowed Callback URLs:** add `https://collect-am.orololuwa.dev/auth/callback`
     (keep `http://localhost:3001/auth/callback` for local dev).
   - The passwordless email template is in [auth0/](./auth0/README.md).
4. **Stripe** (Developers → Webhooks), add endpoints:
   - `https://collect-am.orololuwa.dev/api/v1/stripe/webhooks` (billing).
     Its signing secret is `STRIPE_WEBHOOK_SECRET`.
   - `https://collect-am.orololuwa.dev/api/v1/stripe/webhooks/checkout`
     (checkout payments). Its signing secret is `STRIPE_WEBHOOK_SECRET_CHECKOUT`;
     without it the app falls back to `STRIPE_WEBHOOK_SECRET`.
5. **Paystack** (Settings → API Keys & Webhooks): set the webhook URL to
   `https://collect-am.orololuwa.dev/api/v1/paystack/webhooks/checkout`.

## 2. Server setup (once)

SSH into the VPS. You need Docker with the Compose plugin and git; Node is not
needed on the server.

```bash
docker compose version   # Docker Compose v2
git --version
```

If Docker is missing, install it from Docker's repository
(https://docs.docker.com/engine/install/ubuntu/), not the distro's `docker.io`
package, which lacks the Compose plugin.

Clone the app:

```bash
sudo mkdir -p /srv/collect-am
sudo chown "$USER": /srv/collect-am
git clone --branch dev https://github.com/Orololuwa/react-router-saas-template.git /srv/collect-am
cd /srv/collect-am
```

## 3. Configure `.env`

```bash
cd /srv/collect-am
cp .env.example .env
chmod 600 .env
```

Generate the secrets (run once per value and paste each into `.env`):

```bash
openssl rand -hex 32
```

Then edit `.env`:

| Variable | Value |
| --- | --- |
| `POSTGRES_USER` | `collectam` |
| `POSTGRES_PASSWORD` | a generated hex secret (hex keeps it URL-safe) |
| `POSTGRES_DB` | `collectam` |
| `POSTGRES_PORT` | `5433` |
| `DATABASE_URL` | `postgresql://collectam:<password>@localhost:5433/collectam` (for tools on the host; the container gets its own `db:5432` URL from compose) |
| `APP_URL` | `https://collect-am.orololuwa.dev` |
| `COOKIE_SECRET` | a generated secret |
| `HONEYPOT_SECRET` | a generated secret |
| `API_KEY_ENCRYPTION_KEY` | a generated secret. Optional (falls back to `COOKIE_SECRET`), but set it so rotating the cookie secret doesn't break stored API keys. Never change it once keys exist. |
| `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | from the Auth0 application |
| `CLOUDINARY_URL` | `cloudinary://<api_key>:<api_secret>@df1fw15ei` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend key and a sender on a verified domain |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | live Stripe keys (required) |
| `STRIPE_WEBHOOK_SECRET_CHECKOUT` | signing secret of the checkout webhook endpoint |
| `PAYSTACK_SECRET_KEY` | live Paystack key |
| `ALLOW_INDEXING` | `true` to let search engines index the site |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` | only if you send template emails through Mailgun |

Remove the mock values the example file comes with. `NODE_ENV` and `PORT` are
set by `docker-compose.yml`.

The `POSTGRES_*` values only take effect when the database volume is first
created. Set them before the first start; changing them later needs the role
changed inside Postgres too.

## 4. Bring over the Supabase data (once, optional)

Do this before the first start, while the database is empty:

```bash
cd /srv/collect-am
docker compose up -d --wait db
SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  ./scripts/migrate-supabase-db.sh
```

Use the session pooler (port 5432) or the direct connection, not the 6543
pooler. The script runs entirely in Docker. It dumps Supabase into `backups/`,
restores it, applies the Prisma migrations, repoints saved templates at the
Cloudinary logos, compares row counts, and lists the logos and avatars still on
Supabase Storage for you to move by hand.

Skip this for a fresh start: the first `docker compose up` creates an empty
schema.

## 5. Start the app

```bash
cd /srv/collect-am
docker compose up -d --build
```

This starts `db`, runs the one-off `migrate` service (`prisma migrate deploy`),
then starts `app`. The first build takes a few minutes (it installs Chromium for
PDF generation).

Check it:

```bash
docker compose ps -a                       # db healthy, migrate exited (0), app running/healthy
docker compose logs --tail=50 migrate app
curl -sI http://127.0.0.1:3001 | head -1   # HTTP/1.1 200 OK
```

## 6. Caddy

In Caddy's folder (the `proxy` compose project), add this block to its
`Caddyfile`, after `orololuwa.dev`:

```caddyfile
# ── CollectAm ──
collect-am.orololuwa.dev {
        encode zstd gzip
        reverse_proxy collect-am-app:3001
}
```

No `import cf_origin`: that Cloudflare origin certificate covers
`eleven-sports.app`, and `orololuwa.dev` subdomains get their own Let's Encrypt
certificate from Caddy, like `orololuwa.dev` does.

Then, from Caddy's folder:

```bash
docker compose exec caddy wget -qO- --spider http://collect-am-app:3001 && echo reachable
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

The `Caddyfile` is mounted as a single file. Some editors (vim, `sed -i`) save
by replacing the file, and the container then keeps seeing the old one; if
`validate` doesn't show your change, run `docker compose restart caddy` instead
of `reload`.

Caddy fetches the certificate on the first request; open
https://collect-am.orololuwa.dev and sign in. Ports 80 and 443 must be open
(`sudo ufw status`); Caddy needs 80 for the certificate challenge.

## Updating

```bash
cd /srv/collect-am
git pull
docker compose up -d --build
```

New migrations run automatically before the new app container starts. To roll
back, check out the previous commit and run the same `docker compose up -d
--build` (migrations are not rolled back; restore a backup if one changed data).

## Logs, restarts and backups

```bash
docker compose logs -f app        # follow the app's logs
docker compose restart app        # restart without rebuilding
docker compose down               # stop everything (keeps the data volume)
```

Never run `docker compose down -v` on the server: `-v` deletes the database
volume.

Back up the database (keeps the last 14 days):

```bash
cd /srv/collect-am && mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backups/collectam-$(date +%F).dump"
find backups -name 'collectam-*.dump' -mtime +14 -delete
```

To run it nightly, put those lines in a script and add it to `crontab -e`, e.g.
`0 3 * * * /srv/collect-am/backup.sh`. Copy the dumps off the server too
(Contabo snapshots or object storage); a backup on the same disk doesn't survive
losing the VPS.

Restore a dump:

```bash
docker compose exec -T db sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < backups/collectam-YYYY-MM-DD.dump
```

## Troubleshooting

- **`migrate` exits with an error:** `docker compose logs migrate`. The app
  won't start until migrations succeed.
- **App restarts in a loop with "Invalid environment variables":** a required
  variable is missing from `.env`; the log lists which.
- **502 from Caddy:** the app isn't up yet, crashed, or isn't on the `web`
  network. `docker compose ps` and `docker compose logs app`, then
  `docker network inspect web` should list both `collect-am-app` and Caddy's
  container.
- **"network web declared as external, but could not be found":** run
  `docker network create web`.
- **Auth0 "Callback URL mismatch":** add
  `https://collect-am.orololuwa.dev/auth/callback` to Allowed Callback URLs.
- **Certificate errors:** check DNS points at the VPS (`dig +short
  collect-am.orololuwa.dev`) and that port 80 is reachable, then
  `docker compose logs --tail=50 caddy` in Caddy's folder. With Cloudflare
  DNS, the record must be DNS only (grey cloud).
- **PDF generation fails:** look for Puppeteer errors in `docker compose logs
  app`; PDF rendering needs roughly 1 GB of free memory.
