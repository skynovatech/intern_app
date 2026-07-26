<p align="center">
  <img src="frontend/public/logo.png" alt="Skynova Tech Solutions" width="200"/>
</p>

# Skynova Tech Solutions — Internship Applicant Tracking System

A full-stack recruitment portal for managing internship applications. Built with React/TypeScript and Python/FastAPI, featuring a public multi-step application form, admin HR dashboard, email notifications (Brevo SMTP), and WhatsApp messaging (Evolution API).

---

## Features

### Applicant Side
- **8-step application form** — Personal info, education, skills, portfolio, experience, documents, preferences, review
- **File uploads** — Resume (PDF) and photo with live preview
- **Real-time validation** — Zod schemas with inline error messages
- **Mobile-responsive** — Works on all screen sizes

### Admin Dashboard
- **Overview** — Stats cards, charts, recent applications
- **Application management** — Table with search, sort, filter, pagination, CSV export
- **Application detail** — Full profile view, photo, resume preview, status timeline, interviews
- **Analytics** — Domain/gender/college distribution, daily trend, funnel chart
- **Internship domains** — Web Development, Mobile Development, Data Science, AI/ML, Cloud, Cybersecurity, DevOps, UI/UX, Digital Marketing, Social Media Marketing, Graphic Design, Video Editing, and more
- **Status workflow** — Pending → Reviewed → Shortlisted → Interview → Selected/Rejected
- **Email templates** — Create/edit/toggle reusable email templates
- **WhatsApp templates** — Create/edit/toggle reusable WhatsApp templates
- **Manual messaging** — Send email/WhatsApp directly from application detail page

### Notifications
- **Email** — Auto-sent on status change, interview schedule; manual send from detail page
- **WhatsApp** — Auto-sent on status change, interview schedule; manual send from detail page
- **Templates** — Reusable email and WhatsApp templates with variable placeholders

### WhatsApp (Evolution API)
- **Self-hosted** — Free, Baileys-based, runs in Docker
- **Connection management** — Create instance, scan QR, check status, reconnect, logout, delete
- **Admin page** — Visual QR code scanner, connection status, instance lifecycle

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS v4, shadcn/ui, Zustand, React Hook Form, Zod, Recharts |
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 |
| Database | PostgreSQL 16 (Docker) |
| WhatsApp | Evolution API (self-hosted via Docker) |
| Email | Zoho SMTP (smtplib) |
| Auth | JWT (python-jose) + bcrypt |

---

## Project Structure

```
intern_app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry, CORS, upload endpoint
│   │   ├── config.py            # Pydantic settings (SMTP, Evolution, DB)
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── models/              # 7 SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas (auth, application, status, dashboard, communication)
│   │   ├── routers/
│   │   │   ├── auth.py          # POST /login, GET /me
│   │   │   ├── applications.py  # CRUD + file upload
│   │   │   ├── status.py        # Status changes + interviews + auto notifications
│   │   │   ├── dashboard.py     # Stats + analytics
│   │   │   └── communication.py # Email/WhatsApp send, templates, Evolution API management
│   │   ├── services/
│   │   │   ├── email_service.py       # Zoho SMTP via smtplib
│   │   │   └── whatsapp_service.py    # Evolution API client
│   │   └── utils/
│   │       ├── security.py      # bcrypt + JWT
│   │       └── dependencies.py  # get_current_admin
│   ├── alembic/                 # Database migrations
│   ├── uploads/                 # Uploaded resumes and photos
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/               # 9 pages (Dashboard, Applications, Detail, Analytics, Apply, Login, Templates, WhatsApp, NotFound)
│   │   ├── components/
│   │   │   ├── layout/          # AdminLayout, Sidebar
│   │   │   ├── dashboard/       # StatsCards, charts
│   │   │   ├── application-form/ # 8-step wizard
│   │   │   └── ui/              # shadcn/ui primitives
│   │   ├── stores/              # Zustand (authStore, appStore)
│   │   ├── types/               # TypeScript types
│   │   └── lib/                 # API client, utilities
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml           # PostgreSQL + Backend + Frontend + Redis + Evolution API
└── Dockerfile.evolution         # Render Dockerfile for Evolution API deploy
```

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **PostgreSQL** 15+ (running in Docker or locally)
- **Docker** + Docker Compose (for Evolution API and PostgreSQL)
- **Git**

---

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd intern_app
```

### 2. Start all services (PostgreSQL + Redis + Evolution API)

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Evolution API** on port `8085`
- **Backend** on port `8000`
- **Frontend** on port `80`

### 3. Apply database migrations

```bash
cd backend
alembic upgrade head
```

### 4. Backend (for local development)

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# (Optional) Seed admin user — the app auto-creates on first login attempt
# Default admin: admin@company.com / admin123

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Frontend

```bash
cd frontend

npm install
npm run dev
```

The dev server starts at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:8000`.

---

## Configuration

