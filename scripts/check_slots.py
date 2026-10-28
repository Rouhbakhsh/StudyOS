import json
with open("src/data/seedData.ts", "r", encoding="utf-8") as f:
    text = f.read()

# find slot definitions or check what seedData has
print("seedData length:", len(text))
