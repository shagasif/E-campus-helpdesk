# E-Campus Helpdesk — Electronic Issue Reporting System

A campus issue reporting web app built as a learning project. Students and staff report problems (computers, projectors, network, electrical, furniture and more), follow each complaint from **Pending** to **Resolved**, and administrators manage everything from a dashboard. An optional **Generate AI Summary** button uses Google Gemini through a small local backend.

> **Important limits (please read)**
> - Complaints, pictures, accounts and the admin profile are stored in **your browser's localStorage only**. They are not shared between devices, users or campus computers, and nothing is sent to a real campus office.
> - Login is **front-end only**. It stops casual access but it is **not real security**: anyone with access to the browser or the source code can bypass it. Real login needs a backend and a database.
> - Gemini is **optional**. Everything except the AI summary works without an API key.

---

## What's new in this version (Part 1: user side, Part 2: admin side)

- **Report a Problem** now has 12 categories (IT, classroom equipment, Wi-Fi, electricity/fans/lights, building, water and plumbing, washrooms, canteen, furniture, parking and transport, safety, other) and optional **Campus** and **Affected area or department** fields. The AI summary can be edited before submitting. Older saved complaints are upgraded automatically (the old AC/fan category becomes Electricity, Fans and Lights).
- **Request Help** (new): academic support, registration and timetable, exams and results, student records and portal, fees and scholarships, IT account, administrative help, other. Reference `HLP-YYYYMMDD-XXXX`.
- **Applications & Services** (new): staff leave, student leave, certificate/document request, ID card request, equipment or access request, HR query, other application. The form changes with the type. Reference `APP-YYYYMMDD-XXXX`. Leave types, certificate types and rules are examples in `client/src/utils/requestConfig.ts` and must be confirmed with the university. Nothing is approved automatically, and file uploads are not supported.
- **My Requests** (new) replaces My Complaints: problem reports, help requests and applications in one list, with search, type filter, status filter and a details page for each. Old `/user/complaints` links redirect here.
- **User dashboard** now shows Open Requests, In Progress, Awaiting Response and Completed (counted from your own records) and a Recent Requests table. Dashboard counting rules are written in `client/src/utils/unifiedRequests.ts`.
- Help requests and applications are stored in the same browser storage as complaints (key `campus-issue-reporting:requests:v1`), so they have the same limits: not shared, not sent to any office.
- Sidebar: the brand icon is now a campus (graduation cap) icon, and the sample set is 7 complaints.

### Landing page and sign in

- The site now opens on a **landing page** (campus photo hero, features, how it works, who it is for, FAQ). One **Sign In / Register** button opens an overlay with Sign In and Register tabs. Sign In has Student, Staff / Faculty and Admin options; Student and Staff / Faculty both open the user dashboard, Admin opens the admin dashboard. After signing in, the dashboard opens. `/login` opens the same page with the overlay already open.
- The hero has no chart or preview; its photo fades softly into the next section so there is no visible line between them.
- Light mode now uses soft off-white surfaces instead of pure white.

### Part 2: admin side

- **Admin sidebar:** Dashboard, All Requests, Complaints & Issues, Help Requests, Applications, Users, Teams, Reports & Analytics, Settings. On phones the bottom bar scrolls sideways.
- **All Requests / Help Requests / Applications:** one list with search, type, category, status group and date filters, sorting, pagination, CSV export, and the submitter and department for each row.
- **Request details (admin):** assign to a team or office, move the status along the allowed workflow, add a **public reply** (the requester sees it) or a **private internal note** (the requester never sees it). Approved, Rejected and More Information Required need a message. Nothing is approved automatically.
- **Users reply:** when staff ask for more information, the requester can reply on the request page, and it goes back to Under Review.
- **Reopen:** a user can reopen their own resolved complaint with a reason; it returns to Pending and the timeline shows it.
- **Admin dashboard:** new cards for all requests (Total, Open, In Progress, Resolved) and a Latest requests list, above the existing complaint charts.
- **Users, Teams, Reports, Settings:** users come from the accounts saved in this browser (no passwords shown); teams show assigned workload and are placeholders in the code; reports are calculated from saved records with a date range and CSV export; settings only holds options that really work.

