# 💸 FairShare AI

> A full-stack AI-powered expense sharing, bill splitting, and debt optimization app — built with React, Express, and LLaMA 3.3 via Groq.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react) ![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite) ![Node](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript) ![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat&logo=tailwindcss) ![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=flat)

---

## ✨ Features

- **🧠 NLP Bill Parsing** — Type expenses naturally (e.g. *"Priya paid ₹900 for dinner, split equally between her, me, and Rahul"*) and LLaMA auto-fills everything
- **🤖 AI Co-Pilot Chat** — Ask your group workspace anything: *"Who spent the most?"*, *"Summarize bills by category"*
- **⚖️ Optimal Debt Minimization** — Greedy settlement algorithm reduces the number of transactions needed to settle all debts
- **📊 Spending Trend Charts** — Visual breakdowns of group spending over time
- **🔔 Real-time Notifications** — WebSocket-powered live updates across group members
- **🔐 Auth System** — JWT-based authentication with cryptographically salted password hashes
- **🌍 Multi-currency Support** — Track expenses across different currencies
- **📄 PDF Export** — Export group expense reports as PDF

> **Note:** Receipt OCR scanning is not supported with Groq/LLaMA (vision input not available). The feature returns an empty fallback — you can swap in a vision-capable model if needed.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS v4 |
| Backend | Node.js, Express v4, TypeScript |
| AI | Groq API — `llama-3.3-70b-versatile` |
| Real-time | WebSockets (`ws`) |
| Database | JSON file store (swappable with Supabase/PostgreSQL) |
| Auth | JWT + salted password hashes |
| PDF Export | jsPDF |
| Charts | Recharts |
| Animations | Motion |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- A free [Groq API key](https://console.groq.com/keys) (14,400 req/day free tier)

### 1. Clone the repo

```bash
git clone https://github.com/Ksheetiz-Dhiman/fairshare-ai.git
cd fairshare-ai
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
JWT_SECRET=your_super_secret_key_here
GROQ_API_KEY=your_groq_api_key_here
APP_URL=http://localhost:3000/
```

> Supabase keys are optional — the app uses a local JSON store by default.

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Try the demo account

On the login page, click **"🚀 Skip to Demo Account"** to instantly log in as **Alex Mercer** with pre-seeded sample data (Trip to Florence, multiple participants, currencies, and bills).

---

## 🐳 Docker

Run with Docker Compose (includes a PostgreSQL instance):

```bash
docker-compose up --build
```

This spins up:
- PostgreSQL on port `5432`
- FairShare AI app on port `3000`

---

## 📦 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start full-stack dev server |
| `npm run build` | Build frontend + bundle server for production |
| `npm start` | Run the production build |
| `npm run lint` | TypeScript type-check |
| `npm run clean` | Remove `dist/` and `database.json` |

---

## 📁 Project Structure

```
fairshare-ai/
├── server.ts                  # Express API server + WebSocket handler
├── src/
│   ├── App.tsx                # React app + client-side routing
│   ├── types.ts               # Shared TypeScript types
│   ├── db/
│   │   └── dbStore.ts         # JSON persistence engine
│   ├── lib/
│   │   ├── gemini.ts          # AI integrations via Groq (parseExpense, insights)
│   │   ├── authCrypto.ts      # JWT + password hashing
│   │   ├── debtSim.ts         # Debt minimization algorithm
│   │   └── pdfExport.ts       # PDF report generation
│   └── components/
│       ├── AIParseInput.tsx   # NLP expense input
│       ├── ReceiptUploader.tsx# Receipt scanner (text fallback)
│       ├── InsightsChat.tsx   # AI chat co-pilot
│       ├── BalanceCard.tsx    # Balance ledger UI
│       ├── DebtGraph.tsx      # Debt graph visualizer
│       ├── GroupChat.tsx      # Group messaging
│       └── SpendingTrendChart.tsx
├── supabase_setup.sql         # Schema for Supabase/PostgreSQL migration
├── docker-compose.yml
├── vite.config.ts
└── .env.example
```

---

## ☁️ Deployment

This app runs as a **single persistent Node.js server** (Express + WebSockets), so it's best deployed on platforms that support long-running processes:

**Recommended: [Railway](https://railway.app)**
1. Connect your GitHub repo
2. Add environment variables (`GROQ_API_KEY`, `JWT_SECRET`, etc.)
3. Railway auto-detects `npm run build` + `npm start` — done ✅

**Vercel** requires refactoring WebSockets into serverless functions — not recommended without code changes.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Groq API key (get one free at console.groq.com) |
| `JWT_SECRET` | ✅ Yes | Secret for signing JWT tokens |
| `PORT` | No | Server port (default: 3000) |
| `APP_URL` | No | Hosted URL (for self-referential links) |
| `SUPABASE_URL` | No | Supabase project URL (optional cloud DB) |
| `SUPABASE_ANON_KEY` | No | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key |

---

## 📄 License

MIT © [Ksheetiz Dhiman](https://github.com/Ksheetiz-Dhiman)
