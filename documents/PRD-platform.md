# PRD — iCFD Platform Layer (Auth · Profiles · Admin · CMS)

**Version:** 1.0  
**Date:** 2026-07-14  
**Status:** Approved for implementation  
**Baseline:** PRD-enhanced.md (Phase 2) — this document specifies Phase 3  

---

## 1. Overview

This document specifies the platform layer that turns iCFD from a static reference tool into a managed, multi-user service. It covers four areas:

1. **Authentication** — how users sign in
2. **User Profiles** — personal data and preferences tied to an account
3. **Admin Panel** — tools for administrators to manage users and roles
4. **Content Management System (CMS)** — tools for editors to create and update apologetics content without touching code

All features in this document require a Supabase backend (PostgreSQL + Auth).

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Let users create accounts and sign in with multiple methods | Sign-up completion rate ≥ 60% of visitors who click "Sign In" |
| G2 | Sync user data (favorites, notes, progress) to the cloud | Cloud sync works for 100% of signed-in users |
| G3 | Give admins tools to manage users and content without SQL | Zero admin tasks require Supabase SQL editor |
| G4 | Allow editors to publish new apologetics topics through a UI | New topic published in < 10 minutes by a non-developer |

---

## 3. Roles

| Role | Description | Who Has It |
|------|-------------|------------|
| `user` | Default for every new sign-up. Read-only access to content. Personal data (favorites, notes, progress) scoped to their own account. | All registered users |
| `editor` | Can create, edit, and delete topics and learning paths in the CMS. Cannot manage users or roles. | Designated content contributors |
| `admin` | Full access: user management, role assignment, and all editor capabilities. | App owner and designated administrators |

Role is stored in the `role` column of the `user_settings` table. Enforced at the database level via Supabase Row Level Security (RLS) and checked client-side for UI rendering.

---

## 4. Authentication

### 4.1 Sign-In Methods

Three methods supported, all on `/login`:

#### Magic Link (Email OTP)
- User enters email address
- Receives a one-time sign-in link via email (Supabase Auth OTP)
- Clicking the link signs them in and redirects to `/profile`
- No password required

#### Email + Password
- Standard email and password form
- "Sign Up" mode: email, password, display name fields
- "Sign In" mode: email and password
- Password show/hide toggle
- On sign-up, a `user_settings` row is created automatically via a Postgres trigger

#### Google OAuth
- Single "Continue with Google" button
- Uses Supabase OAuth flow with redirect to `/profile` on success
- Display name and avatar URL pulled from Google profile on first sign-in

### 4.2 Route: `/login`

**Tabs:** Magic Link · Password · Google

**Behavior:**
- If user is already signed in, redirect immediately to `?next` param (default `/profile`)
- After successful sign-in, redirect to `?next` param
- Magic link tab shows a "Check your email" success state after submission
- Errors displayed inline below the relevant input

**Acceptance Criteria:**
- All three methods result in a valid Supabase session
- Session persists across browser refreshes (Supabase handles this via localStorage)
- Signing in as an `admin` or `editor` shows the admin panel link on the profile page

### 4.3 Sign-Out

- Available on `/profile` page
- Calls `supabase.auth.signOut()`
- Clears local session; redirects to `/`
- Local data (IndexedDB favorites, notes, progress) is NOT cleared on sign-out (stays for offline use)

---

## 5. User Profile

### 5.1 Route: `/profile`

**Access control:** Redirect to `/login?next=/profile` if not signed in.

**Sections:**

#### Identity
- Avatar: displays Google photo if available; otherwise shows initials in a colored circle
- Display name: editable inline (pencil icon → input → save/cancel)
- Email address: read-only
- Role badge: colored chip showing current role (user = gray, editor = blue, admin = red)

#### Stats
- Topics Read (from `read_progress` table)
- Favorites saved (from `favorites` table)
- Learning Paths completed (from `path_topics` progress)

#### Learning Path Progress
- One progress bar per path the user has started
- Shows `X / Y topics completed` and a percentage bar

#### Preferences
- Theme: Light / Dark / System (saved to `user_settings.theme`)
- Language: EN / TL / CEB (saved to `user_settings.language`)
- Font Size: Small / Medium / Large (saved to `user_settings.font_size`)
- Preferences applied immediately; synced to Supabase

#### Admin Panel Link
- Shown only when `role === 'admin'` or `role === 'editor'`
- Card with a "Go to Admin Panel" button → `/admin`

