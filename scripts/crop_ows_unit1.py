from PIL import Image
import os

img_path = r'C:\Users\Roh\.gemini\antigravity\brain\37edc265-f5aa-41ac-8f2d-d676d65f6616\sample_ows_el\ows_el_page_12.png'
im = Image.open(img_path)
w, h = im.size

# Let's crop the classroom illustration
# The image has a black outer border in the book page
# Let's crop around x: 485, y: 235, x2: 1115, y2: 785
crop_box = (485, 235, 1115, 785)
cropped = im.crop(crop_box)

out_path = r'F:\v2\public\books\ows-el\img\1-1.jpg'
os.makedirs(os.path.dirname(out_path), exist_ok=True)
cropped.convert('RGB').save(out_path, quality=95)
print(f"Cropped illustration: {cropped.size} saved to {out_path}")