**Limits:** everything is localStorage in one browser, so an admin only sees requests created in that same browser. No file attachments, email notifications, real staff accounts or role permissions. Team and office names are placeholders in `client/src/types/complaint.ts` and `client/src/utils/requestConfig.ts`.

---

## Quick Start (VS Code)

1. **Install Node.js** (LTS) from https://nodejs.org, then check `node -v` and `npm -v`.
2. **Open the project folder** in VS Code (`File > Open Folder…`). Open two terminals (`Terminal > New Terminal`).
3. **Install dependencies (once):**
   - Terminal 1: `cd server` then `npm install`
   - Terminal 2: `cd client` then `npm install`
4. **Add your own Gemini key (optional):** get a key at https://aistudio.google.com/apikey. In `server`, copy `.env.example` to `.env` (Mac/Linux `cp .env.example .env`, Windows `copy .env.example .env`) and replace `your_gemini_api_key_here` with your key. Restart the backend after editing `.env`. Never paste the key into the frontend, into a chat, or into Git.
5. **Start the backend** (Terminal 1, in `server`): `npm run dev` → `Server running on http://localhost:3001`. It also tells you whether a Gemini key was found.
6. **Start the frontend** (Terminal 2, in `client`): `npm run dev` → open **http://localhost:5173**.
7. **Sign in.** Create an account first (see below), or use the administrator account.

| Role | How to sign in |
|---|---|
| **User** | **Sign In / Register** → **Register** tab (full name, email, Student or Staff / Faculty, department, password). You are sent back to Sign In; sign in with that email and password. |
| **Admin** | **Sign In / Register** → choose **Admin** → `admin@campus.edu` / `Admin@123`. Change these two values in `client/src/utils/accounts.ts` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). The admin can also change the password on the Profile page; to go back to the original, clear the site's localStorage (this also removes saved complaints and accounts). |

**Commands**

| Folder | Command | What it does |
|---|---|---|
| `client` | `npm run dev` | Starts the frontend on port 5173 |
| `client` | `npm run build` | Type-checks and builds the frontend |
| `client` | `npm run typecheck` | Type-check only |
| `server` | `npm run dev` | Starts the backend on port 3001 (auto-restarts) |
| `server` | `npm run build` / `npm run start` | Compiles to `dist/` / runs the compiled backend |
| `server` | `npm run typecheck` | Type-check only |

No lint script is configured.

---

## Project Objective

Give a campus one clear place to report and track equipment and facility problems:

- **Users** (students, staff, faculty) create an account, report an issue with an optional photo, and follow its status and timeline.
- **Administrators** see live statistics, manage every complaint (status, priority, assigned staff team, resolution note), and export data.
- A small **AI-assisted feature** suggests a one-sentence summary of a complaint, to demonstrate safe API integration for a beginner.

---

## Technology Stack

**Frontend (`client/`)**

- React 18, TypeScript, Vite 5
- React Router 6 (clean URLs; automatically switches to `#/` URLs if the built file is opened straight from disk)
- Recharts for the dashboard charts (loaded on demand)
- Lucide React for icons
- Plain CSS with design tokens (no Tailwind)

**Backend (`server/`)**

- Node.js, Express 4, TypeScript (`tsx` for development)
- Official **Google Gen AI SDK** (`@google/genai`), used on the server only
- `dotenv` to read the API key from `server/.env`

**Storage**

- **Without Supabase (default):** browser **localStorage** only. Keys used: `campus-issue-reporting:complaints:v1`, `:accounts:v1`, `:session:v1`, `:admin-profile:v1`, `:login-role:v1`.
- **With Supabase (optional):** accounts, complaints, help requests, applications, replies and pictures are saved in your Supabase project, so every device and the administrator see the same data. See *Supabase Database (optional)*.
- Pictures are resized (max 1000 px, JPEG). Without Supabase they stay in the browser; with Supabase they are saved with the complaint in your database.