### 5.2 Cloud Sync

When a user is signed in, the following data is synced to Supabase:
- Favorites (`favorites` table)
- Notes per topic (`notes` table)
- Reading progress (`read_progress` table)
- User settings/preferences (`user_settings` table)

Sync direction: local IndexedDB is the source of truth; cloud is the backup. On first sign-in, local data is pushed to the cloud. On subsequent sign-ins from a new device, cloud data is pulled and merged with local.

---

## 6. Admin Panel

### 6.1 Route: `/admin`

**Access control:** Redirect to `/profile` if `role !== 'admin'`. Role is checked after the Supabase session initializes (client-side guard).

**Layout:** Single-page app with three tabs:
1. Users
2. Content
3. Paths

---

### 6.2 Users Tab

**Purpose:** View all registered users, search by name/email, and change roles.

**Data source:** `get_all_users()` Postgres security-definer function (required because `auth.users` is not accessible via the client JS SDK directly).

**UI:**
- Search input: filters by name or email in real time
- User list table columns: Avatar · Name · Email · Role · Joined · Last Sign-In
- Per-user role selector: three buttons (User / Editor / Admin), current role highlighted
- Clicking a role button calls `set_user_role(userId, newRole)` immediately (no confirmation dialog)
- Admin cannot change their own role (self-row disabled)
- Loading state while fetching; error state if RPC fails

**Acceptance Criteria:**
- Admin can see all registered users
- Admin can promote any user to `editor` or `admin`
- Admin can demote any user back to `user`
- Changes take effect on next sign-in of the affected user

---

### 6.3 Content Tab

**Purpose:** Create, edit, and delete apologetics topics.

**Data source:** `topics` Supabase table (same data as the static JSON, but served from DB when signed in as admin/editor).

**UI:**

#### Topic List
- Filter by language (EN / TL / CEB) — dropdown
- Filter by category — dropdown
- Paginated list (20 per page): topic ID · title · category · difficulty · language · last updated
- Action buttons per row: Edit (pencil) · Delete (trash, with confirmation)
- "New Topic" button opens the topic form

#### Topic Form (Create / Edit)
Fields:
- **ID** — slugified text input (e.g., `baptism-necessity`); read-only when editing
- **Language** — dropdown: EN / TL / CEB
- **Category** — dropdown: 8 valid categories
- **Difficulty** — dropdown: Beginner / Intermediate / Advanced
- **Title** — text input
- **Question** — text input (the apologetics challenge)
- **Answer** — textarea (the Catholic response)
- **Tags** — comma-separated text input; displayed as chips
- **Scripture references** — repeating field group: Reference · Text · Version (optional)
- **Catechism references** — repeating text inputs (e.g., "CCC 1213")
- **Church Fathers** — repeating field group: Author · Quote · Source

Submit actions: Save (upsert to DB) · Cancel

**Acceptance Criteria:**
- Editor or admin can create a new topic; it appears in the app immediately (no rebuild required once DB-driven content is implemented)
- Editor or admin can edit any field of an existing topic
- Admin can delete a topic (editor cannot delete, only edit)
- Form validates required fields before submission
- Topic ID must be unique per language (enforced at DB level via unique constraint)

---

### 6.4 Paths Tab

**Purpose:** Create and manage learning paths.

**Data source:** `paths` and `path_topics` Supabase tables.

**UI:**

#### Path List
- Lists all paths: title · slug · topic count · language
- Action buttons: Edit · Delete (admin only)
- "New Path" button

#### Path Form (Create / Edit)
Fields:
- **Slug** — URL-safe identifier (e.g., `new-catholic`)
- **Title** — display name
- **Description** — textarea
- **Language** — EN / TL / CEB
- **Audience** — text (e.g., "RCIA candidates")
- **Estimated minutes** — number input
- **Topics** — ordered list of topic IDs; drag-to-reorder; type to search and add topics from the DB

**Acceptance Criteria:**
- Admin or editor can create a new path with an ordered topic list
- Reordering topics in the path form updates the `order` field in `path_topics`
- Path changes are immediately reflected on the `/paths` page

---

## 7. Database Schema

Tables required (all in Supabase Postgres public schema):

