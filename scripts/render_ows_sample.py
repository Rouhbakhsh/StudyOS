import pymupdf
import os

pdf_path = r'G:\ENG\Oxford Word Skills\1. Oxford Word Skills Elementary 2nd Edition.pdf'
doc = pymupdf.open(pdf_path)

out_dir = r'C:\Users\Roh\.gemini\antigravity\brain\37edc265-f5aa-41ac-8f2d-d676d65f6616\sample_ows_el'
os.makedirs(out_dir, exist_ok=True)

# Render pages 10 to 16 to find Unit 1
for pno in range(10, 16):
    page = doc[pno]
    pix = page.get_pixmap(dpi=150)
    out_file = os.path.join(out_dir, f'ows_el_page_{pno+1}.png')
    pix.save(out_file)
    print(f"Saved PDF Page {pno+1} -> {out_file} ({pix.width}x{pix.height})")
