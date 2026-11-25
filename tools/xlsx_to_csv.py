import sys

import pandas as pd

if len(sys.argv) != 3:
    print("Usage: python xlsx_to_csv.py input.xlsx output.csv")
    sys.exit(1)

source, target = sys.argv[1], sys.argv[2]
sheets = pd.read_excel(source, sheet_name=None, dtype=str)
frame = pd.concat(sheets.values(), ignore_index=True)
frame.to_csv(target, index=False)
print(f"Wrote {len(frame)} rows from {len(sheets)} sheet(s) to {target}")
