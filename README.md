# 🛡️ GradeGuardian V2.0 — Cryptographic Grade Integrity Platform

> **Official Grade Management & Cryptographic Verification System**
> **Adopted for Academic Integrity at Alexandria University** 🎓
> *"Trust, but verify."*

---

## 📌 Executive Summary

**GradeGuardian V2.0** is an enterprise-grade academic grade management platform designed for professors, teaching assistants, and academic administrators. Built around the core principle of **tamper-proof academic integrity**, GradeGuardian uses **HMAC-SHA256 cryptographic hashing** to guarantee that student grade records cannot be altered, spoofed, or manipulated — even by database administrators or unauthorized system intruders.

This repository contains the **Master Backend API (Express/Node.js)** and the **Professor/TA Management Portal (Flutter)**.

### 🔗 Related Repositories & Ecosystem

* 👨‍🏫 **Professor & Master Backend Repository**: [GradeGuardian V2.0](https://github.com/L4S3r/GradeGuardianV2.0) *(This Repository)*
* 👨‍🎓 **Student Mobile & Web Portal**: [grade-guardian](https://github.com/L4S3r/grade-guardian) *(Alexandria University Student App)*

---

## 🏛️ Alexandria University Integration

GradeGuardian V2.0 has been structured to meet the high-security standards of **Alexandria University** (Faculty of Engineering & Computer Science).

### Key Objectives
1. **Zero-Tampering Guarantee**: Every grade entered by a professor or TA is immediately signed with an immutable HMAC-SHA256 cryptographic hash.
2. **Audit & Accountability**: Automatic audit logging tracks every grade creation, update, repair, and verification event — failures logged only (H-3 policy to prevent log flooding).
3. **Seamless Student Access**: Integrates directly with the [Alexandria University Student Portal](https://github.com/L4S3r/grade-guardian) so students can verify their grade authenticity in real-time.
4. **Resilient Cloud Architecture**: Backend deployed on **Vercel** (Node.js serverless) with connection pooling to **Supabase PostgreSQL**.

---

## 🔒 Cryptographic Security Architecture

GradeGuardian uses **HMAC-SHA256** to guarantee grade data integrity. The hash is built from a canonical normalized string:

```text
Normalized String = "grade_id|student_id|course_code|grade.0|letter_grade|YYYY-MM-DDTHH:MM:SS"
HMAC_Hash         = HMAC_SHA256(HMAC_SECRET, Normalized String)
```

| Step | What Happens |
|---|---|
| **Grade Submission** | System constructs the normalized string and stores `HMAC_SHA256(HMAC_SECRET, string)` alongside the grade. |
| **Tampering Detection** | On every read, the hash is recomputed. A single changed digit or timestamp triggers `is_verified: false`. |
| **Audit Logging** | Only `FAIL` events write to `audit_logs` (prevents DoS via log flooding). |
| **Repair** | `/repair/:gradeId` restores the grade from `original_grade` / `original_letter_grade` secure backups and recomputes the hash. |

### Defense-in-Depth Keys

Two separate HMAC keys are maintained for defense-in-depth:

| Key | Purpose |
|---|---|
| `HMAC_SECRET` | Dedicated key for grade integrity signatures (`computeHash`) |
| `SECRET_SALT` | Supplementary entropy key (legacy PBKDF2 fallback path) |
| `JWT_SECRET` | JWT token signing |
| `FACULTY_SECRET_KEY` | Second-factor gate for professor account registration |
| `ADMIN_KEY` | Second-factor gate for the admin rehash endpoint |

---

## 🏗️ System Architecture & Tech Stack

```text
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Professor / TA App          │       │      Student Grade App          │
│     (Flutter Cross-Platform)    │       │     (Flutter Mobile/Web)        │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 └──────────────────┬──────────────────────┘
                                    │ HTTPS / REST API
                                    ▼
                      ┌───────────────────────────┐
                      │  Express/Node.js Backend  │
                      │    (Vercel Serverless)    │
                      └─────────────┬─────────────┘
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │   Supabase PostgreSQL DB  │
                      │   (Transaction Pooler)    │
                      └───────────────────────────┘
```

### Backend Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 18+ |
| **Framework** | Express 4.x |
| **Database Driver** | `pg` (node-postgres) |
| **Authentication** | `jsonwebtoken` (JWT HS256) |
| **Password Hashing** | `bcrypt` (configurable rounds via `BCRYPT_ROUNDS`) |
| **Rate Limiting** | `express-rate-limit` |
| **Security Headers** | `helmet` |
| **CORS** | `cors` |
| **Deployment** | Vercel Serverless (`@vercel/node`) |

### Frontend Stack

| Layer | Technology |
|---|---|
| **Framework** | Flutter 3.x |
| **State Management** | Provider Pattern |
| **Charts** | FL Chart |
| **UI** | Shimmer, custom glassmorphism components |

---

## ✨ Features

### For Professors & Teaching Assistants
* 🔐 **Secure Auth** — JWT-based login, bcrypt password hashing, faculty key gate on registration.
* 📚 **Course Management** — Create and organize courses by code and department.
* 📝 **Grade Posting** — Submit single grades or upload batch records (up to 100 per request).
* 📊 **Analytics Dashboard** — Grade distributions (A–F) and per-course averages.
* 🛠️ **Integrity Repair** — One-click restore of tampered records from cryptographic backups.
* 📋 **Audit Logs** — View full tamper history per grade.

### For Students (via Student Portal)
* 🎓 **Registration & Login** — Personalized grade book via student ID.
* ✅ **Live Verification Badges** — Instant `VERIFIED` vs `TAMPERED` status on every grade.
* 📜 **Grade Audit Trail** — Chronological history of all integrity checks.
* 📦 **Batch Verification** — Server-side verification across all courses at once.

### 🎨 Premium UI/UX & Interactive Design

The Professor Web Portal has been overhauled with premium interaction and design patterns:
* 🫧 **Desktop Cursor Follower** — A custom, transparent tracking bubble with fluid damping/inertia animation that follows the mouse. Hovering over buttons, cards, or inputs dynamically expands the bubble with a theme-aware glow. Disabled on touch-first pointers.
* 🛡️ **Inline Validation System** — Complete custom field validation on blur (`onBlur`) for the registration forms. Warnings appear directly below the erroneous fields and clear dynamically on input (`onChange`), preventing native browser tooltip clutter.
* ⚡ **Optimistic UI Engine** — Creating or updating grades updates the lists instantly with a placeholder SHA256 computing status while syncing with the server in the background, rolling back automatically if the API call fails.
* ⏳ **Flicker-Free Skeletons** — A 300ms loading state delay avoids layout flicker on fast connections. If the request takes longer, content-specific shimmer skeletons display for statistics, courses, and security logs.
* 🖥️ **Custom Security Card** — Replaced native browser alerts with a custom status modal centered on the screen displaying verification stages, keys verification status, and environment variables validity.

---

## 🚀 Local Development Setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | `>= 18.0.0` |
| npm | `>= 9.0.0` |
| Flutter | `>= 3.19` |
| Supabase Account | — |

### 1. Clone the Repository

```bash
git clone https://github.com/L4S3r/GradeGuardianV2.0.git
cd GradeGuardianV2.0
```

### 2. Backend Setup

```bash
cd backend

# Install Node.js dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Edit `backend/.env` — **every key is required** (see [Environment Variables](#-environment-variables) below).

Start the development server with hot-reload:

```bash
npm run dev
```

Or start without hot-reload:

```bash
npm start
```

API is now live at `http://localhost:8000`.

### 3. Frontend Setup (Professor / TA App)

```bash
cd frontend

# Install Flutter packages
flutter pub get

# Run on your target platform
flutter run
```

---

## 🔑 Environment Variables

All environment variables live in `backend/.env`. Copy `backend/.env.example` as a starting point.

### Required — will crash at startup if missing

| Variable | Description | How to Generate |
|---|---|---|
| `SECRET_SALT` | Supplementary HMAC entropy key. **Never change after grades are created.** | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `HMAC_SECRET` | Dedicated key for grade integrity hashes. **Never change after grades are created.** | Same as above |
| `JWT_SECRET` | JWT signing secret. Changing this invalidates all active sessions. | Same as above |
| `FACULTY_SECRET_KEY` | Gate key for professor registration. Share only with authorized staff. | `node -e "console.log('GG-FACULTY-' + require('crypto').randomBytes(24).toString('base64url'))"` |
| `ADMIN_KEY` | Gate key for `/admin/rehash-grades`. | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | Supabase PostgreSQL connection string (port `6543` pooler). | Supabase Dashboard → Project Settings → Database → URI |

### Optional — have safe defaults

| Variable | Default | Description |
|---|---|---|
| `ENVIRONMENT` | `development` | Set to `production` on Vercel. Enforces all required secrets. |
| `ALLOWED_ORIGINS` | localhost origins | Comma-separated list of allowed CORS origins. |
| `JWT_EXPIRE_HOURS` | `24` | How long JWTs stay valid (hours). |
| `BCRYPT_ROUNDS` | `12` | bcrypt cost factor. Increase on faster hardware. |
| `PORT` | `8000` | Local dev port. Ignored by Vercel. |

> ⚠️ **Critical**: `SECRET_SALT` and `HMAC_SECRET` must **never change** after grade data exists. Changing either key will invalidate all existing HMAC hashes and trigger false tamper alerts on every grade.

---

## 🌐 Vercel Monorepo Deployment

Since both the **Express Backend API** and the **Professor Web Portal** reside in the same repository, they are deployed as **two separate projects** in your Vercel dashboard.

---

### 🖥️ Project 1: Express Backend API

This project hosts the API server that connects to Supabase and manages database encryption.

#### 1. Configuration Settings
* **Framework Preset**: Other (Detected automatically via `vercel.json` in the repository root)
* **Root Directory**: `.` (Repository root)
* **Build Command**: Leave default / empty
* **Output Directory**: Leave default / empty

#### 2. Set Environment Variables
In the Vercel Dashboard for the backend project (**Project Settings → Environment Variables**), add:
* `ENVIRONMENT`: `production`
* `DATABASE_URL`: *Your Supabase PostgreSQL Connection String*
* `HMAC_SECRET`: *Your Cryptographic HMAC Secret*
* `SECRET_SALT`: *Your Salt Value*
* `JWT_SECRET`: *Your JWT Secret Key*
* `FACULTY_SECRET_KEY`: *Your Faculty Gate Key*
* `ADMIN_KEY`: *Your Admin Rehash Gate Key*
* `ALLOWED_ORIGINS`: `https://your-professor-web-portal.vercel.app` *(The URL of Project 2)*

---

### 💻 Project 2: Professor Web Portal (React / Vite)

This project builds and hosts the static React administration dashboard.

#### 1. Configuration Settings
* **Framework Preset**: `Vite`
* **Root Directory**: `frontend/professor_grade_web`
* **Build Command**: `npm run build` (runs `tsc -b && vite build`)
* **Output Directory**: `dist`

#### 2. Set Environment Variables
In the Vercel Dashboard for the frontend project (**Project Settings → Environment Variables**), add:
* `VITE_API_URL`: `https://your-backend-api.vercel.app` *(The URL of Project 1)*

---

### 🚀 Deploying Updates
Every time you push changes to GitHub, Vercel will automatically detect changes in each directory and trigger hot-builds for both the backend and frontend projects.

---

## 🗄️ Database Management

The backend auto-runs schema migrations on every startup (`runMigrations()`). No manual SQL is needed for a fresh deployment.

### Reset / Purge Database

A utility script is included for wiping all tables (FK-safe order):

```bash
cd backend
node scripts/purge_db.js
```

This truncates `audit_logs → grades → courses → students → professors` and prints a row-count confirmation.

> ⚠️ This is **irreversible**. All data will be permanently deleted.

---

## 📖 API Endpoint Reference

### Auth (Public)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register professor account (requires `faculty_secret_key`) |
| `POST` | `/auth/login` | Authenticate professor, receive JWT |
| `POST` | `/student/register` | Register student account |
| `POST` | `/student/login` | Authenticate student, receive JWT |

### Professor Endpoints (Professor JWT Required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/professors/me` | Get authenticated professor profile |
| `GET` | `/courses` | List professor's courses |
| `POST` | `/courses` | Create a new course |
| `GET` | `/grades` | List grades (supports `?search=`, `?student_id=`, `?course_code=`) |
| `POST` | `/grades` | Submit a single grade record |
| `POST` | `/grades/batch` | Batch submit up to 100 grade records |
| `PUT` | `/grades/:id` | Update a grade (recomputes HMAC) |
| `POST` | `/repair/:id` | Restore tampered grade from secure backup |
| `GET` | `/grades/:id/logs` | Audit log for a specific grade |
| `POST` | `/verify/batch` | Batch HMAC verification (up to 100 IDs) |
| `GET` | `/audit-logs` | All audit events for professor's grades |
| `GET` | `/statistics/summary` | Grade distribution & average statistics |

### Admin Endpoints (Professor JWT + `X-Admin-Key` Header)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/admin/rehash-grades` | Recompute HMAC hashes for all professor's grades |

### Student Endpoints (Student JWT Required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/student/me` | Get authenticated student profile |
| `GET` | `/student/grades` | View own grades with live HMAC verification |
| `GET` | `/student/grades/:id/logs` | Audit log for a specific grade |
| `POST` | `/student/verify/batch` | Batch HMAC verification for own grades |

### Utility

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API health check |
| `GET` | `/health` | JSON health status with timestamp |

---

## 🔐 Rate Limits

| Endpoint Group | Limit |
|---|---|
| Global (all routes) | 100 req / min / IP |
| Auth (`/auth/*`, `/student/register`, `/student/login`) | 5 req / min / IP |
| Grade creation (`POST /grades`) | 30 req / min / IP |
| Batch operations | 20 req / min / IP |
| Admin endpoints | 5 req / min / IP |

---

## 📄 License & Academic Attribution

Designed and developed for **Alexandria University**.
*All rights reserved for academic integrity and official portal integration.*
