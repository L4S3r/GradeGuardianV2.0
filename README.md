# 🛡️ GradeGuardian V2.0 — Cryptographic Grade Integrity Platform

> **Official Grade Management & Cryptographic Verification System**  
> **Adopted for Academic Integrity at Alexandria University** 🎓  
> *"Trust, but verify."*

---

## 📌 Executive Summary

**GradeGuardian V2.0** is an enterprise-grade academic grade management platform designed for professors, teaching assistants, and academic administrators. Built around the core principle of **tamper-proof academic integrity**, GradeGuardian uses **HMAC-SHA256 cryptographic hashing** with a secret salt to guarantee that student grade records cannot be altered, spoofed, or manipulated — even by database administrators or unauthorized system intruders.

This repository contains the **Master Backend API (FastAPI)** and the **Professor/TA Management Portal (Flutter)**.

### 🔗 Related Repositories & Ecosystem

* 👨‍🏫 **Professor & Master Backend Repository**: [GradeGuardian V2.0](https://github.com/L4S3r/GradeGuardianV2.0) *(This Repository)*
* 👨‍🎓 **Student Mobile & Web Portal**: [grade-guardian](https://github.com/L4S3r/grade-guardian) *(Alexandria University Student App)*

---

## 🏛️ Alexandria University Integration

GradeGuardian V2.0 has been structured to meet the high-security standards of **Alexandria University** (Faculty of Engineering & Computer Science). 

### Key Objectives for Alexandria University:
1. **Zero-Tampering Guarantee**: Every grade entered by a professor or TA is immediately hashed with an immutable cryptographic signature.
2. **Audit & Accountability**: Automatic audit logging tracks every grade creation, update, repair, and verification event.
3. **Seamless Student Access**: Integrates directly with the [Alexandria University Student Portal](https://github.com/L4S3r/grade-guardian) so students can inspect their grades and verify authenticity in real-time.
4. **Resilient Cloud Architecture**: Backend deployed on **Vercel** with connection pooling to **Supabase PostgreSQL**.

---

## 🔒 Cryptographic Security Architecture

GradeGuardian uses **HMAC-SHA256** hashing to guarantee data integrity:

```text
Normalized String = "grade_id|student_id|course_code|grade|letter_grade|ISO_timestamp"
HMAC_Hash         = HMAC_SHA256(SECRET_SALT, Normalized String)
```

1. **Grade Submission**: When a professor submits or updates a grade, the system constructs a canonical normalized data string and computes `HMAC_SHA256(SECRET_SALT, Normalized String)`.
2. **Tampering Detection**: Whenever a grade is retrieved or audited, the system recomputes the HMAC signature. If a single digit or timestamp was changed directly in the database, the hash mismatch is flagged immediately as **FAIL (Tampered)**.
3. **Audit Log & Repair**: Provides automated audit logs (`audit_logs`) and an administrative endpoint (`/repair/{grade_id}`) to restore grades from secure backup values.

---

## 🏗️ System Architecture & Tech Stack

```text
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Professor / TA App          │       │      Student Grade App          │
│     (Flutter Cross-Platform)    │       │     (Flutter Mobile/Web)        │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 └──────────────────┬──────────────────────┘
                                    │ HTTP / REST API
                                    ▼
                      ┌───────────────────────────┐
                      │   Unified FastAPI Backend │
                      │     (Vercel Serverless)   │
                      └─────────────┬─────────────┘
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │   Supabase PostgreSQL DB  │
                      │   (Transaction Pooler)    │
                      └───────────────────────────┘
```

* **Backend Engine**: FastAPI (Python 3.10+), SQLAlchemy 2.0, Pydantic v2, PyJWT, SlowAPI rate limiting.
* **Database**: Supabase PostgreSQL (Production) / SQLite (`grades.db` for local development).
* **Frontend App**: Flutter 3.x (Provider Pattern, HTTP SSL Security, FL Chart, Shimmer UI).
* **Deployment**: Vercel Serverless Functions (`@vercel/python`).

---

## ✨ Features

### For Professors & Teaching Assistants
* 🔐 **Secure Auth**: JWT-based login and PBKDF2 / Bcrypt password security.
* 📚 **Course Management**: Create and organize courses by course code and department.
* 📝 **Grade Posting**: Submit single grades or upload batch grade records for a class.
* 📊 **Analytics Dashboard**: View class grade distributions (A, B, C, D, F) and GPA averages.
* 🛠️ **Integrity Repair**: One-click repair tool to restore tampered records to verified originals.

### For Students (via Student Portal)
* 🎓 **Student Registration & Login**: Access personalized grade books using student ID numbers.
* ✅ **Live Verification Badges**: Instant cryptographic verification (`VERIFIED` vs `TAMPERED`).
* 📜 **Grade Audit Logs**: View chronological history of grade verification checks.
* 📦 **Batch Verification**: Run server-side verification across multiple courses at once.

---

## 🚀 Environment & Setup Guide

### 1. Prerequisites
* **Python**: `3.10` or higher
* **Flutter**: `3.19` or higher
* **Database**: Supabase PostgreSQL account (or local SQLite)

### 2. Backend Local Setup

```bash
# Clone repository
git clone https://github.com/L4S3r/GradeGuardianV2.0.git
cd GradeGuardianV2.0/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment Variables
cp .env.example .env
```

Edit your `backend/.env` file (refer to `.env.example`):
```env
SECRET_SALT=your_generated_secret_salt_here
JWT_SECRET=your_generated_jwt_secret_here

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your_supabase_key_here

# PostgreSQL (Supabase Pooler) or leave commented for local SQLite:
DATABASE_URL=postgresql://postgres.your-ref:[YOUR-PASSWORD]@aws-0-[your-region].pooler.supabase.com:6543/postgres?sslmode=require
```

Run the backend server:
```bash
uvicorn backend_main:app --reload --port 8000
```
Open Swagger Documentation: `http://localhost:8000/docs`

---

### 3. Frontend App Setup (Professor / TA App)

```bash
cd GradeGuardianV2.0/frontend/v2

# Install Flutter packages
flutter pub get

# Run application
flutter run
```

---

## 🌐 Deployment to Vercel & Supabase

### 1. Supabase Database Configuration
1. Go to **Supabase Dashboard** $\rightarrow$ **Project Settings** $\rightarrow$ **Database**.
2. Copy your **Transaction Pooler Connection String** (Port `6543`).

### 2. Vercel Environment Variables
Add the following keys in your Vercel Project Settings (refer to `backend/.env.example`):
- `DATABASE_URL`: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`
- `SECRET_SALT`: *(Your generated 64-char hex salt)*
- `JWT_SECRET`: *(Your generated 64-char hex JWT secret)*
- `SUPABASE_URL`: `https://your-project-ref.supabase.co`
- `SUPABASE_KEY`: *(Your Supabase publishable/service key)*
- `ENVIRONMENT`: `production`
- `ALLOWED_ORIGINS`: `*`

Deploy using Vercel CLI or GitHub push:
```bash
vercel --prod
```

---

## 📖 API Endpoint Specification

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register new professor account |
| `POST` | `/auth/login` | Public | Authenticate professor and receive JWT |
| `POST` | `/student/register` | Public | Register student account |
| `POST` | `/student/login` | Public | Authenticate student and receive JWT |
| `GET` | `/student/grades` | Student JWT | Retrieve logged-in student's grades with HMAC check |
| `GET` | `/student/grades/{id}/logs` | Student JWT | Audit log trail for specific grade |
| `GET` | `/courses` | Professor JWT | List professor's courses |
| `POST` | `/courses` | Professor JWT | Create new course |
| `GET` | `/grades` | Professor JWT | List all grades for professor's courses |
| `POST` | `/grades` | Professor JWT | Create student grade record |
| `POST` | `/grades/batch` | Professor JWT | Batch submit grades for a class |
| `PUT` | `/grades/{id}` | Professor JWT | Update grade record |
| `POST` | `/repair/{id}` | Professor JWT | Restore tampered grade record to original |
| `POST` | `/verify/batch` | Public / Auth | Run batch cryptographic verification |
| `GET` | `/statistics/summary` | Professor JWT | GPA and grade distribution statistics |

---

## 📄 License & Academic Attribution

Designed and developed for **Alexandria University**.  
*All rights reserved for academic integrity and official portal integration.*
