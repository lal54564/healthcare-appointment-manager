# Healthcare Appointment & Follow-up Manager

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://healthcare-appointment-manager-blue.vercel.app/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

🔗 **Live Production Deployment**: [https://healthcare-appointment-manager-blue.vercel.app](https://healthcare-appointment-manager-blue.vercel.app/)

A comprehensive, production-ready healthcare appointment management platform with AI-powered pre-visit/post-visit clinical summaries, automated email notifications, Google Calendar two-way synchronization, and background medication reminder queues.


---

## 🌟 Project Overview
- **Multi-Role Portals**: Dedicated, role-based workflows for Patients, Doctors, and Clinic Administrators.
- **AI-Assisted Summaries**: 
  - *Pre-Visit Summary*: Automatically analyzes patient-reported symptoms, extracts chief complaint, assesses urgency (`low`/`medium`/`high`), and suggests 3 clinical questions for the physician.
  - *Post-Visit Summary*: Transforms doctor's consultation notes into clear, patient-friendly guidance with medication schedules and follow-up instructions.
- **Double-Booking & Concurrency Protection**: High-integrity slot reservation with transactional row locking, 5-minute temporary holds, and database-level unique constraints.
- **Doctor Leave Management**: Automated conflict detection for existing patient bookings with rescheduling notices.
- **Background Jobs**: Asynchronous queues for email retries with exponential backoff, calendar sync, and scheduled medication reminders.

---

## 🛠️ Technology Stack
- **Frontend**: React 19, TanStack Router / Start, Tailwind CSS, TypeScript, Lucide Icons
- **Backend & Database**: Supabase (PostgreSQL 15, Row Level Security, Auth, Stored Procedures)
- **AI Engine**: Centralized LLM Gateway (with built-in simulated provider + OpenAI/Gemini support)
- **Email Service**: Resend (HTML responsive templates)
- **Calendar Integration**: Google Calendar API (OAuth 2.0)
- **Test Suite**: Vitest (30 Unit & Integration Tests)

---

## 📚 Documentation Deliverables

Detailed technical specifications are located in the [`docs/`](docs) directory:
- 📖 [**System Design Document (800 words)**](docs/system-design.md): In-depth architecture covering double-booking prevention, concurrency strategy, doctor leave conflict handling, slot hold mechanisms, and notification resilience.
- 📡 [**API & RPC Documentation**](docs/api.md): Specification of all PostgreSQL stored procedures, RPC functions, and client endpoints.
- 🗄️ [**Database Schema & Security**](docs/database.md): Entity relationship breakdown, partial indexes, and Row Level Security (RLS) policies.
- 🤖 [**LLM Prompts & Gateway Guide**](docs/llm-prompts.md): Centralized prompts, JSON output schemas, validation rules, and failure fallback behaviors.

---

## 🚀 Setup & Installation Instructions

### 1. Prerequisites
- Node.js 18+ and npm installed
- Supabase account (or use the built-in offline mock simulation mode)

### 2. Clone & Install
```bash
git clone <repository-url>
cd "hospital booking"
npm install
```

### 3. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Configure your keys in `.env`:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your-anon-key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your-service-role-key

# Set to true for offline mock mode (no Supabase account needed)
VITE_USE_MOCK=false

# Resend Email Service
RESEND_API_KEY=re_your-resend-api-key

# Google Calendar OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:5173/api/auth/google/callback

# Clinic Localization
VITE_CLINIC_TIMEZONE=Asia/Kolkata
```

### 4. Database Setup (Supabase)
1. Open your Supabase project dashboard.
2. Navigate to **SQL Editor** -> **New query**.
3. Run the migrations in sequence from `supabase/migrations/` or run `011_master_fix.sql` and `012_fix_timezone.sql` to apply all tables, triggers, indexes, and RPC functions in one step.

---

## 📅 Google Calendar OAuth 2.0 Setup Steps

To enable live Google Calendar synchronization:
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `Healthcare Appointment Manager`).
3. Enable the **Google Calendar API** under **APIs & Services** > **Library**.
4. Configure the **OAuth Consent Screen** (User Type: External, add `https://www.googleapis.com/auth/calendar.events` scope).
5. Go to **Credentials** > **Create Credentials** > **OAuth Client ID**:
   - Application type: *Web application*
   - Name: *Healthcare Appointment Client*
   - Authorized JavaScript origins: `http://localhost:5173` (or your production domain)
   - Authorized redirect URIs: `http://localhost:5173/api/auth/google/callback`
6. Copy the **Client ID** and **Client Secret** into your `.env` file (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`).

---

## 🔑 Demo Login Credentials

For testing and evaluation, use these pre-configured accounts:

| Role | Email | Password | Access / Features |
|---|---|---|---|
| **Quick Patient Demo** | `hi@gmail.com` | `123456` | Direct patient access to search clinicians, book appointments & view summaries |
| **Patient** | `patient@healthcare.demo` | `Demo@1234` | Patient portal, symptom intake form, prescriptions & pre-visit AI insights |
| **Doctor** | `dr.sharma@healthcare.demo` | `Demo@1234` | Doctor roster, consultation room, diagnosis notes & digital apothecary prescriptions |
| **Admin** | `admin@healthcare.demo` | `Demo@1234` | Full administration, clinician management, leave scheduling & conflict resolution |

---

## 🧪 Running Tests & Build

```bash
# Run unit & integration tests (30 tests)
npm run test

# Type check & lint
npm run lint

# Production bundle build
npm run build

# Start production preview server
npm run start
```

---

## 📂 Project Directory Structure

```text
hospital-booking/
├── src/
│   ├── routes/          # TanStack file-based routes
│   │   ├── admin/       # Admin portal (doctor management, leave scheduling)
│   │   ├── doctor/      # Doctor portal (roster, consultation room)
│   │   ├── patient/     # Patient portal (search, booking flow, summaries, prescriptions)
│   │   ├── login.tsx    # Authentication sign-in
│   │   └── register.tsx # Multi-role registration
│   ├── context/         # AuthContext & Session management
│   ├── components/      # UI components & layouts
│   └── styles/          # Design system & Tailwind CSS
├── lib/
│   ├── ai/              # Centralized LLM prompts, gateway & validation
│   ├── auth/            # Authentication & RBAC helpers
│   ├── calendar/        # Google Calendar OAuth 2.0 & sync adapter
│   ├── db/              # Supabase client, database types, and mock simulator
│   ├── email/           # Resend email adapter & HTML templates
│   ├── jobs/            # Background worker for medication & retry queues
│   ├── retry.ts         # Exponential backoff algorithm
│   └── timezone.ts      # Clinic timezone conversion utilities
├── supabase/
│   └── migrations/      # PostgreSQL schemas, RLS policies, and stored procedures
├── tests/               # Vitest automated test suite (30 test cases)
└── docs/                # Architecture, System Design, API, DB & LLM documentation
```
