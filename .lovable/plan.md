

# Geenovate Foundation – Incubation Management Platform

## Overview
A closed, role-based incubation management platform with a public-facing website and a powerful internal system controlled by the CEO (Super Admin). Built with React + Vite + Tailwind on the frontend, Supabase for auth, database, realtime, and storage.

---

## Phase 1: Public Website + Authentication Foundation (MVP)

### 1.1 Public Website (Read-Only)
- **Home Page** — Hero section with CEO photo + vision message, mission statement, key stats/impact metrics, call-to-action to learn more
- **About Us** — Foundation story, values, objectives
- **Leadership & Team** — CEO profile, Innovation Associates, Catalysts/Mentors with photos and bios (only `visibility=public` AND `approved_by_ceo=true` content shown)
- **Programs** — Overview of incubation categories (Startups, Innovation Associates, Catalysts)
- **Impact** — Live, auto-synced metrics dashboard (total startups supported, projects completed, etc.)
- **Announcements** — Public-only announcements with priority indicators
- **Gallery / Media** — CEO-approved images and videos
- **Contact** — Foundation contact information (no forms, display-only)
- **Login** — Email + password login page (no signup option)

Design: Clean, professional, institutional. Responsive. Dark/light mode optional.

### 1.2 Authentication System
- Email + password login only (no public signup)
- Forgot password flow with secure reset tokens, rate limiting, and generic messages (no email enumeration)
- First-login forced password change
- Role-based redirect after login (CEO → CEO Dashboard, Admin → Category Dashboard, Member → Member Dashboard)

### 1.3 Role-Based Access Control (Database-Driven)
- **Roles**: Super Admin (CEO), Category Admin, Member, Viewer
- Roles stored in a dedicated `user_roles` table (not on profiles)
- Row Level Security policies using `has_role()` security definer function
- CEO has full override power across all tables

### 1.4 User Management (CEO Only)
- Create users with email, name, role, category assignment
- Set user status: Active, Inactive, Suspended, Alumni/Graduated
- Suspended users blocked from login; Alumni get read-only access
- Reset any user's password
- Suspend/disable users

### 1.5 Database Schema Foundation
- `profiles` — name, email, avatar, status, category, cohort
- `user_roles` — role assignments with RBAC helper functions
- `cohorts` — yearly batches with archive capability
- `announcements` — with visibility, priority, CEO approval fields
- `team_members` — for public leadership/team display
- `impact_metrics` — for live public impact data
- `gallery_items` — CEO-approved media
- `audit_logs` — tracks all system actions
- `system_config` — CEO-configurable settings

---

## Phase 2: Internal Dashboard + Core Modules

### 2.1 CEO Dashboard
- Overview cards: total startups, active projects, completion rate, pending updates, at-risk members, unread messages
- Recent activity feed
- Quick actions: create user, create cohort, approve content
- Filters by category, cohort, month

### 2.2 Cohort / Batch System
- Create and manage yearly cohorts
- Assign users and startups to cohorts
- Cohort group progress view: weekly submission status, task progress, active/inactive members, performance trends
- Archive/restore cohorts (archived = read-only, no edits)
- Cohort shared file uploader (.pdf, .doc, .docx, .ppt, .pptx only) with metadata and CEO controls

### 2.3 Task Management System
- Create tasks with title, description, priority, deadline, status, assignee (individual/category/startup)
- File attachments and comments on tasks
- CEO approval workflow for task completion
- Task data feeds into performance scoring

### 2.4 Weekly Update System
- Mandatory weekly submissions: work completed, challenges, next goals, support needed
- Configurable submission day
- Auto-reminders for non-submission
- Non-submission impacts performance score
- Data feeds cohort progress view

### 2.5 Announcements (Internal)
- Sticky banners, priority levels (High/Medium/Low)
- Auto-expiry dates
- Target audience selection (category, cohort, all)
- CEO approval toggle for public visibility

---

## Phase 3: Performance, Documents & Communication

### 3.1 Performance & Monitoring
- Task completion score, update regularity score, attendance score
- Overall performance percentage per member
- Rankings with filters (category, cohort, month)
- At-risk member identification

### 3.2 Chat System (Simple)
- Category group chat rooms
- Direct messaging with CEO
- File sharing in chat
- Real-time via Supabase Realtime

### 3.3 Document Vault
- Secure file storage with role-based access
- Categories: Legal, Templates, Pitch Decks, Agreements
- Version control for documents

### 3.4 Proof of Work
- Upload images/videos linked to tasks or projects
- Auto date-stamping
- CEO approval required; only approved items can appear publicly

### 3.5 Idea Submission Portal
- Innovation Associates submit ideas, research proposals, concept notes
- CEO can approve, reject, assign to startup, track status

---

## Phase 4: System Administration & Polish

### 4.1 Notifications
- In-app notifications for task assignments, deadlines, announcements, messages, update reminders
- Email notifications via Supabase edge functions

### 4.2 Audit Logs (CEO-Only)
- Full logging: login/logout, password resets, role changes, task updates, file operations, visibility changes
- Searchable and filterable audit trail

### 4.3 System Configuration Panel (CEO-Only)
- Toggle weekly updates on/off, set submission day
- Set inactivity threshold, file size limits
- Enable/disable chat per cohort

### 4.4 Internal Policies (Read-Only)
- Code of conduct, data usage, IP ownership, confidentiality policy pages

