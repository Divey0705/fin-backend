"""
Fin — Personal Finance Manager  |  FastAPI Backend v3
======================================================
Changes from v2:
  - Flat-file DB replaced with Firebase Firestore
  - /chat endpoint powered by Groq (llama3-8b-8192)
  - Ready for Railway deployment

Env vars required (set in Railway dashboard):
  FIREBASE_CREDENTIALS_JSON   → paste your serviceAccountKey.json content as a string
  GROQ_API_KEY                → your Groq API key

Run locally:
  py -m uvicorn main:app --reload --port 8000
"""

import uuid, json, math, hashlib, warnings, os, joblib
import numpy as np
import pandas as pd

from pathlib import Path
from datetime import datetime
from functools import lru_cache
from typing import Optional, Literal, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import firebase_admin
from firebase_admin import credentials, firestore as fs

from groq import Groq

warnings.filterwarnings("ignore")

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
DATA_PATH  = BASE_DIR / "final_dataset.csv"

# ── Firebase init ──────────────────────────────────────────────────────────
def _init_firebase():
    if firebase_admin._apps:
        return fs.client()
    cred_env = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    if cred_env:
        cred = credentials.Certificate(json.loads(cred_env))
    else:
        # Local dev: place serviceAccountKey.json in project root
        cred = credentials.Certificate(BASE_DIR / "serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    return fs.client()

def get_db():
    return _init_firebase()

# ── Groq client ────────────────────────────────────────────────────────────
def get_groq():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set")
    return Groq(api_key=api_key)

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(title="Fin API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ────────────────────────────────────────────────────────────────
def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def _haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _initials(name: str) -> str:
    return "".join(w[0] for w in name.split()).upper()[:2]

def _time_label(created_at: str) -> str:
    try:
        created = datetime.fromisoformat(created_at)
        diff_min = int((datetime.now() - created).total_seconds() / 60)
        if diff_min < 1:    return "Just now"
        if diff_min < 60:   return f"{diff_min} min ago"
        if diff_min < 1440: return f"{diff_min // 60} hr ago"
        return f"{diff_min // 1440} days ago"
    except:
        return ""

# ── Model loaders ──────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_benchmarker():
    return joblib.load(MODELS_DIR / "peer_benchmarker.pkl")

@lru_cache(maxsize=1)
def get_predictor():
    return joblib.load(MODELS_DIR / "budget_predictor.pkl")

LIVING_MAP = {"alone": "day_scholar", "family": "day_scholar", "shared": "pg", "pg": "hostel"}

# ── Health scoring ──────────────────────────────────────────────────────────
HEALTH_WEIGHTS = {"know_budgeting": 15, "know_investments": 15, "track_expenses": 20, "borrow_often": 25, "save_regularly": 25}
HEALTH_LABELS  = [(80, "Financial Champion"), (60, "Getting There"), (40, "Needs Attention"), (0, "At Risk")]
HEALTH_TIPS    = {
    "know_budgeting":   "Learn the 50/30/20 rule — needs, wants, savings.",
    "know_investments": "Start with ₹500/month SIP in a mutual fund.",
    "track_expenses":   "Use Fin to log daily expenses consistently.",
    "borrow_often":     "Build a ₹1,000 emergency fund to avoid borrowing.",
    "save_regularly":   "Set a standing instruction to auto-save on the 1st.",
}

def _compute_health(kb, ki, te, bo, sr) -> dict:
    answers = {"know_budgeting": kb, "know_investments": ki, "track_expenses": te, "borrow_often": bo, "save_regularly": sr}
    breakdown, total = {}, 0
    for dim, max_pts in HEALTH_WEIGHTS.items():
        val    = answers[dim]
        earned = max_pts if (val == "no" if dim == "borrow_often" else val == "yes") else 0
        breakdown[dim] = {"earned": earned, "max": max_pts, "passed": earned == max_pts}
        total += earned
    label = next(lbl for thr, lbl in HEALTH_LABELS if total >= thr)
    gaps  = [HEALTH_TIPS[d] for d, info in breakdown.items() if not info["passed"]]
    return {"score": total, "out_of": 100, "label": label, "breakdown": breakdown, "action_steps": gaps}

def _run_ml(age, gender, living_type, part_time_job, monthly_income, main_expense_category, save_regularly, avg_monthly_spending):
    """Run ML models, fall back to defaults if models unavailable."""
    try:
        bench     = get_benchmarker()
        predictor = get_predictor()
        model_living = LIVING_MAP.get(living_type, "day_scholar")
        budget = predictor.predict(age, gender, "other", 1, model_living, part_time_job, monthly_income, main_expense_category, save_regularly)
        cohort = bench.query("other", 1, model_living)
    except Exception:
        budget = {
            "predicted_spend":   avg_monthly_spending,
            "savings_potential": max(0, monthly_income - avg_monthly_spending),
            "budget_split":      {}
        }
        cohort = {"cohort": "Global average", "avg": int(avg_monthly_spending), "n": 0}
    return budget, cohort

# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

YesNo           = Literal["yes", "no"]
LivingType      = Literal["alone", "family", "shared", "pg"]
GenderType      = Literal["male", "female", "other"]
ExpenseCategory = Literal["food", "transport", "rent", "entertainment", "shopping", "others"]
OccupationType  = Literal["student", "employed", "self_employed", "freelancer", "other"]

class RegisterRequest(BaseModel):
    name:                  str
    age:                   int             = Field(..., ge=13, le=80)
    gender:                GenderType
    occupation:            OccupationType
    living_type:           LivingType
    part_time_job:         YesNo
    monthly_income:        float           = Field(..., ge=0)
    main_expense_category: ExpenseCategory
    avg_monthly_spending:  float           = Field(..., ge=0)
    save_regularly:        YesNo
    monthly_savings:       float           = 0
    know_budgeting:        YesNo
    know_investments:      YesNo
    track_expenses:        YesNo
    borrow_often:          YesNo
    email:                 str
    password:              str             = Field(..., min_length=8)
    latitude:              Optional[float] = None
    longitude:             Optional[float] = None

class LoginRequest(BaseModel):
    email:    str
    password: str

class ExpenseRequest(BaseModel):
    user_id:     str
    category:    ExpenseCategory
    description: str
    amount:      float = Field(..., gt=0)
    date:        Optional[str] = None

class PostRequest(BaseModel):
    user_id:   str
    content:   str
    tag:       str           = "General"
    latitude:  Optional[float] = None
    longitude: Optional[float] = None

class ChatMessage(BaseModel):
    role:    Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    user_id:        str
    messages:       List[ChatMessage]  # full conversation history
    monthly_income: float = 0
    health_score:   int   = 0
    predicted_spend: float = 0

# ═══════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/register")
def register(req: RegisterRequest):
    db = get_db()

    # Check email uniqueness
    existing = db.collection("users").where("email", "==", req.email).limit(1).get()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = str(uuid.uuid4())[:8]
    budget, cohort = _run_ml(req.age, req.gender, req.living_type, req.part_time_job,
                              req.monthly_income, req.main_expense_category,
                              req.save_regularly, req.avg_monthly_spending)
    health = _compute_health(req.know_budgeting, req.know_investments,
                             req.track_expenses, req.borrow_often, req.save_regularly)

    user_data = {
        "user_id": user_id, "name": req.name, "age": req.age,
        "gender": req.gender, "occupation": req.occupation,
        "living_type": req.living_type, "part_time_job": req.part_time_job,
        "monthly_income": req.monthly_income,
        "main_expense_category": req.main_expense_category,
        "avg_monthly_spending": req.avg_monthly_spending,
        "save_regularly": req.save_regularly, "monthly_savings": req.monthly_savings,
        "know_budgeting": req.know_budgeting, "know_investments": req.know_investments,
        "track_expenses": req.track_expenses, "borrow_often": req.borrow_often,
        "email": req.email, "password_hash": _hash(req.password),
        "latitude": req.latitude, "longitude": req.longitude,
        "created_at": datetime.now().isoformat(),
        "profile_snapshot": [{"date": datetime.now().strftime("%Y-%m"), "score": health["score"]}]
    }

    db.collection("users").document(user_id).set(user_data)

    savings_rate = (budget["savings_potential"] / req.monthly_income * 100) if req.monthly_income > 0 else 0
    diff = budget["predicted_spend"] - cohort["avg"]

    return {
        "success": True, "user_id": user_id,
        "name": req.name, "initials": _initials(req.name),
        "occupation": req.occupation, "living_type": req.living_type,
        "monthly_income": req.monthly_income,
        "peer_benchmark": {
            "cohort": cohort["cohort"], "cohort_avg": cohort["avg"],
            "cohort_size": cohort["n"],
            "vs_peers": "above average" if diff > 0 else "below average",
            "diff_amount": round(abs(diff)),
        },
        "budget_prediction": {
            "predicted_spend": budget["predicted_spend"],
            "savings_potential": budget["savings_potential"],
            "savings_rate_pct": round(savings_rate, 1),
            "budget_split": budget["budget_split"],
        },
        "health_score": health,
        "summary_card": {
            "predicted_spend": budget["predicted_spend"],
            "cohort_avg_spend": cohort["avg"],
            "health_score": health["score"],
            "health_label": health["label"],
        }
    }


@app.post("/login")
def login(req: LoginRequest):
    db = get_db()
    docs = db.collection("users").where("email", "==", req.email).limit(1).get()
    if not docs:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = docs[0].to_dict()
    if user["password_hash"] != _hash(req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    budget, cohort = _run_ml(user["age"], user["gender"], user["living_type"],
                              user["part_time_job"], user["monthly_income"],
                              user["main_expense_category"], user["save_regularly"],
                              user["avg_monthly_spending"])
    health = _compute_health(user["know_budgeting"], user["know_investments"],
                             user["track_expenses"], user["borrow_often"], user["save_regularly"])

    # Today's spending from Firestore
    today = datetime.now().strftime("%Y-%m-%d")
    exp_docs = db.collection("expenses").where("user_id", "==", user["user_id"]).where("date", "==", today).get()
    today_total = sum(d.to_dict()["amount"] for d in exp_docs)

    savings_rate = (budget["savings_potential"] / user["monthly_income"] * 100) if user["monthly_income"] > 0 else 0
    diff = budget["predicted_spend"] - cohort["avg"]

    return {
        "success": True, "user_id": user["user_id"],
        "name": user["name"], "email": user["email"],
        "occupation": user["occupation"], "living_type": user["living_type"],
        "initials": _initials(user["name"]),
        "monthly_income": user["monthly_income"],
        "peer_benchmark": {
            "cohort": cohort["cohort"], "cohort_avg": cohort["avg"],
            "cohort_size": cohort["n"],
            "vs_peers": "above average" if diff > 0 else "below average",
            "diff_amount": round(abs(diff)),
        },
        "budget_prediction": {
            "predicted_spend": budget["predicted_spend"],
            "savings_potential": budget["savings_potential"],
            "savings_rate_pct": round(savings_rate, 1),
            "budget_split": budget["budget_split"],
        },
        "health_score": health,
        "today_spending": round(today_total),
        "profile_snapshot": user.get("profile_snapshot", []),
        "summary_card": {
            "predicted_spend": budget["predicted_spend"],
            "cohort_avg_spend": cohort["avg"],
            "health_score": health["score"],
            "health_label": health["label"],
        }
    }

# ═══════════════════════════════════════════════════════════════════════════
# GROQ AI CHAT
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/chat")
def chat(req: ChatRequest):
    """Real AI chatbot powered by Groq llama3-8b-8192."""
    client = get_groq()

    system_prompt = f"""You are Fin AI, a friendly personal finance advisor built into the Fin app.
You know the user's financial profile:
- Monthly income: ₹{req.monthly_income:,.0f}
- Financial health score: {req.health_score}/100
- Predicted monthly spend: ₹{req.predicted_spend:,.0f}

Rules:
- Be concise (2-4 sentences max per reply)
- Use Indian context: ₹, SIP, mutual funds, UPI etc.
- Give actionable, specific advice
- Be encouraging but honest
- If you don't know something specific, say so and suggest they consult a SEBI-registered advisor"""

    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in req.messages]

    try:
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=messages,
            max_tokens=400,
            temperature=0.7,
        )
        reply = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq error: {str(e)}")

    # Save to Firestore for history (optional)
    try:
        db = get_db()
        db.collection("chat_history").add({
            "user_id": req.user_id,
            "question": req.messages[-1].content if req.messages else "",
            "reply": reply,
            "created_at": datetime.now().isoformat(),
        })
    except:
        pass  # non-critical

    return {"reply": reply}

# ═══════════════════════════════════════════════════════════════════════════
# EXPENSES
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/expenses")
def add_expense(req: ExpenseRequest):
    db = get_db()
    today = datetime.now().strftime("%Y-%m-%d")
    expense = {
        "id": str(uuid.uuid4())[:8],
        "user_id": req.user_id,
        "category": req.category,
        "description": req.description,
        "amount": req.amount,
        "date": req.date or today,
        "time": datetime.now().strftime("%H:%M"),
        "created_at": datetime.now().isoformat(),
    }
    db.collection("expenses").add(expense)

    # Recompute totals
    all_exp = db.collection("expenses").where("user_id", "==", req.user_id).get()
    this_month = datetime.now().strftime("%Y-%m")
    today_total = sum(d.to_dict()["amount"] for d in all_exp if d.to_dict().get("date", "") == today)
    month_total = sum(d.to_dict()["amount"] for d in all_exp if d.to_dict().get("date", "")[:7] == this_month)

    return {
        "success": True, "expense": expense,
        "today_total": round(today_total),
        "month_total": round(month_total),
    }


@app.get("/expenses/{user_id}")
def get_expenses(user_id: str, limit: int = Query(50, le=200)):
    db = get_db()
    docs = db.collection("expenses").where("user_id", "==", user_id).order_by("created_at", direction=fs.Query.DESCENDING).limit(limit).get()
    expenses = [d.to_dict() for d in docs]

    today      = datetime.now().strftime("%Y-%m-%d")
    this_month = datetime.now().strftime("%Y-%m")
    today_total = sum(e["amount"] for e in expenses if e.get("date", "") == today)
    month_total = sum(e["amount"] for e in expenses if e.get("date", "")[:7] == this_month)

    from collections import defaultdict
    cat_totals = defaultdict(float)
    for e in expenses:
        if e.get("date", "")[:7] == this_month:
            cat_totals[e["category"]] += e["amount"]

    return {
        "expenses": expenses,
        "today_total": round(today_total),
        "month_total": round(month_total),
        "category_breakdown": {k: round(v) for k, v in cat_totals.items()},
    }

# ═══════════════════════════════════════════════════════════════════════════
# SOCIAL FEED
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/social/post")
def create_post(req: PostRequest):
    db = get_db()
    user_doc = db.collection("users").document(req.user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    user = user_doc.to_dict()

    post = {
        "post_id":   str(uuid.uuid4())[:8],
        "user_id":   req.user_id,
        "author":    user["name"],
        "initials":  _initials(user["name"]),
        "content":   req.content,
        "tag":       req.tag,
        "latitude":  req.latitude or user.get("latitude"),
        "longitude": req.longitude or user.get("longitude"),
        "likes":     0,
        "liked_by":  [],
        "comments":  0,
        "created_at": datetime.now().isoformat(),
    }
    db.collection("posts").add(post)
    return {"success": True, "post": post}


@app.get("/social/feed")
def get_feed(
    lat:    Optional[float] = Query(None),
    lon:    Optional[float] = Query(None),
    radius: float           = Query(5.0),
    limit:  int             = Query(30, le=100),
    tag:    Optional[str]   = Query(None),
):
    db    = get_db()
    docs  = db.collection("posts").order_by("created_at", direction=fs.Query.DESCENDING).limit(200).get()
    result = []
    for doc in docs:
        p    = doc.to_dict()
        dist = None
        if lat and lon and p.get("latitude") and p.get("longitude"):
            dist = round(_haversine(lat, lon, p["latitude"], p["longitude"]), 1)
            if dist > radius:
                continue
        if tag and tag.lower() not in ("all", "") and p.get("tag", "").lower() != tag.lower():
            continue
        p["distance_km"] = dist
        p["time_label"]  = _time_label(p.get("created_at", ""))
        result.append(p)
        if len(result) >= limit:
            break
    return {"posts": result, "total": len(result)}


@app.post("/social/like/{post_id}")
def like_post(post_id: str, user_id: str = Query(...)):
    db   = get_db()
    docs = db.collection("posts").where("post_id", "==", post_id).limit(1).get()
    if not docs:
        raise HTTPException(status_code=404, detail="Post not found")
    ref  = docs[0].reference
    post = docs[0].to_dict()
    liked_by = post.get("liked_by", [])
    if user_id in liked_by:
        liked_by.remove(user_id)
        liked = False
    else:
        liked_by.append(user_id)
        liked = True
    new_likes = len(liked_by)
    ref.update({"liked_by": liked_by, "likes": new_likes})
    return {"success": True, "likes": new_likes, "liked": liked}


@app.get("/")
def root():
    return {"status": "ok", "app": "Fin API", "version": "3.0.0"}