The backend exists only to call Gemini safely. In development the Vite dev server forwards `/api` requests to the backend (`vite.config.ts` proxy → `http://localhost:3001`).

---

## Mandatory Requirements

The six original requirements, and where each one lives:

| # | Requirement | Status |
|---|---|---|
| 1 | Users can report issues in the supported categories | ✅ Report a Problem form, 12 categories (see Screen 2) |
| 2 | Complaints with descriptions and optional pictures | ✅ Description (required) + photo (optional, with preview) |
| 3 | Track status: Pending, In Progress, Resolved | ✅ Status badges, status timeline, user details page |
| 4 | Admin dashboard can manage complaints | ✅ Complaints table + detail drawer (status, priority, assignment, resolution note) |
| 5 | Statistics and reports | ✅ Cards and charts calculated from the saved complaint records; CSV export |
| 6 | Responsive, user-friendly interface | ✅ Sidebar on desktop, bottom bar on phones, cards instead of tables on small screens |

**Added later at the project owner's request** (these replace the original "do not add" list):

- Account creation before login (full name, email, Student / Staff-Faculty, department, password) and email-only sign-in
- A separate administrator login
- Profile page for both roles (details, photo, password, personal activity)
- Complaint **title**, **building / room**, **priority** (Low / Medium / High, set by the admin) and **assigned staff team**
- **Resolution note** and resolution timestamp, plus a full status timeline
- **CSV export** (admin, filtered data) and **Download CSV** (user, own complaints)
- **PDF / print record** of a single complaint
- Complaint reference format `CIR-YYYYMMDD-XXXX`

**Still not included:** notifications, email delivery, QR codes, staff accounts or a staff panel, real authentication, any external database.

---

## Gemini API Integration

Gemini is called **only from the backend**, never from the browser.

- **SDK / model:** `@google/genai` with `ai.models.generateContent(...)`. The default model is `gemini-3.6-flash`, taken from Google's current Gemini API documentation when this was built. You can override it with `GEMINI_MODEL` in `server/.env` if Google retires it.
- **Key handling:** the key is read from the server environment variable `GEMINI_API_KEY` (file `server/.env`). `.env` is in `.gitignore`; `server/.env.example` holds only a placeholder. There are no `VITE_` variables, and the key name does not appear in the built frontend bundle.
- **Endpoints**
  - `GET /api/health` → `{ "ok": true, "aiConfigured": true|false }`
  - `POST /api/summarize` with `{ "description": "..." }` → `{ "summary": "..." }` or `{ "error": { "code", "message" } }`
- **Limits:** description must be 10–1000 characters; request body is capped at 10 KB; 20-second timeout.
- **Error handling** (the rest of the app keeps working in every case):

| Situation | Code | Message shown |
|---|---|---|
| Key missing | `MISSING_API_KEY` (503) | Tells you to create `server/.env` and restart |
| Invalid / rejected key | `API_KEY_REJECTED` (502) | Check the key in `server/.env` |
| Rate limit | `RATE_LIMITED` (429) | Wait a moment and try again |
| Timeout | `TIMEOUT` (504) | Gemini took too long |
| Empty or unusable reply | `INVALID_RESPONSE` (502) | Try again |
| Other failure | `GEMINI_ERROR` (502) | Try again later |
| Backend not running | (browser) | "Could not reach the backend server…" |

- **Privacy:** only the complaint **text** is sent. Photos, names and emails are never sent.

### AI feature

**Generate a concise summary of a complaint description.**

