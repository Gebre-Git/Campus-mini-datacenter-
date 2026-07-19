# Project: Campus Mini-Cloud (Datacenter Simulation — Software Layer)

## 1. Project Summary
A LAN-based private cloud storage system. One computer (Ubuntu Linux laptop) acts as
the server ("datacenter"). Other devices on the same WiFi network (phones, laptops)
connect via a web browser to register, log in, and upload/download files to a
personal, encrypted, quota-limited storage space.

This is Phase 1 (real, working software system). Phase 2 (later) is a simulated
visualization of what a real hardware datacenter (GPU/TPU cluster) would look like
and how it would benefit the college — built separately, not part of this backend.

## 2. Goals
- Multiple real devices on the same WiFi can access the system via browser
- Each user has an authenticated account
- Each user has a private, encrypted storage quota (e.g. 100MB–500MB, configurable)
- Files are encrypted at rest; server admin cannot read file contents without the
  user's password
- Admin (project owner) can view metadata of all files (filename, size, owner,
  upload date) — never file contents
- System runs entirely on local hardware, no cloud/internet dependency required

## 3. Tech Stack
| Layer          | Choice                                   | Reason |
|----------------|-------------------------------------------|--------|
| OS (server)    | Ubuntu Linux (existing laptop)             | Already available |
| Backend        | Node.js + Express                          | Cross-platform, async, huge ecosystem |
| Database       | SQLite (via Prisma ORM)                    | Single file, zero config, easy to inspect |
| Auth           | bcrypt (password hashing) + JWT (sessions) | Standard, well-supported, simple |
| Encryption     | AES-256-GCM (Node `crypto` built-in)       | No extra dependency, strong standard |
| Key derivation | scrypt, derived from user's login password | No separate key to manage |
| Frontend       | React                                      | Polished UI, component reuse across pages |
| File transfer  | Multer (multipart form upload handling)    | Standard Express file upload middleware |
| Networking     | LAN only, static/reserved IP or mDNS (.local) | No tunneling/port-forwarding needed |

## 4. High-Level Architecture

```
[Student Phone/Laptop Browser]  [Student Phone/Laptop Browser]  [Your Phone Browser]
            |                              |                            |
            |----------------- Same WiFi Network -----------------------|
                                    |
                          http://<server-ip>:PORT
                                    |
                      +---------------------------+
                      |     Ubuntu Server (Node)    |
                      |  ------------------------  |
                      |  Express API Server        |
                      |   - Auth routes            |
                      |   - Upload/Download routes |
                      |   - Admin routes           |
                      |  ------------------------  |
                      |  Encryption Layer          |
                      |   - AES-256-GCM per file   |
                      |   - Key via scrypt(pwd)    |
                      |  ------------------------  |
                      |  SQLite DB (via Prisma)    |
                      |   - users                  |
                      |   - files (metadata)       |
                      |  ------------------------  |
                      |  Disk Storage              |
                      |   - /storage/<user_id>/    |
                      |     (encrypted blobs)      |
                      +---------------------------+
```

## 5. Data Flow

### Registration
1. Client submits username + password (React form → POST /api/register)
2. Server hashes password with bcrypt, stores user record in SQLite
3. Server does NOT store the raw password or raw encryption key anywhere

### Login
1. Client submits username + password (POST /api/login)
2. Server verifies bcrypt hash
3. Server issues a JWT session token to the client
4. Client stores token (memory or localStorage) and sends it on every future request

### File Upload
1. Client sends file (multipart/form-data) + JWT token (POST /api/files/upload)
2. Server verifies JWT, identifies user
3. Server checks: (current usage + new file size) <= user's quota → reject if exceeded
4. Server derives encryption key: scrypt(user's password-derived secret, salt)
   - Note: since the server never stores the raw password, the actual key material
     is derived at login time and kept in the active session server-side (in memory,
     tied to the session) — NOT persisted to disk. Implementation detail to finalize
     with the coding agent.
5. Server encrypts file with AES-256-GCM, writes encrypted blob to
   /storage/<user_id>/<file_id>
6. Server stores file metadata (filename, size, upload date, user_id) in SQLite
   (metadata is NOT encrypted — only file contents are)

### File Download
1. Client requests file by ID + JWT token (GET /api/files/:id)
2. Server verifies JWT, verifies file belongs to requesting user
3. Server decrypts file using session key, streams decrypted content back
4. Browser downloads/displays file

### Admin View
1. Admin-flagged user logs in, hits GET /api/admin/files
2. Server checks user.isAdmin === true
3. Server returns list of ALL files' metadata across all users (no content, no
   decryption)

## 6. Database Schema (SQLite via Prisma — draft)

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  isAdmin      Boolean  @default(false)
  quotaBytes   BigInt   @default(524288000) // 500MB default
  usedBytes    BigInt   @default(0)
  createdAt    DateTime @default(now())
  files        File[]
}

model File {
  id           String   @id @default(uuid())
  filename     String
  sizeBytes    BigInt
  storagePath  String
  uploadedAt   DateTime @default(now())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
}
```

## 7. API Endpoints (draft)

| Method | Route                  | Auth required | Purpose |
|--------|-------------------------|---------------|---------|
| POST   | /api/register            | No            | Create new user account |
| POST   | /api/login                | No            | Authenticate, receive JWT |
| GET    | /api/files                | Yes           | List current user's files |
| POST   | /api/files/upload         | Yes           | Upload + encrypt a file |
| GET    | /api/files/:id            | Yes           | Download + decrypt a file |
| DELETE | /api/files/:id            | Yes           | Delete a file, free quota |
| GET    | /api/user/me               | Yes           | Get current user info + quota usage |
| GET    | /api/admin/files           | Yes (admin)   | List all files metadata (admin only) |
| GET    | /api/admin/users           | Yes (admin)   | List all users + quota usage (admin only) |

## 8. Networking Setup (LAN)
- Server runs on a fixed local IP (DHCP reservation on router, or static IP config
  on Ubuntu)
- Optional: install `avahi-daemon` on Ubuntu to allow access via
  `http://<hostname>.local:PORT` instead of raw IP
- Ubuntu firewall (ufw) must allow inbound traffic on chosen port (e.g. `sudo ufw
  allow 3000`)
- All client devices must be on the same WiFi network/subnet as the server

## 9. Security Notes
- Passwords never stored in plaintext (bcrypt hash only)
- File contents encrypted at rest — server admin cannot read files, only metadata
- JWT tokens should have reasonable expiry (e.g. 24h) and be sent via Authorization
  header
- Quota enforced server-side (not just UI) to prevent bypass
- Input validation on all routes (filename sanitization, size limits) to prevent
  path traversal or storage abuse

## 10. Out of Scope (Phase 1)
- Internet-facing access (tunneling, port forwarding, DNS) — LAN only
- GPU/TPU compute simulation — this is Phase 2, a separate visualization/demo
  component, not part of this backend
- Multi-server / distributed storage — single server only for this project

## 11. Open Items for Implementation (for coding agent)
- Decide exact session key handling strategy (in-memory per session vs re-derive
  per request) — needs care since Node process restarts would lose in-memory keys
- Decide max file size per upload
- Decide default quota per user and whether it's configurable per-user by admin
- Frontend routing structure (React Router pages: Login, Register, Dashboard,
  Admin)
