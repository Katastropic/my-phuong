# Running the site

There are two parts:

- **Frontend**: the Angular app in `src/`. Built into plain files in `dist/my-phuong/browser/`.
- **Backend**: the API in `server/` (Node + Hono + SQLite). Handles slots, bookings and staff login.
  It reuses the slot rules in `src/app/time.ts` and `src/app/salon.config.ts`, so the times the page
  offers and the times the server accepts can never disagree.

In production, **nginx** sits in front of both:

```
browser ──► nginx :80/:443 ─┬─ /api/*  ──► Node API on 127.0.0.1:3000 ──► bookings.db (SQLite)
                            └─ else    ──► files in /var/www/my-phuong
```

## 1. Day-to-day development (no nginx)

```bash
cp .env.example .env      # once; then set ADMIN_PASSWORD
npm run server            # terminal 1: API on :3000, restarts when you edit server/
npm start                 # terminal 2: Angular on :4200, forwards /api to :3000 (proxy.conf.json)
```

Open http://localhost:4200. Staff page: http://localhost:4200/admin.

Tests: `npm test` (frontend) and `npm run test:server` (API).

## 2. Practise with nginx locally (WSL / Ubuntu)

This is the same setup the VPS will use, so it's the best place to learn it.

```bash
# Install nginx and stop Ubuntu's welcome page from grabbing port 80.
sudo apt update && sudo apt install -y nginx
sudo rm /etc/nginx/sites-enabled/default

# Build both parts.
npm run build
npm run build:server

# Put the frontend where nginx expects it.
sudo mkdir -p /var/www/my-phuong
sudo cp -r dist/my-phuong/browser/. /var/www/my-phuong/

# Install the site config, check it, load it.
sudo cp deploy/nginx/my-phuong.conf /etc/nginx/sites-available/my-phuong
sudo ln -s /etc/nginx/sites-available/my-phuong /etc/nginx/sites-enabled/
sudo nginx -t                    # always run this before reloading: it catches typos
sudo service nginx reload        # on WSL; on a normal server: sudo systemctl reload nginx

# Start the API. INSECURE_COOKIES=1 lets the login cookie work over plain http://localhost.
NODE_ENV=production INSECURE_COOKIES=1 node --env-file=.env dist/server/main.mjs
```

Open http://localhost (no port number). nginx is now doing the work.

Things to try while you learn:

| Try | What it shows |
|---|---|
| `curl -i http://localhost/api/health` | A request going through nginx to Node |
| `curl -i http://localhost/book` | `try_files` returning index.html for an Angular route |
| `curl -I http://localhost/main-*.js` (use the real name) | The 1-year cache header on hashed files |
| Stop the API, reload the site | nginx answers **502 Bad Gateway**: it's up but the backend isn't |
| Wrong admin password 7 times quickly | The rate limit kicks in with **429** (1 + a burst of 5 allowed) |
| `sudo tail -f /var/log/nginx/access.log` | Every request nginx handles |
| `sudo tail -f /var/log/nginx/error.log` | Where to look when something's wrong |

After changing the frontend: `npm run build`, then copy `dist/my-phuong/browser/.` into
`/var/www/my-phuong/` again. No nginx reload is needed for file changes, only for config changes.

## 3. On the VPS

Same as step 2, plus:

1. **A user for the app**: `sudo useradd --system --no-create-home myphuong`
2. **App files**: copy `dist/server/main.mjs` to `/opt/my-phuong/server/main.mjs`.
   It's a single bundled file; the server only needs Node 24, not `node_modules`.
3. **Secrets** in `/etc/my-phuong.env` (owned by root, `chmod 600`):
   ```
   ADMIN_PASSWORD=a-long-password
   SESSION_SECRET=<output of: openssl rand -hex 32>
   ```
4. **systemd** keeps the API running: see `deploy/systemd/my-phuong.service` for the commands.
5. **Domain + HTTPS**: point the domain's A record at the server, set `server_name` in the nginx
   config, then `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.
   Don't set `INSECURE_COOKIES` on the real server.
6. **Backups**: the whole database is `/var/lib/my-phuong/bookings.db`. Copy it somewhere else
   every night with `sqlite3 /var/lib/my-phuong/bookings.db ".backup /path/to/backup.db"`,
   which is safe to run while the site is live.