- A **Generate AI Summary** button appears on the Report an Issue form, on the user's complaint details page, and in the admin detail drawer.
- The summary appears as a suggestion labelled *AI-suggested summary (not verified)*. The user chooses **Attach this summary** or **Discard**.
- The original description is never changed. Gemini is never required to submit, track or manage a complaint.
- The prompt tells the model to use only facts from the report and not to add causes, diagnoses or solutions, and to treat the report text as data, not instructions.
- Example — original: *"The computer in Lab 2 switches off repeatedly when students try to use it."* → possible summary: *"Lab 2 computer repeatedly shuts down during use."*

---

## Supabase Database (optional)
Supabase gives the site a shared database and real sign-in. If you do nothing, the site keeps working exactly as before (data in the browser only).

**Setup (once)**
1. Create a free project at https://supabase.com.
2. Open **SQL Editor -> New query**, paste the whole file `supabase/schema.sql` and press **Run**. It creates the tables, the security rules (Row Level Security) and the helper functions. It is safe to run again.
3. Open **Project Settings -> API** and copy the **Project URL** and the **anon public** key.
4. In `client`, copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_public_key
   ```
5. In `client` run `npm install` (it installs `@supabase/supabase-js`), then `npm run dev`.
6. **Authentication -> Providers -> Email:** for quick testing, turn **Confirm email** off. If you leave it on, new people must click the link in their e-mail before they can sign in.
7. Register once on the website, then make yourself the administrator by running this in the SQL Editor (use your own email):
   ```
   update public.profiles set role = 'admin' where email = 'your-email@example.com';
   ```
8. For password-reset e-mails: **Authentication -> URL Configuration** -> set **Site URL** to your website address (for example `http://localhost:5173` while testing, and your Vercel address when published) and add the same address under **Redirect URLs**.

**Publishing on Vercel:** in the Vercel project, open **Settings -> Environment Variables** and add the same two `VITE_SUPABASE_...` values, then redeploy.

**Security notes**
- The **anon** key may be in the website; it is safe only because Row Level Security is on. Users can read only their own rows, and only administrators can change status, assign, reply and see private notes.
- Never put the **service_role** key in the website or in GitHub.
- The Gemini key still stays only in `server/.env`.
- The old fixed admin login (`admin@campus.edu` / `Admin@123`) works only without Supabase. With Supabase, the administrator is a normal account whose role you set to `admin`.
- Data already saved in a browser (localStorage) is not copied to Supabase automatically.

## Design System

Two themes, **light (default)** and **dark**, switched with the Light mode / Dark mode button in the sidebar (a round button in the landing page bar). The choice is remembered in the browser. No gradients are used. All colors and fonts are tokens at the top of `client/src/styles/app.css`.

| Token | Dark | Light |
|---|---|---|
| Page background | `#141414` | `#F3F5F6` |
| Cards | `#232323` | `#FFFFFF` |
| Sidebar | `#1C1C1C` | `#222222` |
| Accent (buttons, highlights) | `#89D9F2` | `#89D9F2` |
| Accent as text or link | `#89D9F2` | `#0B6B86` |
| Primary text | `#FFFFFF` | `#141414` |
| Secondary text | `#A3A3A8` | `#5A656D` |
| Resolved / Pending / In Progress | `#4ADE80` / `#F5B54A` / `#6AA9F5` | `#15803D` / `#B45309` / `#1D6FB8` |

**Fonts:** Sora for headings and numbers, Plus Jakarta Sans for body text, loaded from Google Fonts with the system font as a fallback. They are free alternatives to Atyp Display, which is a paid font.

**Landing page and sign in:** campus photo hero under a solid dark overlay with a dotted grid and thin ring shapes, a glass navigation bar, a hero that fades smoothly into the next section, themed cards, and the Sign In / Register overlay. No gradients except the soft fade at the bottom of the hero photo. Cards and surfaces use the theme tokens, so light and dark both work.

### Visual principles

