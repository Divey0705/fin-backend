# Fin — Mobile App Setup Guide

## What's been built
- **fin-backend/** → Updated FastAPI backend (Firebase + Groq + Railway-ready)
- **fin-app/**     → React Native app (iOS + Android)

---

## STEP 1 — Firebase setup (5 min)

1. Go to https://console.firebase.google.com → Create project → name it "fin-app"
2. Go to **Firestore Database** → Create database → Start in test mode
3. Go to **Project Settings** → **Service accounts** → **Generate new private key**
4. Download the JSON file → save it as `serviceAccountKey.json` in your backend folder (for local dev)
5. For Railway: copy the entire JSON content as one line — you'll paste it as an env var

---

## STEP 2 — Groq API key (2 min)

1. Go to https://console.groq.com → Sign up
2. Create an API key → copy it

---

## STEP 3 — Backend: Run locally

```bash
cd fin-backend

# Copy your existing files into fin-backend/
# (models_def.py, models/, 1774019038452_final_dataset.csv, serviceAccountKey.json)

pip install -r requirements.txt

# Set env vars
set GROQ_API_KEY=gsk_your_key_here        # Windows
export GROQ_API_KEY=gsk_your_key_here     # Mac/Linux

py -m uvicorn main:app --reload --port 8000
# Visit http://localhost:8000/docs to verify
```

---

## STEP 4 — Deploy backend to Railway

1. Go to https://railway.app → New Project → Deploy from GitHub repo
   (push fin-backend/ folder to a GitHub repo first)

2. In Railway dashboard → **Variables** tab → add:
   ```
   GROQ_API_KEY          = gsk_your_key_here
   FIREBASE_CREDENTIALS_JSON = {"type":"service_account","project_id":"...entire json as one line..."}
   ```

3. Railway auto-detects the Procfile and deploys
4. Copy your Railway URL e.g. `https://fin-backend-production.up.railway.app`

---

## STEP 5 — Update API URL in React Native app

Open `fin-app/src/api/client.js` and update:
```js
export const API_URL = 'https://fin-backend-production.up.railway.app'; // ← your Railway URL
```

---

## STEP 6 — React Native setup

```bash
# Install React Native CLI (if not installed)
npm install -g react-native-cli

# Create new RN project
npx react-native init FinApp
cd FinApp

# Copy all files from fin-app/ into FinApp/

# Install dependencies
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
npm install @react-native-picker/picker
npm install react-native-vector-icons
npm install axios

# iOS only
cd ios && pod install && cd ..

# Run on Android
npx react-native run-android

# Run on iOS
npx react-native run-ios
```

---

## STEP 7 — Test end-to-end

1. Open app → fill 4-step onboarding → tap "View my dashboard"
2. Dashboard should show your real ML health score
3. Go to **Chat** → ask "How can I save money?" → real Groq AI replies
4. Go to **Expenses** → add an expense → saved to Firestore
5. Go to **Social** → post something → stored in Firestore

---

## Folder structure

```
fin-backend/
├── main.py                          ← Updated backend
├── requirements.txt
├── Procfile                         ← Railway deployment
├── .env.example
├── models_def.py                    ← Your existing file
├── models/
│   ├── peer_benchmarker.pkl         ← Your existing file
│   └── budget_predictor.pkl         ← Your existing file
└── 1774019038452_final_dataset.csv  ← Your existing file

fin-app/
├── App.js                           ← Root navigation
└── src/
    ├── api/client.js                ← All API calls
    ├── context/UserContext.js       ← Global state
    └── screens/
        ├── OnboardingScreen.js      ← 4-step signup
        ├── SignInScreen.js
        ├── DashboardScreen.js       ← Health score + metrics
        ├── ExpensesScreen.js        ← Add/view expenses
        ├── ChatScreen.js            ← Real Groq chatbot ✨
        ├── BudgetScreen.js
        ├── ProgressScreen.js
        └── SocialScreen.js
```

---

## Quick troubleshooting

| Problem | Fix |
|---|---|
| `FIREBASE_CREDENTIALS_JSON` error | Paste the JSON as a single line, no newlines |
| `GROQ_API_KEY not set` | Add env var in Railway Variables tab |
| Android build fails | Run `npx react-native run-android` from project root, not src/ |
| iOS pods fail | `cd ios && pod install --repo-update` |
| Network request failed | Make sure API_URL points to Railway (not localhost) in client.js |
