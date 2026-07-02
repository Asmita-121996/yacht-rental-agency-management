# Project Scope: YachtFlow Yacht Booking & Revenue Management System

YachtFlow is a web application designed to transition yacht booking operations from manual spreadsheets to a multi-role digital platform. The software resolves booking scheduling conflicts, simplifies transaction logging, automates pricing calculations, and provides financial reporting for accounts.

---

## 1. Core Objectives
- **Zero Double-Bookings**: Give sales representatives instant visual clarity on yacht availability across dynamic time intervals using date and time pickers.
- **Dedicated User Authentication**: Access control via a custom credentials Login Page with support for session sign-out.
- **Admin User Management**: Comprehensive controls inside the Admin workspace to add, suspend, or delete user accounts (Sales, Accounts, Admin).
- **Role-Based Workspaces**: Tailor the interface for two user types: **Admin** and **Regular Users** with proper designations:
  - **Sales Executive**: Pradeesh Ezhava, Chetan (Booking Calendar access, locked booking logs)
  - **Accountant**: SQ Accounts (View-only Booking Calendar access, Finance Ledger access)
  - **Admin**: SQ ADMIN (Full workspace and configuration access)
- **Automated Billing & Financial Reports**: Streamline calculations of yacht rates, guest charges, catering, external services, and optional VAT, with downloadable performance statistics.
- **Premium User Experience**: Present a modern dashboard with glassmorphism, responsive grid structures, dark/light theme switching, and interactive visuals.

---

## 2. User Roles & Capabilities

### A. Sales Executive (Regular User designation)
- **Yacht Availability Dashboard**: Filter by date and yacht to visually inspect occupancy timelines.
- **Collision Checking**: Real-time interval checks using precise datetime selectors to prevent overlapping reservations.
- **Booking Logging**: Form capture of guest lists (adults, kids), catering selections, special pick-up points, payment terms, optional VAT selection, and booking statuses. Auto-locks log designation to the active user's credentials.

### B. Accountant (Regular User designation)
- **Finance Analytics Dashboard**: Review monthly gross income, net profits, and collection rates.
- **Performance Reports**: Performance analytics tracking business value brought in per sales representative.
- **Audit View**: View-only calendar access to inspect bookings without modification permissions.
- **Temporal Metrics**: Track month-over-month (MoM) revenue comparisons, projected cash flow, and export spreadsheets.

### C. Admin (Admin user type)
- **User Accounts Registry**: Create new user accounts (designating Sales, Accounts, or Admin roles), suspend active credentials, or permanently remove accounts.
- **Registry Management**: Configure yachts (name, hourly base rate, passenger limit).
- **System Config**: Maintain variables such as standard catering charges.

---

## 3. Data Calculations
To automate the registration and accounts workflow:
1. **Duration**: Calculated automatically based on booking start and end timestamps.
2. **Yacht Cost**: `Duration (in hours) * Yacht Hourly Base Rate`
3. **Catering Cost**: `Total Guests (Adults + Children) * Catering Service Rate` (if catering option is enabled)
4. **External Service Charges**: Input dynamically by Sales at booking creation.
5. **Subtotal**: `Yacht Cost + Catering Cost + External Service Charges`
6. **VAT**: `Subtotal * Selected VAT %` (Manually selected by salesperson as 5% or 7% during booking; not applicable by default).
7. **Total Sum Amount**: `Subtotal + VAT`
8. **Collected Amount**: Entered payment mode & payment amount fields to track paid vs. pending balances.

---

## 4. Technology Stack & Design System
- **Frontend**: React 19, Vite, and Vanilla CSS.
- **Visuals**: CSS-based responsive graphs for reporting widgets.
- **Persistence**: Browser LocalStorage with pre-seeded mockup history.
- **Styling**: Sleek modern look, CSS grid/flex layout, responsive scaling, light/dark mode switch, HSL theme colors.