- Generous space; flat surfaces, no gradients.
- Slim dark sidebar with white labels and a light-blue active state.
- White cards with subtle borders, rounded corners and soft shadows.
- Light blue for primary actions and highlights.
- Consistent Lucide icons; every category has its own icon.
- Clear typography hierarchy, readable forms and tables, labelled status badges and priority flags.
- Visible keyboard focus, proper labels and `aria-` attributes, errors announced to screen readers.
- Helpful **empty**, **loading** (chart skeletons while charts load), **success** and **error** states, plus toast messages after updates.
- Subtle hover transitions only; no dead buttons.

---

## Application Screens

Roles: **User** (own complaints only) and **Admin** (everything). A signed-out visitor sees the landing page (Sign In / Register opens the overlay), and each role is kept out of the other role's pages. At the bottom of the sidebar, the name and photo (with an up arrow) open a small menu with **Profile**, **Settings** (admin only has a separate Settings page; for users it opens Profile, where details and password are edited), **Light / Dark mode** and **Sign out**. Profile lets both roles edit their details and photo, change their password and see their own activity. The email is the sign-in ID and cannot be changed.

### Screen 1: Admin Dashboard

- Cards: **Total**, **Pending**, **In Progress**, **Resolved**, **Resolution Rate**.
- **Monthly complaint trend** area chart (reported vs resolved) with a 6 / 12 months switch and "this month vs last month" chips.
- **Status distribution** donut chart and **Category distribution** bar chart (all 12 categories).
- **High-priority open issues** and **Recent complaints** lists; each item opens the detail drawer.
- Link to manage all complaints.
- Every number and chart is calculated from the saved complaint records, not hard-coded.
- 7 clearly labelled **Sample** complaints are loaded the first time so the dashboard has something to show. They are not real reports; the admin can remove them with **Remove sample data**.

### Screen 2: Report a Problem

- **Issue title**, **Category** (Computer & Hardware, Projector & AV Equipment, Internet & Network, Electrical Issues, Air Conditioning & Ventilation, Furniture & Classroom, Building & Maintenance, Cleanliness & Sanitation, Safety & Security, Other), **Building**, **Room / location**, **Description**.
- Optional **photo** with preview, **Replace** and **Remove**.
- Optional **Generate AI Summary**.
- **Submit Complaint** and **Cancel**. On success the complaint **ID** is shown with links to view it or report another.
- A double click cannot create two complaints.

#### Validation rules:

- Title: required, 5–100 characters.
- Category: required.
- Building and room / location: required.
- Description: required, 10–1000 characters (whitespace-only is rejected).
- Photo: optional; JPG, PNG or WebP only; up to 5 MB.
- Each failure shows a clear message next to the field, and focus moves to the first invalid field.
- Account form: full name, valid email, Student or Staff / Faculty, department, password of at least 6 characters, matching confirmation; one account per email.

### Screen 3: All Complaints

- **Admin ("Complaints")**
  - Search by ID, title, location, team or reporter.
  - Filters: status, category, priority, **date range**.
  - Sortable columns (ID, title, category, priority, status, date).
  - Pagination (10 / 25 / 50 per page).
  - **Export CSV** of the filtered results.
  - Shows a useful empty state and **Clear filters**.
- **User ("My Requests")**
  - Own complaints only, with search and status filter, pagination, and **Download CSV**.
- Tables turn into stacked cards on phones.
- Columns include complaint ID, title, category, location, submitted date, priority and status.

### Screen 4: Complaint Details

- **User view:** title, ID, status and priority, category, location, submitted time, assigned team, full original description, attached photo, AI summary (if any), **status timeline**, **admin resolution notes**, and **Download PDF / Print**. A user can only open their own complaints.
- **Admin drawer:** the same information plus the reporter, resolution time and who resolved it, and a **Manage complaint** panel: change **status**, change **priority**, **assign** a staff team, add a **resolution note**.
- Marking a complaint **Resolved** requires a resolution note; the resolution **timestamp and admin** are recorded and appear in the timeline.
- After saving, the list, dashboard and charts update from the same data and a confirmation message appears.
- The print record contains the ID, details, photo, timeline and resolution note; the menu, buttons and AI controls are hidden. Choose **Save as PDF** in the print dialog to download a PDF.

