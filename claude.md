# YachtFlow Project Memory & Guidelines

## Monorepo Project Setup
This project is configured as a full-stack monorepo:
1. **Client** (`/client`): React 19 single-page application built with Vite and styled using premium Vanilla CSS (Glassmorphism & light/dark theme variables).
2. **Server** (`/server`): Express.js REST API backend.
   * `middleware/`: Security and authorization route guards (`auth.js`).
   * `services/`: AI Gemini and regex fallback parsers (`nlpService.js`).
   * `routes/`: Express routers separating `auth`, `users`, `yachts`, `bookings`, and `settings`.

---

## Technical Stack & Configuration
- **Frontend**: React 19, Vite, Vanilla CSS. Server proxy configured in `client/vite.config.js` to map `/api` to `http://localhost:3000`.
- **Backend**: Express.js server, Node-postgres Pool (`db.js`), Node native `crypto` module (SHA-256 password hashing).
- **Database**: PostgreSQL (Default: `localhost:5432`, Database: `yachtflow`).
- **Conflict Checking**: Enforced on the server level using standard interval overlap logic:
  `start_date < new_end_date AND end_date > new_start_date`

---

## Core Build & Execution Commands
* **Run Dev Stack**: `npm run dev` (uses `concurrently` to launch client and server together)
* **Re-Seed Database**: `npm run db:seed` (runs `server/seed.js` to drop/recreate tables and populate default yachts/users/bookings)
* **Build Client**: `npm run build:client` (builds production asset bundle inside `client/dist/`)

---

## Development & Styling Rules
1. **No TailwindCSS**: Write flexible Vanilla CSS in `client/src/index.css` following HSL variables, dark mode styling on `:root.dark`, and glassmorphic filters.
2. **Generic Error Messages**: On authentication, always return generic messages like `"Incorrect name or password"` to prevent username scanning.
3. **No Direct LocalStorage Database**: All booking history, yachts fleet config, system defaults, and user credentials reside in PostgreSQL. Keep only UI preferences (like active dark/light mode) in client `localStorage`.

---

## Fetching Up-to-date Documentation
To fetch current, up-to-date documentation for libraries, frameworks, SDKs, APIs, CLI tools, or cloud services (e.g. React, Next.js, Prisma, Express, PG, Tailwind, Spring Boot):

### 1. Using Context7 MCP
Whenever researching library-specific details, version migrations, syntax, or debugging:
1. Run `resolve-library-id` with the library name and the query to get matches.
2. Select the best match ID in the `/org/project` format.
3. Run `query-docs` with the selected library ID and the full question to retrieve the official verified docs.
4. Leverage the fetched documentation to construct correct, modern code.

### 2. Using Modern Web Guidance
For general frontend UI, layouts, performance (CWV), scroll-driven motion, or browser support fallback policies:
```bash
# Search for web development guides
npx -y modern-web-guidance@latest search "<query>"

# Retrieve a specific guide by ID
npx -y modern-web-guidance@latest retrieve "<id>"
```
Query `modern-web-guidance` before adding heavy client-side libraries to verify if vanilla HTML/CSS solutions already exist natively.

---

## Implemented Workflows & Features

### 1. Captain Boarding Verification & Dynamic Pricing
- **Trip Completion Loop**: When a Captain verifies boarding details, the booking status is changed to `"Completed"`, rendering the calendar block green immediately.
- **Dynamic Catering Recalculation**: Changing passenger counts on the Captain modal recalculates catering fees in real-time on the client and backend.
- **Overpayment Guard**: Form input checks and server-side validators prevent entering an on-board collected amount larger than the remaining outstanding balance.
- **Hiding Handoff**: If the outstanding balance is `$0`, payment input fields are hidden, and a `"Full payment already collected by Sales"` success banner is shown instead.

### 2. Accountant Cash Ledger Reconciliation
- **On-Board Cash Ledger**: A dedicated panel in the Finance Dashboard displays all payments logged on-board by Captains, allowing accountants to audit daily drawer deposits.

### 3. Adaptive Visual Occupancy Grid & Booking Form
- **Adaptive Timeline Bounds**: The grid hour limits default to 8:00 AM - 10:00 PM, but dynamically expand (e.g. starting at 1:00 AM or extending to 12:00 AM) to fit any early morning or late night charters.
- **Click-to-Book Grid Cells**: Clicking any vacant hourly cell on the grid opens the booking modal pre-filled with that yacht and start time.
- **Duration & Frozen End Times**: The "End Date & Time" input is frozen; changing the "Start Date & Time" or "Duration (Hours)" automatically calculates and prefills the end time.
- **Optional Fields**: The "Pickup Location" is optional and is no longer required on booking submissions.
### 4. Email/Password Database Session Auth & Security Gates
- **Persistent DB Sessions**: Custom cookie-based authentication using randomized 32-byte secure session tokens stored in the `sessions` table. Verifies session authenticity on mount.
- **Email-Based Logins**: Replaced name-based credentials with corporate email addresses (e.g. `admin@yachtflow.com`).
- **Endpoint Protection Gates**: Restricts user management APIs to Admin privileges (`requireAdmin`), and secures all Booking/Yacht/Settings resources under session validation (`requireAuth`).
