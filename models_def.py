"""
models_def.py — Shared model class definitions.
Both train.py and main.py import from here so joblib
can always find PeerBenchmarker and BudgetPredictor
regardless of which file is __main__.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder

BUDGET_SPLITS = {
    "food": 0.35, "transport": 0.15, "rent": 0.20,
    "entertainment": 0.10, "shopping": 0.10, "others": 0.10
}


class PeerBenchmarker:
    def __init__(self, min_cohort_size=3):
        self.min_n = min_cohort_size
        self.benchmarks = {}

    def fit(self, df: pd.DataFrame):
        self.benchmarks["full"] = df.groupby(
            ["College_name", "Year_of_Study", "Living_Type"]
        )["Avg_Monthly_Spending"].agg(["mean","median","std","count"]).reset_index()

        self.benchmarks["year_living"] = df.groupby(
            ["Year_of_Study", "Living_Type"]
        )["Avg_Monthly_Spending"].agg(["mean","median","std","count"]).reset_index()

        self.benchmarks["living"] = df.groupby(
            "Living_Type"
        )["Avg_Monthly_Spending"].agg(["mean","median","std","count"]).reset_index()

        self.benchmarks["global"] = {
            "mean":   float(df["Avg_Monthly_Spending"].mean()),
            "median": float(df["Avg_Monthly_Spending"].median()),
            "std":    float(df["Avg_Monthly_Spending"].std()),
            "count":  int(len(df))
        }
        return self

    def query(self, college: str, year: int, living_type: str) -> dict:
        row = self.benchmarks["full"][
            (self.benchmarks["full"]["College_name"] == college.lower()) &
            (self.benchmarks["full"]["Year_of_Study"] == int(year)) &
            (self.benchmarks["full"]["Living_Type"]   == living_type.lower())
        ]
        if not row.empty and row.iloc[0]["count"] >= self.min_n:
            r = row.iloc[0]
            return {"cohort": f"{college.upper()} | Year {year} | {living_type}",
                    "avg": int(round(float(r["mean"]))),
                    "median": int(round(float(r["median"]))),
                    "std": int(round(float(r["std"]))) if not np.isnan(float(r["std"])) else 0,
                    "n": int(r["count"]), "fallback": False}

        row = self.benchmarks["year_living"][
            (self.benchmarks["year_living"]["Year_of_Study"] == int(year)) &
            (self.benchmarks["year_living"]["Living_Type"]   == living_type.lower())
        ]
        if not row.empty and row.iloc[0]["count"] >= self.min_n:
            r = row.iloc[0]
            return {"cohort": f"Year {year} | {living_type} (all colleges)",
                    "avg": int(round(float(r["mean"]))),
                    "median": int(round(float(r["median"]))),
                    "std": int(round(float(r["std"]))) if not np.isnan(float(r["std"])) else 0,
                    "n": int(r["count"]), "fallback": True}

        row = self.benchmarks["living"][
            self.benchmarks["living"]["Living_Type"] == living_type.lower()
        ]
        if not row.empty:
            r = row.iloc[0]
            return {"cohort": f"{living_type} students (global)",
                    "avg": int(round(float(r["mean"]))),
                    "median": int(round(float(r["median"]))),
                    "std": int(round(float(r["std"]))) if not np.isnan(float(r["std"])) else 0,
                    "n": int(r["count"]), "fallback": True}

        g = self.benchmarks["global"]
        return {"cohort": "All students", "avg": int(round(g["mean"])),
                "median": int(round(g["median"])), "std": int(round(g["std"])),
                "n": g["count"], "fallback": True}


class BudgetPredictor:
    def __init__(self):
        self.model        = None
        self.encoders     = {}
        self.feature_cols = []

    def _encode(self, df, fit=False):
        cat_cols = ["Gender", "College_name", "Living_Type",
                    "Part_time_job", "Main_Expense_Categories", "Save_Regularly"]
        df = df.copy()
        for col in cat_cols:
            if col not in df.columns:
                continue
            if fit:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                self.encoders[col] = le
            else:
                le = self.encoders[col]
                df[col] = df[col].astype(str).map(
                    lambda x, le=le: int(le.transform([x])[0]) if x in le.classes_ else -1
                )
        return df

    def fit(self, df: pd.DataFrame):
        from sklearn.model_selection import train_test_split, cross_val_score
        from sklearn.metrics import mean_absolute_error, r2_score

        self.feature_cols = [
            "Age", "Gender", "College_name", "Year_of_Study",
            "Living_Type", "Part_time_job", "Monthly_Income",
            "Main_Expense_Categories", "Save_Regularly"
        ]
        df_enc = self._encode(df[self.feature_cols + ["Avg_Monthly_Spending"]], fit=True)
        X = df_enc[self.feature_cols].values.astype(float)
        y = df_enc["Avg_Monthly_Spending"].values.astype(float)

        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
        self.model = GradientBoostingRegressor(
            n_estimators=200, max_depth=4, learning_rate=0.05,
            subsample=0.8, random_state=42
        )
        self.model.fit(X_tr, y_tr)

        mae = mean_absolute_error(y_te, self.model.predict(X_te))
        r2  = r2_score(y_te, self.model.predict(X_te))
        cv  = cross_val_score(self.model, X, y, cv=5, scoring="r2").mean()
        print(f"[OK] BudgetPredictor  MAE=Rs.{mae:.0f}  R2={r2:.3f}  CV-R2={cv:.3f}")
        return self

    def predict(self, age, gender, college, year, living_type,
                part_time, income, main_expense, saves) -> dict:
        row = pd.DataFrame([{
            "Age": int(age), "Gender": gender.lower(),
            "College_name": college.lower(), "Year_of_Study": int(year),
            "Living_Type": living_type.lower(), "Part_time_job": part_time.lower(),
            "Monthly_Income": float(income),
            "Main_Expense_Categories": main_expense.lower(),
            "Save_Regularly": saves.lower()
        }])
        row_enc   = self._encode(row, fit=False)
        X         = row_enc[self.feature_cols].values.astype(float)
        predicted = float(self.model.predict(X)[0])
        predicted = max(200.0, predicted)

        split = BUDGET_SPLITS.copy()
        if main_expense.lower() in split:
            boost  = 0.10
            others = [k for k in split if k != main_expense.lower()]
            split[main_expense.lower()] = min(split[main_expense.lower()] + boost, 0.60)
            excess = sum(split.values()) - 1.0
            for k in others:
                split[k] = max(0.0, split[k] - excess / len(others))

        budget_split = {
            cat: {"pct": round(pct * 100, 1), "amount": int(round(predicted * pct))}
            for cat, pct in split.items()
        }
        return {
            "predicted_spend":   int(round(predicted)),
            "budget_split":      budget_split,
            "savings_potential": int(round(max(0.0, income - predicted)))
        }