### Screen 5: Responsive Requirements

Checked in a browser at these widths:

- Mobile: 375 px
- Tablet: 768 px
- Desktop: 1440 px

The landing page, both dashboards, lists, forms, the drawer and the profile page showed **no horizontal scrolling** in an automated check at all three widths. Main buttons are at least 44 px high, forms fit the screen, charts resize, and long category names are shortened on phones (the full name is shown on hover or tap).

### Screen 5: Responsive Navigation

- **Desktop:** slim dark sidebar. User: Dashboard, Report a Problem, Request Help, Applications & Services, My Requests. Admin: Dashboard, All Requests, Complaints & Issues, Help Requests, Applications, Users, Teams, Reports & Analytics, Settings. Name/photo (opens Profile) and **Sign out** sit at the bottom.
- **Phone:** the sidebar becomes a bottom bar with the same menu items, a round photo that opens Profile, and **Sign out**.

---

## Suggested Project Structure

```text
campus-issue-reporting/
├── client/
│   ├── public/
│   │   ├── campus-bg.jpg            # login background photo (replace with your own)
│   │   └── campus-scene.svg         # fallback background if the photo is missing
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppLayout.tsx        # page frame, storage warning, error boundary
│   │   │   ├── Sidebar.tsx          # sidebar / bottom bar, name + photo, sign out
│   │   │   ├── Avatar.tsx
│   │   │   ├── ComplaintForm.tsx    # report form, photo, AI summary
│   │   │   ├── ComplaintDrawer.tsx  # admin detail + manage panel
│   │   │   ├── RequestsTable.tsx, RequestSuccessCard.tsx
│   │   │   ├── StatCard.tsx, StatusBadge.tsx, StatusTimeline.tsx
│   │   │   ├── AiSummaryBox.tsx     # Generate AI Summary
│   │   │   ├── Pagination.tsx, EmptyState.tsx, Skeleton.tsx, ErrorBoundary.tsx
│   │   │   ├── RequireRole.tsx      # keeps each role on its own pages
│   │   │   ├── Icon.tsx             # Lucide icons
│   │   │   └── charts/index.tsx     # trend, status and category charts
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx        # sign in + create account
│   │   │   ├── UserDashboardPage.tsx, MyRequestsPage.tsx, RequestDetailsPage.tsx
│   │   │   ├── RequestHelpPage.tsx, ApplicationsPage.tsx
│   │   │   ├── ReportIssuePage.tsx, ComplaintDetailsPage.tsx
│   │   │   ├── AdminDashboardPage.tsx, AdminComplaintsPage.tsx
│   │   │   ├── AdminRequestsPage.tsx, AdminRequestDetailsPage.tsx
│   │   │   ├── AdminUsersPage.tsx, AdminTeamsPage.tsx, AdminReportsPage.tsx, AdminSettingsPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── context/
│   │   │   ├── ComplaintsContext.tsx  # single source of truth for complaints
│   │   │   ├── AuthContext.tsx        # signed-in session
│   │   │   └── ToastContext.tsx
│   │   ├── types/complaint.ts         # Complaint type, categories, labels
│   │   ├── utils/
│   │   │   ├── complaintStorage.ts    # localStorage load/save + old-data migration
│   │   │   ├── complaintStats.ts      # all dashboard numbers
│   │   │   ├── accounts.ts            # accounts, password hashing, admin account
│   │   │   ├── csv.ts, image.ts, api.ts, format.ts, demoData.ts
│   │   ├── styles/app.css, styles/login.css
│   │   ├── App.tsx, main.tsx
│   ├── index.html, vite.config.ts, tsconfig.json, package.json
├── server/
│   ├── src/index.ts                   # Express + Gemini (/api/summarize, /api/health)
│   ├── .env.example                   # placeholder only
│   ├── .gitignore, tsconfig.json, package.json
├── .gitignore
└── README.md
```

