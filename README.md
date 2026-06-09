# 🌌 FairShare AI: Full-Stack Expense Share Tracker

Welcome to **FairShare AI**—a full-stack expense sharing, bill splitting, and debt optimization ledger powered by Gemini Intelligence.

---

## 🔥 Key Technical Superpowers

1. **Intelligent NLP Bill Parsing (`Gemini-3.5-flash`)**: Type naturally (e.g., *"Priya paid €90 for dinner last night, split equally between her, me, and Rahul"*). The system automatically maps participants, processes amounts, and configures matching split rows instantly.
2. **Dual-Mode OCR Receipt Scanner**: Drag and drop or upload receipts. Gemini Vision reads and converts receipt coordinates, pre-filling totals, line items, and merchant notes.
3. **Co-Pilot Financial Analyst**: A conversational companion integrated into the group workspace, allowing you to ask, *"Who spent the most overall?"* or *"Summarize our bills in a category bullet list."*
4. **Optimal Debt Minimization (Greedy Settlement Algorithm)**: Automatically simplifies group transaction graphs to minimize the raw payment counts—consolidating multi-currency balances directly.

---

## 🛠️ The Tech Stack

- **Frontend**: React (v19) + Vite + Tailwind CSS (v4)
- **Icons & Micro-interactions**: Lucide React
- **Backend Services**: Node.js + Express (v4)
- **Database Engine**: Persistent Relational JSON Store (easily adaptable to PostgreSQL/Drizzle) + Built-in automatic seed loaders
- **Authentication**: JWT state controls + Cryptographically salted pass-hashes

---

## 🚀 Quick Start Instructions

This application is ready to run right out of the box in the AI Studio environment or your local workspace.

### 1. Requirements
Ensure you have Node.js 18+ and NPM installed.

### 2. Configure Environment Secrets
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
PORT=3000
JWT_SECRET=super_secret_session_key_fairshare_ai_2026
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

### 3. Bootstrap and Start Dev Server
```bash
# Install required dependencies
npm install

# Start the full-stack server
npm run dev
```
Open your browser to `http://localhost:3000` to interact with the application!

### 4. Direct Demo Access (Fast-Bypass)
On the registration/login page, select **"🚀 Skip to Demo Account"** to immediately log in as **Alex Mercer** (`alex@example.com` / `password`). The workspace is pre-seeded with beautiful sample data (e.g., *"Trip to Florence"*, with 3 active participants, currencies, and multiple bills) so you can test features without manual typing!

---

## 🐳 Running with Docker

Spin up a local PostgreSQL instance and the Node app server automatically using Docker Compose:

```bash
docker-compose up --build
```
This mounts PostgreSQL on port `5432` and opens the FairShare AI client on port `3000` with hot-reload capabilities.

---

## 📁 System Module Map

- `/server.ts` - Core Express JSON API Gateway, middlewares, and server assets.
- `/src/App.tsx` - Fully integrated React client routing engine.
- `/src/types.ts` - Shared entity types keeping TS compilers green.
- `/src/db/dbStore.ts` - Persistence engine with instant mock-data loads.
- `/src/components/AIParseInput.tsx` - Text parsing component calling Gemini text models.
- `/src/components/ReceiptUploader.tsx` - Image scanning component calling Gemini Vision models.
- `/src/components/InsightsChat.tsx` - Group assistant chat widget.
- `/src/components/BalanceCard.tsx` - Ledger visualizer mapping debtor balances.
- `/src/components/DebtGraph.tsx` - Splitwise-inspired optimized transaction arrows.