All backend configuration is in `backend/.env`:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:12345@localhost:5432/internship_ats` |
| `SECRET_KEY` | JWT signing key | Auto-generated hex |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL | `1440` (24 hours) |
| `ADMIN_EMAIL` | Default admin email | `admin@company.com` |
| `ADMIN_PASSWORD` | Default admin password | `admin123` |
| `UPLOAD_DIR` | File upload directory | `uploads` |
| `SMTP_HOST` | SMTP server | `smtp-relay.brevo.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USERNAME` | SMTP login email | Brevo SMTP login |
| `SMTP_PASSWORD` | SMTP password | Brevo SMTP password |
| `SMTP_FROM_EMAIL` | Sender email | `hr@skynovatech.in` |
| `SMTP_FROM_NAME` | Sender display name | `Skynova Tech Solutions` |
| `SMTP_USE_SSL` | Use SSL | `false` |
| `BREVO_API_KEY` | Brevo API key (optional) | Your Brevo API key |
| `EVOLUTION_API_URL` | Evolution API base URL | `http://localhost:8085` |
| `EVOLUTION_API_KEY` | Evolution API auth key | `D65A862AD2DD-419C-A1DC-40F007D4B745` |
| `EVOLUTION_INSTANCE_NAME` | WhatsApp instance name | `ats-whatsapp` |

### Brevo SMTP Setup

1. Sign up at [Brevo](https://www.brevo.com)
2. Go to **SMTP & API → SMTP** to find your SMTP credentials
3. Use the SMTP login and password in `SMTP_USERNAME` and `SMTP_PASSWORD`

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Get current admin |

### Applications
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/applications` | No | Submit new application |
| GET | `/api/applications` | Yes | List all (paginated, sortable, filterable) |
| GET | `/api/applications/{id}` | Yes | Get application detail |
| PUT | `/api/applications/{id}` | Yes | Update application |
| DELETE | `/api/applications/{id}` | Yes | Delete application |
| GET | `/api/applications/export/csv` | Yes | Export all as CSV |

### File Upload
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/upload` | No | Upload resume or photo |

### Status Management
| Method | Path | Auth | Description |
|---|---|---|---|
| PUT | `/api/applications/{id}/status` | Yes | Change status (auto-sends email + WhatsApp) |
| GET | `/api/applications/{id}/interviews` | Yes | List interviews |
| POST | `/api/applications/{id}/interviews` | Yes | Schedule interview (auto-sends email + WhatsApp) |
| PUT | `/api/interviews/{id}` | Yes | Update interview |

### Dashboard & Analytics
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/stats` | Yes | Dashboard statistics |
| GET | `/api/dashboard/analytics` | Yes | Full analytics breakdown |

### Email Templates
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/email-templates` | Yes | List templates |
| POST | `/api/email-templates` | Yes | Create template |
| PUT | `/api/email-templates/{id}` | Yes | Update template |
| DELETE | `/api/email-templates/{id}` | Yes | Delete template |

### WhatsApp Templates
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/whatsapp-templates` | Yes | List templates |
| POST | `/api/whatsapp-templates` | Yes | Create template |
| PUT | `/api/whatsapp-templates/{id}` | Yes | Update template |
| DELETE | `/api/whatsapp-templates/{id}` | Yes | Delete template |

### Manual Messaging
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/applications/{id}/send-email` | Yes | Send email to applicant |
| POST | `/api/applications/{id}/send-whatsapp` | Yes | Send WhatsApp to applicant |

### WhatsApp (Evolution API)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/whatsapp/status` | Yes | Connection + instance status |
| GET | `/api/whatsapp/qr` | Yes | Get QR code for linking |
| POST | `/api/whatsapp/logout` | Yes | Logout instance |
| POST | `/api/whatsapp/reconnect` | Yes | Reconnect instance |
| POST | `/api/whatsapp/create-instance` | Yes | Create new instance |
| DELETE | `/api/whatsapp/delete-instance` | Yes | Delete instance |

---

## Default Admin Credentials

```
Email:    admin@company.com
Password: admin123
```

> Change these in `backend/.env` before deploying to production.

---

## Frontend Routes

| Path | Page | Auth |
|---|---|---|
| `/` | Redirects to `/dashboard` | No |
| `/apply` | Public application form | No |
| `/login` | Admin login | No |
| `/dashboard` | Admin dashboard overview | Yes |
| `/applications` | Application list with table | Yes |
| `/applications/:id` | Application detail + actions | Yes |
| `/analytics` | Analytics with charts | Yes |
| `/templates` | Email + WhatsApp template management | Yes |
| `/whatsapp` | Evolution API connection management | Yes |

---

## Development

```bash
# Frontend lint
cd frontend && npm run lint

# Frontend build
cd frontend && npm run build

# Backend — just restart uvicorn with --reload
```

---

## Docker Services

| Service | Port | Purpose |
|---|---|---|
| PostgreSQL | 5432 | Application + Evolution API database |
| Backend | 8000 | FastAPI application |
| Frontend | 80 | React frontend (via nginx) |
| Redis | 6379 | Evolution API cache |
| Evolution API | 8085 | WhatsApp messaging |

```bash
# Start all Docker services
docker-compose up -d

# Stop all
docker-compose down

# View logs
docker-compose logs -f evolution-api
```

---

## License

Internal project — not licensed for distribution.