**Complaint data model** (`types/complaint.ts`): `id` (reference), `title`, `category`, `building`, `room`, `description` (original, never changed), `imageData?`, `aiSummary?`, `status`, `priority`, `assignedTo?`, `resolutionNote?`, `resolvedAt?`, `resolvedBy?`, `history[]` (status timeline), `createdAt`, `updatedAt?`, `isDemo?`, `submittedBy?`. Complaints saved by older versions are upgraded automatically when loaded (including the old five categories → the new ten).

---

## Implementation Workflow

The project was built in phases and checked in a real browser after each stage.

### Phase 1: Inspect the project

The workspace was empty, so there was nothing to adapt or overwrite. The build environment used Node.js 22 and npm 10. The project was created from scratch following the structure above.

### Phase 2: Set up the application

- `client/`: React + TypeScript + Vite. `server/`: Express + TypeScript.
- Vite proxy sends `/api` to port 3001, so the browser never talks to Gemini or sees the key.
- `.gitignore` (root and `server/`) excludes `.env` and `node_modules`; `.env.example` has a placeholder.

### Phase 3: Build the interface

Design tokens and layout first, then the sidebar / bottom bar, reusable components (cards, badges, tables, drawer, timeline), the report form with photo preview, the lists with search / filters, the detail views, and finally the dashboards and charts. The look was refined over several rounds to the cream / gold / maroon design.

### Phase 4: Connect functionality

- One shared complaints store (`ComplaintsContext`) feeds the lists, drawer, profile and dashboards, so a status change updates everything at once.
- Unique references (`CIR-YYYYMMDD-XXXX`), form validation, double-submit protection, status / priority / assignment / resolution updates with timeline entries.
- localStorage persistence with graceful handling of damaged data and blocked storage (a warning banner, and the app keeps working).
- Accounts, sign-in, role-based access, Profile, CSV export and print record.

### Phase 5: Integrate Gemini

- Google's current Gemini API quickstart and model pages were checked to confirm the SDK package (`@google/genai`), the `generateContent` call and a current model name.
- The SDK is installed in `server/` only. `POST /api/summarize` validates and limits the text, calls Gemini, and maps every failure to a clear message.
- The frontend calls only the local endpoint and shows the result as a suggestion.

### Phase 6: Test the project

Tests were run with automated headless-browser scripts (Chromium) during development. The scripts are not part of this repository.

| Journey | What was checked | Result |
|---|---|---|
| **A. Submit a complaint** | Validation messages, unique ID, complaint appears in the list | ✅ Passed |
| **B. Attach a picture** | Preview, remove, re-select, wrong file type rejected, photo shown on the detail view | ✅ Passed |
| **C. Manage a complaint** | Status change updates list, dashboard cards and charts; resolving needs a note and records time and admin | ✅ Passed |
| **D. Search and filter** | Search by ID and text, status / category / priority / date filters, sorting, pagination, empty states | ✅ Passed |
| **E. Gemini** | Missing-key message, failed request with an invalid key, bad requests; the rest of the app keeps working | ✅ Failure paths passed. ⚠️ **A real summary was not generated** (no API key was available). Please test this once yourself (see below). |
| **F. Persistence** | Data survives refresh and sign-out / sign-in; damaged saved data shows a warning | ✅ Passed. The damaged-data check was run on an earlier build (that code has not changed). The blocked-storage warning is implemented but not tested. |

Also verified: login rules (account required, wrong password rejected), user-only visibility of own complaints, CSV and print output, profile edits and password change, and no horizontal overflow at 375 / 768 / 1440 px.

**Build checks:** `npm run build` passes in `client` (type-check + production build) and `npm run build` passes in `server`.

