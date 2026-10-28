import pymupdf
import os

pdf_path = r'G:\ENG\Oxford Word Skills\1. Oxford Word Skills Elementary 2nd Edition.pdf'
doc = pymupdf.open(pdf_path)

out_dir = r'C:\Users\Roh\.gemini\antigravity\brain\37edc265-f5aa-41ac-8f2d-d676d65f6616\sample_ows_el'

# In Oxford Word Skills, Answer Key is usually at the end before Word List or after Word List
# Let's check pages 200, 205, 210, 215, 220, 225, 230
for pno in [200, 205, 208, 210, 212, 215, 220]:
    page = doc[pno]
    pix = page.get_pixmap(dpi=100)
    out_file = os.path.join(out_dir, f'check_key_{pno+1}.png')
    pix.save(out_file)
    print(f"Rendered Page {pno+1} -> {out_file}")
