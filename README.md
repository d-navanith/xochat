# Enterprise Multi-Portal Live Chat & Surveillance HelpDesk

An enterprise-grade real-time Live Chat and Customer Support System with **Atomic Collision Prevention Locking**, **Role-Based Access Control**, **Dedicated Port Endpoints**, and **Real-Time Admin Activity Scraping & Surveillance**.

---

## 🌐 Multi-Portal Dedicated Architecture

The system runs 4 dedicated application endpoints for each user role and customers:

| Portal | Port | Target Audience | Features |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `http://localhost:5720` | Super Administrator | Full surveillance inspector, all message audits, system-wide metrics, user & core admin provisioning. |
| **Core Admin** | `http://localhost:5120` | Core Administrator | Team supervision, per-agent message counts ("who sent what to which customer"), provisioning team members. |
| **Team Members** | `http://localhost:5121` | Support Agents (`@murdock`, etc.) | Exact UI design matching Figma/mockup: "All" queue, "Replied Box", "Mine", collision locks, one-reply enforcement, green mark removal. |
| **Customer Portal** | `http://localhost:3002` | Customers / Visitors | Live customer window (ask questions, clear transaction doubts, receive instant agent replies in real time). |
| **Backend Engine** | `http://localhost:4000` | Real-Time Engine | **ASP.NET Core (.NET 10)** + **SignalR** + Atomic Collision Lock Manager + Auto-Assigning Agents Engine. |

---

## 🔄 Updated Business Rules (Fully Enforced)

1. **Strictly One Reply per Customer Inquiry**:
   - Team members are permitted to send **only 1 reply** per customer inquiry.
   - Once replied, further replies to that customer are locked, and the conversation is officially marked as answered and closed.

2. **Green Color Mark Removal on Reply**:
   - Customer inquiries waiting for answers display an active **Green Status Indicator** (`isUnansweredGreen: true`).
   - The moment an agent sends their reply, the **green mark is automatically removed** (turns grey/inactive).

3. **Automatic Move to Replied Box**:
   - Once replied, the inquiry immediately disappears from the **"All"** pending feed.
   - It automatically moves into the **"Replied Box"** tab.
   - Upon page refresh, replied messages never appear in the incoming pool; only fresh, unanswered inquiries appear.

4. **Admin Scraping & Activity Surveillance**:
   - Admins can inspect complete chronological traces of all agent actions.
   - If any dispute or doubt occurs, admins can search by:
     - Agent username (e.g., `@murdock`)
     - Customer name (e.g., `Theodore`, `Lisa`)
     - Inquiry or reply keyword
     - Exact timestamp and response latency in seconds!

---

## 🚀 Quick Start

### Start all 4 portals and backend together:
```powershell
npm run start:all
```

Or run any service individually:
```powershell
npm run dev:server      # Backend on 4000
npm run dev:super       # Super Admin on 5720
npm run dev:core        # Core Admin on 5120
npm run dev:team        # Team Members on 5121
npm run dev:customer    # Customer Window on 3002
```

### Run Automated QA Concurrency & Rule Tests:
```powershell
npm run test:qa
```
All 6 test suites pass with 100% compliance!
