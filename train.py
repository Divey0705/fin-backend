"""
train.py — Run once to train and save models.
Usage:  py train.py
        py train.py --data path/to/your.csv
"""

import argparse
import warnings
import pandas as pd
import joblib
from pathlib import Path
from models_def import PeerBenchmarker, BudgetPredictor

warnings.filterwarnings("ignore")

BASE_DIR   = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)


def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [
        "Student_Name", "Age", "Gender", "College_name",
        "Year_of_Study", "Living_Type", "Part_time_job",
        "Monthly_Income", "Main_Expense_Categories",
        "Avg_Monthly_Spending", "Save_Regularly",
        "Monthly_Savings", "Know_Budgeting",
        "Know_Investments", "Track_Expenses", "Borrow_Often"
    ]
    str_cols = ["Gender", "College_name", "Living_Type", "Part_time_job",
                "Main_Expense_Categories", "Save_Regularly", "Know_Budgeting",
                "Know_Investments", "Track_Expenses", "Borrow_Often"]
    for col in str_cols:
        df[col] = df[col].astype(str).str.lower().str.strip()

    df["Living_Type"] = df["Living_Type"].replace({
        "day scholar": "day_scholar", "pg": "pg", "hostel": "hostel"
    })
    yes_no_cols = ["Part_time_job", "Save_Regularly", "Know_Budgeting",
                   "Know_Investments", "Track_Expenses", "Borrow_Often"]
    for col in yes_no_cols:
        df[col] = df[col].map(lambda x: "yes" if str(x).startswith("y") else "no")

    college_counts = df["College_name"].value_counts()
    minor = college_counts[college_counts < 3].index.tolist()
    df["College_name"] = df["College_name"].replace({c: "other" for c in minor})

    expense_map = {
        "bus ticket": "transport", "petrol": "transport", "travel": "transport",
        "dress": "shopping", "gym": "others", "game": "entertainment",
        "turf": "entertainment", "loan": "others"
    }
    df["Main_Expense_Categories"] = df["Main_Expense_Categories"].replace(expense_map)
    print(f"[OK] Loaded {len(df)} rows")
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="C:\\Users\\iamdi\\Downloads\\final_dataset.csv")
    args = parser.parse_args()

    df = load_and_clean(args.data)

    bench = PeerBenchmarker().fit(df)
    joblib.dump(bench, MODELS_DIR / "peer_benchmarker.pkl")
    print("[OK] peer_benchmarker.pkl saved")

    predictor = BudgetPredictor().fit(df)
    joblib.dump(predictor, MODELS_DIR / "budget_predictor.pkl")
    print("[OK] budget_predictor.pkl saved")

    print("\n[OK] Done. Now run: py -m uvicorn main:app --reload --port 8000")
