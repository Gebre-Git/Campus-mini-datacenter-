# 🏛️ Campus Mini-Cloud

A LAN-based private cloud storage system. One Ubuntu laptop acts as the server — other devices on the same WiFi visit `http://<server-ip>:3000` and get a full encrypted file storage system in the browser.

## Features

- 🔐 **Encrypted at rest** — files are AES-256-GCM encrypted with a key derived from the user's password (scrypt). The server admin cannot read file contents.
- 📦 **Per-user quota** — 500 MB default, enforced server-side.
- 👤 **JWT authentication** — 24h sessions.
- 🛡 **Admin panel** — view all file metadata and user quota usage (no file contents).
- 📱 **Works from any device** — phones, tablets, laptops on the same WiFi.

---

## Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Run Prisma Migration (creates the SQLite database)

```bash
cd backend
npx prisma migrate dev --name init
```

### 3. Build the Frontend

```bash
cd frontend
npm install
npm run build
```

### 4. Start the Server

```bash
cd backend
npm start
```

The server will print your LAN URL on startup:

```
🚀 Campus Mini-Cloud Server started
   Local:   http://localhost:3000
   LAN:     http://192.168.1.42:3000   ← share this with other devices
```

---

## Finding the Server's LAN IP (Ubuntu)

If the startup log doesn't show the right IP, run:

```bash
hostname -I
# or
ip addr show
```

Look for the `192.168.x.x` or `10.x.x.x` address on your WiFi interface.

---

## Opening the Firewall (Ubuntu UFW)

```bash
sudo ufw allow 3000
sudo ufw status
```

---

## Accessing from Other Devices

All devices must be on **the same WiFi network** as the server.

Open a browser on any device and go to:

```
http://<your-LAN-IP>:3000
```

Example: `http://192.168.1.42:3000`

---

## Creating the First Admin User

After registering a user, flag it as admin in the SQLite database:

### Option A — SQLite CLI

```bash
cd backend
npx prisma db execute --stdin <<'EOF'
UPDATE User SET isAdmin = 1 WHERE username = 'yourAdminUsername';
EOF
```

### Option B — Prisma Studio (visual GUI)

```bash
cd backend
npx prisma studio
```

Open `http://localhost:5555`, click the **User** table, find your user, and toggle `isAdmin` to `true`.

### Option C — One-line script

Create `backend/scripts/make-admin.js`:

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.update({
  where: { username: process.argv[2] },
  data: { isAdmin: true },
}).then(() => { console.log('Done!'); process.exit(0); });
```

Then run:

```bash
cd backend
node scripts/make-admin.js yourAdminUsername
```

---

## Development Mode (with hot reload)

Run backend and frontend separately:

```bash
# Terminal 1 — backend (auto-restarts on changes)
cd backend
npm run dev

# Terminal 2 — frontend dev server (proxies /api to backend:3000)
cd frontend
npm run dev
```

Then open `http://localhost:5173` (Vite dev server).

---

## Architecture Summary

```
Browser (any device on LAN)
    │
    │  HTTP  →  http://<server-ip>:3000
    ▼
Express Server (Node.js)
    ├── /api/register, /api/login        → Auth (bcrypt + JWT)
    ├── /api/files/*                     → Upload/Download/Delete (AES-256-GCM)
    ├── /api/admin/*                     → Admin metadata views
    └── /                               → React frontend (served as static files)
    │
    ├── SQLite (Prisma)                  → User accounts + file metadata
    └── /storage/<userId>/<fileId>       → Encrypted file blobs (AES-256-GCM)
```

### Encryption Details

- Key derivation: `scrypt(password, username, 32)` → 32-byte key
- Encryption: AES-256-GCM, random 16-byte IV per file
- On-disk format: `[16 bytes IV][16 bytes auth tag][ciphertext]`
- Session keys held **in memory only** — server restart requires re-login (by design)

---

## Environment Variables (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Path to SQLite database |
| `JWT_SECRET` | (see .env) | Secret for signing JWTs — **change this!** |
| `PORT` | `3000` | Port the server listens on |

---

## Optional: Static IP on Ubuntu

For a stable LAN IP, set a DHCP reservation for the server's MAC address in your router admin panel, or assign a static IP in Ubuntu's network settings.

You can also install `avahi-daemon` for mDNS access:

```bash
sudo apt install avahi-daemon
```

Then devices can access the server as `http://hostname.local:3000`.