### `user_settings`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid PK | FK → auth.users |
| `role` | text | `'user'` \| `'editor'` \| `'admin'`, default `'user'` |
| `display_name` | text | nullable |
| `avatar_url` | text | nullable |
| `language` | text | `'en'` \| `'tl'` \| `'ceb'`, default `'en'` |
| `theme` | text | `'light'` \| `'dark'` \| `'system'`, default `'system'` |
| `font_size` | text | `'small'` \| `'medium'` \| `'large'`, default `'medium'` |
| `updated_at` | timestamptz | auto-updated |

### `favorites`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid | FK → auth.users |
| `topic_id` | text | topic slug |
| `added_at` | timestamptz | |

### `notes`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid | FK → auth.users |
| `topic_id` | text | |
| `content` | text | max 1000 chars |
| `updated_at` | timestamptz | |

### `read_progress`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | composite PK with topic_id |
| `topic_id` | text | composite PK |
| `read_at` | timestamptz | |

### `topics`
| Column | Type | Notes |
|--------|------|-------|
| `id` | text | composite PK with lang |
| `lang` | text | composite PK |
| `category` | text | |
| `title` | text | |
| `question` | text | |
| `answer` | text | |
| `tags` | text[] | |
| `difficulty` | text | |
| `scripture` | jsonb | array of scripture refs |
| `catechism` | text[] | |
| `church_fathers` | jsonb | array of father quotes |
| `last_updated` | text | ISO date |

### `paths`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slug` | text unique | |
| `title` | text | |
| `description` | text | |
| `lang` | text | |
| `audience` | text | |
| `estimated_minutes` | integer | |

### `path_topics`
| Column | Type | Notes |
|--------|------|-------|
| `path_id` | uuid | FK → paths |
| `topic_id` | text | |
| `order` | integer | display order within path |

---

## 8. Security

### Row Level Security (RLS)

All tables have RLS enabled. Policies:

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `topics` | everyone | admin, editor | admin, editor | admin only |
| `paths` | everyone | admin, editor | admin, editor | admin only |
| `path_topics` | everyone | admin, editor | admin, editor | admin only |
| `favorites` | own rows | own rows | — | own rows |
| `notes` | own rows | own rows | own rows | own rows |
| `read_progress` | own rows | own rows | — | own rows |
| `user_settings` | own row | own row | own row | — |
| `user_settings` (admin read) | all rows | — | — | — |

### Security-Definer Functions

Two Postgres functions bypass RLS for admin-only operations:

- `get_all_users()` — JOINs `auth.users` with `user_settings`; callable by any authenticated user but intended for admin UI (client should only call when `role === 'admin'`)
- `set_user_role(target_user_id uuid, new_role text)` — updates `user_settings.role`; validates role is one of `user | editor | admin`

### Auth Configuration (Supabase Dashboard)

- Enable Email provider with "Confirm email" on
- Enable Google OAuth provider (Client ID + Secret from Google Cloud Console)
- Set Site URL to production domain
- Set Redirect URLs to include `{domain}/profile`

---

## 9. CLI Tools (Developer)

| Command | What it does |
|---------|-------------|
| `pnpm db:migrate` | Applies all SQL files in `drizzle/migrations/` in order; tracks applied files in `_cfd_migrations` table |
| `pnpm db:seed` | Seeds `topics` and `paths` tables from the JSON files in `public/data/` |
| `pnpm db:admin <email> [role]` | Sets the role for a user by email address; defaults to `admin` |

---

## 10. Phased Delivery

### Phase 3A — Auth + Profiles
- `/login` page with all three sign-in methods
- `/profile` page with identity, stats, and preferences
- `user_settings` table + trigger to create row on sign-up
- Cloud sync for favorites and preferences
- Mobile nav Account tab links to `/profile` or `/login`

### Phase 3B — Admin Panel
- `/admin` route with role guard
- Users tab: list, search, role assignment
- Content tab: topic list with create/edit/delete
- `topics` and `user_settings` admin RLS policies
- `get_all_users()` and `set_user_role()` functions

### Phase 3C — CMS Paths + Full Sync
- Paths tab in admin: create/edit/delete paths and ordered topics
- Full cloud sync: notes, read progress, path progress
- DB-driven content serving (replaces static JSON for signed-in users)

---

## 11. Out of Scope for Phase 3

- Email verification flow (Supabase handles this)
- Password reset flow (Supabase magic link covers this)
- Two-factor authentication
- Social logins beyond Google (Facebook, Apple)
- Content approval workflow (editor submits → admin approves)
- Audit log of admin actions
- Bulk user import/export
