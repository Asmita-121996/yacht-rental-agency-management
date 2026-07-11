# Project Scope: YachtFlow Yacht Booking & Revenue Management System

YachtFlow is a web application designed to transition yacht booking operations from manual spreadsheets to a multi-role digital platform. The software resolves booking scheduling conflicts, simplifies transaction logging, automates pricing calculations, and provides financial reporting for accounts.

---

## 1. Core Objectives
- **Zero Double-Bookings**: Give sales representatives instant visual clarity on yacht availability across dynamic time intervals using date and time pickers.
- **Dedicated User Authentication**: Custom email/password database-backed session authentication with HTTP-only cookies and security gate middlewares.
- **Admin User Management**: Admin controls inside the Admin workspace to add (using unique email addresses), suspend, or delete user accounts (Sales, Accounts, Captain, Admin).
- **Role-Based Workspaces**: Tailor the interface for two user types: **Admin** and **Regular Users** with proper designations:
  - **Sales Executive**: Pradeesh Ezhava, Chetan (Booking Calendar access, locked booking logs)
  - **Accountant**: SQ Accounts (View-only Booking Calendar access, Finance Ledger access)
  - **Yacht Captain**: Captain Morgan (Boarding Log access, actuals logging, on-board collections)
  - **Admin**: SQ ADMIN (Full workspace and configuration access)
- **Automated Billing & Financial Reports**: Streamline calculations of yacht rates, guest charges, catering, external services, and optional VAT, with downloadable performance statistics.
- **Premium User Experience**: Present a modern dashboard with glassmorphism, responsive grid structures, dark/light theme switching, and interactive visuals.

---

## 2. User Roles & Capabilities

### A. Sales Executive (Regular User designation)
- **Yacht Availability Dashboard**: Filter by date and yacht to visually inspect occupancy timelines.
- **Collision Checking**: Real-time interval checks using precise datetime selectors to prevent overlapping reservations.
- **Booking Logging**: Form capture of guest lists (adults, kids), catering selections, optional pick-up points, payment terms, optional VAT selection, and booking statuses. Auto-locks log designation to the active user's credentials.
- **Click-to-Book timeline**: Clicking directly on vacant visual grid slots auto-prefills the yacht and starting hour in the booking creation modal.
- **Duration & End Time Helpers**: Auto-calculating and freezing End Date & Time based on Start Time and Duration input.
- **Boarding Status Visibility**: Inspect actual boarding guest counts and live status indicators on the sales grid and hover details.
- **Natural Language Quick-Add Bar**: Type booking requests in plain text (e.g. "Book SQX 45 for 8 guests on Saturday from 2 PM to 6 PM with catering") to parse and prefill the booking form automatically.

### B. Accountant (Regular User designation)
- **Finance Analytics Dashboard**: Review monthly gross income, net profits, and collection rates.
- **Performance Reports**: Performance analytics tracking business value brought in per sales representative.
- **Audit View**: View-only calendar access to inspect bookings without modification permissions.
- **Temporal Metrics**: Track month-over-month (MoM) revenue comparisons, projected cash flow, and export spreadsheets.
- **Captain Cash Reconciliation**: Dedicated ledger pane to reconcile on-board payment collections logged by Captains against daily deposits.

### C. Yacht Captain (Regular User designation)
- **Captain's Boarding Log**: Mobile-responsive dashboard listing today's scheduled charters.
- **Verify & Complete Trip**: Log actual boarded guest counts (adults, kids) upon arrival. Submitting updates the overall booking status to `"Completed"` (closing the loop and turning grid blocks green).
- **On-Board Payment Collections**: Log cash, card terminal, or bank transfer payments collected on-board. Enforces validation to prevent entering an amount exceeding the outstanding balance. Hides payment collection fields if the balance is $0.

### D. Admin (Admin user type)
- **User Accounts Registry**: Create new user accounts (designating Sales, Accounts, Captain, or Admin roles), suspend active credentials, or permanently remove accounts.
- **Registry Management**: Configure yachts (name, hourly base rate, passenger limit).
- **System Config**: Maintain variables such as standard catering charges.

---

## 3. Data Calculations
To automate the registration and accounts workflow:
1. **Duration**: Calculated automatically based on booking start and end timestamps.
2. **Yacht Cost**: `Duration (in hours) * Yacht Hourly Base Rate`
3. **Catering Cost**: Calculated dynamically using `Total Guests (Adults + Children) * Catering Service Rate` (if catering option is enabled). Initial bookings use estimated headcounts; Captain check-ins automatically update the cost using actual boarded headcounts.
4. **External Service Charges**: Input dynamically by Sales at booking creation.
5. **Subtotal**: `Yacht Cost + Catering Cost + External Service Charges`
6. **VAT**: `Subtotal * Selected VAT %` (Manually selected by salesperson as 5% or 7% during booking; not applicable by default).
7. **Total Sum Amount**: `Subtotal + VAT`
8. **Collected Amount**: Entered payment mode & payment amount fields to track paid vs. pending balances. Includes on-board cash/card collections logged by captains.

---

## 4. Technology Stack & Design System
- **Frontend**: React 19, Vite, and Vanilla CSS.
- **Backend**: Express.js REST API server.
- **Database**: PostgreSQL with Prisma ORM and database-backed session tables.
- **Visuals**: CSS-based responsive graphs for reporting widgets.
- **Styling**: Sleek modern look, CSS grid/flex layout, responsive scaling, light/dark mode switch, HSL theme colors.
