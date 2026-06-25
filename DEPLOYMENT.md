# Deploying LearnSmart on DigitalOcean

You have two options — **App Platform** (PaaS, zero-infra) or **Droplet** (VPS, full control). Both work without Docker.

## Prerequisites

- MongoDB Atlas cluster (or DO Managed MongoDB)
- OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys))
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com/apis/credentials))
- GitHub OAuth credentials ([github.com/settings/developers](https://github.com/settings/developers))
- A domain (optional but recommended for OAuth / SSL)

---

## Option 1: DigitalOcean App Platform (Simpler)

Create a **single DO App** with three components in this order:

### Component 1: Static Site (Client)

| Setting | Value |
|---|---|
| **Source** | GitHub repo, branch `main`, path `/client` |
| **Build Command** | `npm install && npm run build` |
| **Output Dir** | `dist` |
| **HTTP Routes** | `/*` → `/` |
| **Catch-all** | Yes — redirect all 404s to `/index.html` |

No env vars needed for the client.

### Component 2: Node.js Service (Server)

| Setting | Value |
|---|---|
| **Source** | GitHub repo, branch `main`, path `/server` |
| **Build Command** | `npm install && npx playwright install chromium` |
| **Run Command** | `node src/app.js` |
| **HTTP Port** | `5000` |
| **Routes** | `/api/*` → this component |
| **Health Check** | `/api/health` |

**Env vars** (all required):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `ACCESS_TOKEN_SECRET` | Generate: `openssl rand -hex 64` |
| `ACCESS_TOKEN_EXPIRY` | `15m` |
| `REFRESH_TOKEN_EXPIRY_DAYS` | `7` |
| `CLIENT_URL` | `https://<your-app>.ondigitalocean.app` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://<your-app>/api/auth/google/callback` |
| `GITHUB_CLIENT_ID` | From GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth App |
| `GITHUB_CALLBACK_URL` | `https://<your-app>/api/auth/github/callback` |
| `OPENROUTER_API_KEY` | From OpenRouter |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | `nvidia/nemotron-3-super-120b-a12b:free` |
| `OPENROUTER_EMBEDDING_MODEL` | `nvidia/llama-nemotron-embed-vl-1b-v2:free` |
| `ML_SERVICE_URL` | See Component 3 below |
| `UPLOAD_MAX_SIZE_MB` | `50` |

> **Playwright note:** The `postinstall` hook in `package.json` runs `npx playwright install chromium`. This adds ~300MB to the build and takes 30–60s. Ensure the build timeout in DO is at least 5 minutes.

### Component 3: Python Service (ML Service)

| Setting | Value |
|---|---|
| **Source** | GitHub repo, branch `main`, path `/ml-service` |
| **Build Command** | `pip install -r requirements.txt` |
| **Run Command** | `uvicorn main:app --host 0.0.0.0 --port 8000` |
| **HTTP Port** | `8000` |
| **Routes** | `/api/v1/*` → this component |
| **Health Check** | `/api/v1/health` |

**Env vars:**

| Variable | Value |
|---|---|
| `ML_SERVICE_PORT` | `8000` |

Then set the server's `ML_SERVICE_URL` to the internal URL DO gives this component (e.g. `http://learnsmart-ml:8000` or the component's `.ondigitalocean.app` URL).

### Connecting Components in DO

1. After creating all 3 components, go to **Settings → Routes** in your DO App
2. Make sure the routing order is: static site catches `/*`, API routes go to the Node service and Python service
3. Set the server's `CLIENT_URL` to your app's public URL
4. Set the server's `ML_SERVICE_URL` to the ml-service's internal DO URL

---

## Option 2: DigitalOcean Droplet (Full Control)

### 1. Provision a Droplet

- **OS:** Ubuntu 24.04 LTS
- **Plan:** Basic — $12/mo or higher (2GB RAM minimum)
- Add your SSH key

### 2. Install Dependencies

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Python 3.11
sudo apt-get install -y python3.11 python3.11-venv python3-pip

# Nginx
sudo apt-get install -y nginx

# PM2 (process manager for Node.js)
sudo npm install -g pm2

# Chromium for Playwright
npx playwright install chromium

# Certbot (SSL)
sudo apt-get install -y certbot python3-certbot-nginx
```

### 3. Clone & Set Up

```bash
mkdir -p /var/www/learnsmart
git clone <your-repo-url> /var/www/learnsmart
```

#### Server

```bash
cd /var/www/learnsmart/server
cp .env.example .env
nano .env      # Fill in all variables
npm install
npx playwright install chromium
```

#### ML Service

```bash
cd /var/www/learnsmart/ml-service
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Client

```bash
cd /var/www/learnsmart/client
npm install
npm run build    # Output goes to client/dist/
```

### 4. Configure Nginx

```bash
sudo cp /var/www/learnsmart/server/nginx-example.conf /etc/nginx/sites-available/learnsmart
sudo nano /etc/nginx/sites-available/learnsmart
# Edit server_name and SSL cert paths
sudo ln -sf /etc/nginx/sites-available/learnsmart /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 5. SSL with Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
```

### 6. Start Services with PM2

```bash
# Server
cd /var/www/learnsmart/server
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# ML Service (as a background process)
cd /var/www/learnsmart/ml-service
source venv/bin/activate
pm2 start --name learnsmart-ml "uvicorn main:app --host 127.0.0.1 --port 8000"
pm2 save
```

### 7. Verify

- `curl http://localhost:5000/api/health` → `{"status":"ok",...}`
- `curl http://localhost:8000/api/v1/health` → `{"status":"ok",...}`
- `curl https://your-domain.com/api/health` → `{"status":"ok",...}`
- Open `https://your-domain.com` in a browser

---

## Environment Variables Reference

All server env vars are validated at startup via Zod. Missing or invalid values will show descriptive errors and exit immediately.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `production`, `development`, or `test` |
| `PORT` | No | `5000` | HTTP port |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | **Yes** | — | JWT signing key (min 32 chars) |
| `ML_SERVICE_URL` | No | `http://localhost:8000` | URL of the Python ML service |
| `CLIENT_URL` | No | `http://localhost:5173` | CORS origin for the client |

See `server/.env.example` for the full list.

---

## Data Persistence

| Data | Storage | Backup |
|---|---|---|
| Users, projects, analysis cache | MongoDB Atlas (cloud) | Automatic |
| Vector embeddings (ChromaDB) | `chroma_data/chroma.sqlite3` on disk | Back up the `chroma_data/` directory |
| Uploaded ZIP files | `server/uploads/` on disk | Not critical — re-upload on restart |
| Server logs | `server/logs/` (with PM2) | Optional |

For Droplet deployments, add a cron job for ChromaDB backups:

```bash
0 3 * * * tar czf /backups/chroma-$(date +\%Y\%m\%d).tar.gz /var/www/learnsmart/chroma_data/
```

---

## Updating

### App Platform

Push to your GitHub repo's main branch → DO auto-deploys.

### Droplet

```bash
cd /var/www/learnsmart
git pull
cd server && npm install && pm2 restart learnsmart-server
cd ../ml-service && source venv/bin/activate && pip install -r requirements.txt && pm2 restart learnsmart-ml
cd ../client && npm install && npm run build
```
