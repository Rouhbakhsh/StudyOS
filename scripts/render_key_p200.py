import pymupdf
import os

pdf_path = r'G:\ENG\Oxford Word Skills\1. Oxford Word Skills Elementary 2nd Edition.pdf'
doc = pymupdf.open(pdf_path)

out_dir = r'C:\Users\Roh\.gemini\antigravity\brain\37edc265-f5aa-41ac-8f2d-d676d65f6616\sample_ows_el'

# PDF page 200 is index 199
page = doc[199]
pix = page.get_pixmap(dpi=150)
out_file = os.path.join(out_dir, f'key_unit1_page200.png')
pix.save(out_file)
print(f"Rendered Unit 1 Key Page -> {out_file}")