**To test Gemini yourself:** add your key to `server/.env`, restart the backend, open Report an Issue, write a description of at least 10 characters and press **Generate AI Summary**. You should see a one-sentence summary; the description stays unchanged.

---

## Strict Anti-Hallucination and Coding Rules

The rules this project follows, and how:

1. **No invented requirements, endpoints, settings or business rules.** Only features requested for this project exist.
2. **A feature counts as done only if working code exists.** Unfinished ideas (Request Help, Applications & Services, user-side delete) are **not** in the app.
3. **Tests, builds and API calls are reported only if they were actually run.** See Phase 6, including what was *not* verified.
4. **The Gemini SDK and model name come from Google's documentation**, not guesswork. The model is configurable.
5. **No fabricated API responses, credentials or campus data.**
6. **Browser-local data is never presented as sent to a campus administrator.**
7. **The API key never appears in the browser or in Git.**
8. **Supabase is optional.** Without it the site is a browser-only prototype and its login is described as not real security. With it, login uses Supabase Auth and access is enforced by Row Level Security in the database.
9. **Extra features only with the owner's approval.** The additions are listed under Mandatory Requirements.
10. **No dead buttons.** Every control does something; if the backend is off, the AI button explains how to start it.
11. **No unnecessary replacement of working code.** Older saved data is migrated rather than discarded.
12. **Errors are never hidden.** Failed saves, failed requests and invalid data show a message.
13. **Sample data is clearly labelled** (`Sample` tag and a banner) and can be removed.
14. **Limitations are explained rather than hidden** (localStorage, no real authentication).
15. **Ambiguity is resolved with the simplest sensible option.**
16. **Anything that could not be verified is stated** (live Gemini call).
17. **Not a static mock-up.** All screens are interactive and tested.

---

## Acceptance Criteria

| Criterion | Status |
|---|---|
| All issue categories available | ✅ 12 campus categories |
| Users can submit descriptions and optional pictures | ✅ |
| Validation works with useful feedback | ✅ |
| Each complaint gets a unique reference | ✅ `CIR-YYYYMMDD-XXXX` |
| Submitted complaints appear in the complaints list | ✅ |
| Search and status filters work | ✅ Plus category, priority, date range, sorting and pagination for admins |
| Admin status changes update the shared state | ✅ |
| Dashboard statistics and charts reflect the records | ✅ Calculated from saved complaints |
| Browser-local persistence works | ✅ |
| Gemini summary uses a backend API call | ✅ Implemented · ⚠️ not verified with a live key |
| Gemini API key is not exposed in the frontend | ✅ Checked in source and in the built bundle |
| Gemini failures do not break core features | ✅ Tested |
| Interface is responsive | ✅ Checked at 375 / 768 / 1440 px |
| No known dead buttons or misleading actions | ✅ |
| Build and checks pass | ✅ Client and server build; no lint script exists |
| Local-storage and no-real-authentication limits explained | ✅ See the notice at the top |

---

## Troubleshooting

- **"Could not reach the backend server"** — the backend is not running. Start it (`cd server`, `npm run dev`).
- **"The Gemini API key is not set"** — create `server/.env` from `.env.example`, add your key, restart the backend.
- **"Gemini rejected the request"** — the key is wrong or disabled, or the model name is no longer available (change `GEMINI_MODEL`).
- **Rate limit message** — wait a minute and try again.
- **Port already in use** — close the other program, or change `PORT` in `server/.env` **and** the proxy target in `client/vite.config.ts`.
- **`command not found` or missing modules** — run `npm install` again in that folder.
- **`npm install` fails in the top folder** — there is no `package.json` there; run it inside `client` and inside `server`.
- **Storage warning banner** — the browser blocked or filled localStorage; remove pictures or sample data.
- **Forgot the admin password you changed** — clear the site's localStorage; `Admin@123` works again. This also removes all saved complaints and accounts in that browser.
- **Want your own login photo** — put it at `client/public/campus-bg.jpg` (a 1920 px wide photo looks best).
