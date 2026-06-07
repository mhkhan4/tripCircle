from PIL import Image, ImageDraw, ImageFont
import numpy as np
import math

SIZE = 1024
cx, cy = SIZE // 2, SIZE // 2

# --- Gradient ring ---
y_grid, x_grid = np.mgrid[0:SIZE, 0:SIZE]
dx = x_grid - cx
dy = y_grid - cy
dist = np.sqrt(dx**2 + dy**2)

outer_r = 445
inner_r = 355

ring_mask = (dist >= inner_r) & (dist <= outer_r)

# Diagonal gradient: top-left = bright blue, bottom-right = dark navy
t = np.clip((x_grid + y_grid) / (2 * SIZE), 0, 1)
color_bright = np.array([66, 133, 244])
color_dark   = np.array([13,  27,  90])

img_arr = np.ones((SIZE, SIZE, 4), dtype=np.uint8) * 255
for c in range(3):
    img_arr[:, :, c] = np.where(
        ring_mask,
        (color_bright[c] * (1 - t) + color_dark[c] * t).astype(np.uint8),
        img_arr[:, :, c],
    )

result = Image.fromarray(img_arr, 'RGBA')
draw = ImageDraw.Draw(result)

# --- Font ---
font_size = 310
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Black.ttf', font_size)
text_color = (37, 99, 235, 255)

t_bb = draw.textbbox((0, 0), "T", font=font)
o_bb = draw.textbbox((0, 0), "O", font=font)
t_w, t_h = t_bb[2] - t_bb[0], t_bb[3] - t_bb[1]
o_w, o_h = o_bb[2] - o_bb[0], o_bb[3] - o_bb[1]

overlap = 18
total_w = t_w + o_w - overlap
start_x = cx - total_w // 2 - 10

t_x = start_x - t_bb[0]
t_y = cy - t_h // 2 - t_bb[1] - 15
o_x = start_x + t_w - overlap - o_bb[0]
o_y = cy - o_h // 2 - o_bb[1] - 15

draw.text((t_x, t_y), "T", font=font, fill=text_color)
draw.text((o_x, o_y), "O", font=font, fill=text_color)

# --- Plane icon ---
# Positioned at lower-right of the O, overlapping its edge (same placement as
# the original plane was at the C's opening), in matching blue.

# Plane in the white gap to the right of the O (mirror of original TC's plane
# at the C's opening). Absolute coords derived from measured O bounds:
# O right=734, inner ring right=867, O center_y≈497.
o_right  = o_x + o_bb[2]          # actual right pixel of O
o_mid_y  = (o_y + o_bb[1] + o_y + o_bb[3]) // 2   # vertical centre of O
plane_x  = o_right + 38           # overlaps the O's right edge slightly
plane_y  = o_mid_y + 12           # just below O centre

def make_plane(pcx, pcy, size, angle_deg):
    """Top-down airplane. Default body points UP (nose at -y); angle rotates it.
    +45 deg puts the nose upper-right in screen coords (y-down)."""
    angle = math.radians(angle_deg)

    def rot(px, py):
        c, s = math.cos(angle), math.sin(angle)
        return pcx + px * c - py * s, pcy + px * s + py * c

    s = size
    fuselage = [
        rot( 0,          -s * 0.90),
        rot( s * 0.09,   -s * 0.55),
        rot( s * 0.09,    s * 0.50),
        rot( 0,           s * 0.90),
        rot(-s * 0.09,    s * 0.50),
        rot(-s * 0.09,   -s * 0.55),
    ]
    right_wing = [
        rot( s * 0.09,  -s * 0.05),
        rot( s * 0.68,   s * 0.32),
        rot( s * 0.58,   s * 0.48),
        rot( s * 0.09,   s * 0.20),
    ]
    left_wing = [
        rot(-s * 0.09,  -s * 0.05),
        rot(-s * 0.68,   s * 0.32),
        rot(-s * 0.58,   s * 0.48),
        rot(-s * 0.09,   s * 0.20),
    ]
    right_tail = [
        rot( s * 0.09,   s * 0.54),
        rot( s * 0.33,   s * 0.76),
        rot( s * 0.27,   s * 0.86),
        rot( s * 0.09,   s * 0.68),
    ]
    left_tail = [
        rot(-s * 0.09,   s * 0.54),
        rot(-s * 0.33,   s * 0.76),
        rot(-s * 0.27,   s * 0.86),
        rot(-s * 0.09,   s * 0.68),
    ]
    return fuselage, right_wing, left_wing, right_tail, left_tail

plane_color = (37, 99, 235, 255)   # same blue as letters, on white background
plane_size  = 95
angle_deg   = 45   # +45 → nose points upper-right in screen coords

for part in make_plane(plane_x, plane_y, plane_size, angle_deg):
    draw.polygon(part, fill=plane_color)

# --- Save all asset sizes ---
BASE = '/Users/mahmudulkhan/Downloads/projects/tripcircle/assets'
result.save(f'{BASE}/logo.png')
result.save(f'{BASE}/icon.png')
result.save(f'{BASE}/splash-icon.png')
result.resize((48, 48), Image.LANCZOS).save(f'{BASE}/favicon.png')

print('Done.')
