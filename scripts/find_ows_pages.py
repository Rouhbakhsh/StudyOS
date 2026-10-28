import pymupdf

pdf_path = r'G:\ENG\Oxford Word Skills\1. Oxford Word Skills Elementary 2nd Edition.pdf'
doc = pymupdf.open(pdf_path)

print(f"Total pages: {len(doc)}")

# Look for Unit 1 title or page numbers
for idx, page in enumerate(doc):
    text = page.get_text()
    if 'classroom' in text.lower() and ('unit 1' in text.lower() or ' 1 ' in text):
        print(f"[Unit 1 Match] PDF Page {idx+1}:")
        for line in text.split('\n')[:10]:
            if line.strip():
                print(f"   {line.strip()}")
        print("-" * 40)

# Look for Answer key for Unit 1
for idx in range(len(doc)-60, len(doc)):
    text = doc[idx].get_text()
    if 'unit 1' in text.lower() and ('answer key' in text.lower() or 'key' in text.lower() or '1.1' in text):
        print(f"[Answer Key Match] PDF Page {idx+1}:")
        for line in text.split('\n')[:15]:
            if line.strip():
                print(f"   {line.strip()}")
        print("=" * 40)
