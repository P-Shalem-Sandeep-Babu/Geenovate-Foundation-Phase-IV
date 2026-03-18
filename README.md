# Geenovate Ascent Platform (Phase III)

Welcome to Phase III of the **Geenovate Ascent** Incubation Platform! This is an enterprise-grade web application designed to manage the entire lifecycle of startup incubation—from initial idea submission and mentor evaluation to cohort management and final pitch days.

## 🚀 Tech Stack

- **Frontend Framework:** React 18, Vite, TypeScript
- **Styling & Components:** Tailwind CSS, Shadcn UI (Radix UI)
- **State Management:** React Query (TanStack Query v5)
- **Routing:** React Router v6
- **Backend & Auth:** Supabase (Database, Auth, Row Level Security, Edge Functions)

## ✨ Core Features

1. **Idea & Startup Lifecycle Management**
   - Founders can submit Startup Ideas outlining problems, solutions, and domains.
   - Admins can review, approve, and automatically convert concepts into fully-fledged "Startups."
   - Startups have visual health checks, task completion metrics, and mentor evaluations.

2. **Mentor Scorecards**
   - Assigned mentors can evaluate startups across key parameters (Innovation, Market, Execution, Team).
   - Real-time aggregation of scores gives admins immediate insight into startup viability.

3. **Cohort Operations**
   - Group startups and users into organized Cohorts.
   - Assign targeted tasks and deadlines to Cohort members.
   - Members can submit deliverables; Mentors can leave feedback ratings.

4. **In-App Notifications & Activity Timeline**
   - Robust polling notification engine ensuring users are alerted whenever tasks are assigned or ideas are reviewed.
   - Real-time Activity Logs populate dashboard timelines so administrators can track platform engagement instantly.

5. **Strict Role-Based Access Control (RBAC)**
   - **Super Admin:** Full platform visibility and destructive capabilities.
   - **Mentor:** Custom dashboard view restricting visibility to *only* assigned startups and cohorts.
   - **Professional/Founder:** Restricted interface to interact strictly with their own startups and assignments.

6. **Search, Filter & Export (CSV)**
   - Lightning-fast client-side search across domains and names.
   - Categorized filtering by startup status and stage.
   - 1-click native CSV exports on Startups, Ideas, and Cohorts for external reporting.

## 🛠️ Local Development Setup

To run this platform locally, follow these steps:

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn
- Supabase CLI (if running the database locally)

### 2. Clone and Install
```bash
git clone https://github.com/your-org/geenovate-ascent.git
cd geenovate-ascent
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (you can copy `.env.example` if it exists) and fill in your Supabase details:
```env
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Database Migrations
If you are linking this to a live Supabase project, execute the SQL migration files located in `supabase/migrations/`. These files hold all Tables, Columns, Row Level Security Policies, and Postgres Functions required for Phase III to run.

To apply them via CLI:
```bash
npx supabase db push
```

### 5. Running the App
Start the Vite development server:
```bash
npm run dev
```
Navigate to `http://localhost:8080` to see the application running.

## 📦 Deployment (Render)

This project has been pre-configured for seamless automated deployment to **Render** using Blueprint.

1. Ensure the `render.yaml` file is pushed to your GitHub repository.
2. Link the repository to your Render account via the "New +" -> "Blueprint" flow.
3. Render will automatically read the `render.yaml`, execute the correct `npm run build` commands, publish the `dist` directory, and apply the SPA Rewrite routing rules (`/*` -> `/index.html`).
4. Enter your Supabase environment variables when prompted by the Render dashboard.

## 🔒 Security

All tables are heavily protected by **Row Level Security (RLS)** within Supabase. Do not disable RLS on the live database. The platform relies on Supabase Auth policies (`auth.uid()`) to restrict data access accurately based on DB user profiles.
