# YachtFlow Project Memory & Guidelines

## Monorepo Project Setup
This project is configured as a full-stack monorepo:
1. **Client** (`/client`): React 19 single-page application built with Vite and styled using premium Vanilla CSS (Glassmorphism & light/dark theme variables).
2. **Server** (`/server`): Express.js REST API backend connecting to a PostgreSQL database via `pg` (node-postgres).

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

