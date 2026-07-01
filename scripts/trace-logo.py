#!/usr/bin/env python3
"""Trace the black cog shape from vortex-transparent.png to SVG."""

from PIL import Image
import numpy as np
import math
from collections import deque

def moore_neighbor(binary, start=None):
    h, w = binary.shape
    if start is None:
        for y in range(h):
            row = np.where(binary[y])[0]
            if len(row):
                start = (row[0], y)
                break
        if start is None:
            return []
    dirs = [(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0)]
    boundary = []
    cx, cy = start
    prev_dir = 7
    while True:
        boundary.append((cx, cy))
        found = False
        for i in range(8):
            nd = (prev_dir + 1 + i) % 8
            dx, dy = dirs[nd]
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and binary[ny, nx]:
                cx, cy = nx, ny
                prev_dir = (nd + 4) % 8
                found = True
                break
        if not found or ((cx, cy) == start and len(boundary) > 3):
            break
        if len(boundary) > 50000:
            break
    return boundary

def rdp(points, eps):
    if len(points) <= 2:
        return points
    x0, y0 = points[0]
    x1, y1 = points[-1]
    dx = x1 - x0
    dy = y1 - y0
    ll = dx*dx + dy*dy
    dmax = 0
    idx = 0
    for i in range(1, len(points)-1):
        xi, yi = points[i]
        if ll == 0:
            d = math.hypot(xi-x0, yi-y0)
        else:
            t = max(0, min(1, ((xi-x0)*dx + (yi-y0)*dy) / ll))
            d = math.hypot(xi - (x0 + t*dx), yi - (y0 + t*dy))
        if d > dmax:
            dmax = d
            idx = i
    if dmax > eps:
        left = rdp(points[:idx+1], eps)
        right = rdp(points[idx:], eps)
        return left[:-1] + right
    return [points[0], points[-1]]

def trace_component(binary, start, visited):
    """Flood fill to find component, return its mask."""
    h, w = binary.shape
    comp_mask = np.zeros_like(binary, dtype=bool)
    q = deque([start])
    visited[start[1], start[0]] = True
    while q:
        cx, cy = q.popleft()
        comp_mask[cy, cx] = True
        for dx, dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
            nx, ny = cx+dx, cy+dy
            if 0 <= nx < w and 0 <= ny < h and binary[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))
    return comp_mask

def find_holes(binary, body_mask):
    """Find holes within the body (background pixels surrounded by body)."""
    h, w = binary.shape
    # Invert body mask to get background
    bg = ~body_mask
    # Flood from edges to find exterior background
    exterior = np.zeros_like(binary, dtype=bool)
    stack = []
    for x in range(w):
        if bg[0, x] and not exterior[0, x]: stack.append((x, 0))
        if bg[h-1, x] and not exterior[h-1, x]: stack.append((x, h-1))
    for y in range(h):
        if bg[y, 0] and not exterior[y, 0]: stack.append((0, y))
        if bg[y, w-1] and not exterior[y, w-1]: stack.append((w-1, y))
    while stack:
        px, py = stack.pop()
        if px < 0 or px >= w or py < 0 or py >= h: continue
        if exterior[py, px] or body_mask[py, px]: continue
        exterior[py, px] = True
        stack.extend([(px-1,py),(px+1,py),(px,py-1),(px,py+1)])
    # Interior holes are background but not exterior
    holes = bg & ~exterior
    return holes

img = Image.open('public/images/vortex-transparent.png').convert('RGBA')
arr = np.array(img)
h, w = arr.shape[:2]

# Isolate black pixels with alpha
alpha = arr[:,:,3] > 0
black = (arr[:,:,0] < 60) & (arr[:,:,1] < 60) & (arr[:,:,2] < 60)
cog = black & alpha

# Clean up: dilate to connect nearby black regions
dilated = cog.copy()
for _ in range(1):
    temp = dilated.copy()
    for y in range(h):
        for x in range(w):
            if cog[y, x]:
                for dy in (-1,0,1):
                    for dx in (-1,0,1):
                        ny, nx = y+dy, x+dx
                        if 0 <= nx < w and 0 <= ny < h:
                            temp[ny, nx] = True
    dilated = temp

# Erode to thin the black lines before tracing
for _ in range(2):
    temp = dilated.copy()
    for y in range(1, h-1):
        for x in range(1, w-1):
            if dilated[y, x]:
                if not (dilated[y-1, x] and dilated[y+1, x] and dilated[y, x-1] and dilated[y, x+1] and
                        dilated[y-1, x-1] and dilated[y-1, x+1] and dilated[y+1, x-1] and dilated[y+1, x+1]):
                    temp[y, x] = False
    dilated = temp

# Find components
visited = np.zeros_like(dilated, dtype=bool)
contours = []
for y in range(h):
    for x in range(w):
        if not dilated[y, x] or visited[y, x]:
            continue
        comp = trace_component(dilated, (x, y), visited)
        if np.sum(comp) < 100:
            continue
        # Find start for tracing
        start = None
        for py in range(h):
            row = np.where(comp[py])[0]
            if len(row):
                start = (row[0], py)
                break
        if start:
            c = moore_neighbor(comp, start)
            if len(c) > 10:
                s = rdp(c, 1.5)
                contours.append(s)
                print(f'  outer contour: {len(c)} -> {len(s)} pts')

# Find holes in the combined body
body = np.zeros_like(dilated, dtype=bool)
for y in range(h):
    for x in range(w):
        if dilated[y, x]:
            body[y, x] = True

holes = find_holes(dilated, body)
if np.any(holes):
    hole_contours = []
    hole_visited = np.zeros_like(holes, dtype=bool)
    for y in range(h):
        for x in range(w):
            if not holes[y, x] or hole_visited[y, x]:
                continue
            comp = trace_component(holes, (x, y), hole_visited)
            if np.sum(comp) < 20:
                continue
            start = None
            for py in range(h):
                row = np.where(comp[py])[0]
                if len(row):
                    start = (row[0], py)
                    break
            if start:
                c = moore_neighbor(comp, start)
                if len(c) > 10:
                    s = rdp(c, 0.8)
                    hole_contours.append(s)
                    print(f'  inner hole: {len(c)} -> {len(s)} pts')

# Generate SVG paths
paths = []
for c in contours:
    d = f'M {c[0][0]},{c[0][1]}'
    for p in c[1:]:
        d += f' L {p[0]},{p[1]}'
    d += ' Z'
    paths.append(d)

for c in hole_contours:
    d = f'M {c[0][0]},{c[0][1]}'
    for p in c[1:]:
        d += f' L {p[0]},{p[1]}'
    d += ' Z'
    paths.append(d)

# Adjust -- move and scale to fit viewBox nicely
# Content is roughly 18-237, center at 128, size ~220
# Scale to something reasonable and center
# Let's output in original coordinates (256x256)
print(f'\nTotal paths: {len(paths)}')

# Output SVG
svg_path = 'public/images/vortex-cog.svg'
lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">',
    '  <defs>',
    '    <clipPath id="cog-clip">',
]
for p in paths:
    lines.append(f'      <path d="{p}"/>')
lines.append('    </clipPath>')
lines.append('  </defs>')
lines.append(f'  <path d="{" ".join(paths)}" fill="#000"/>')
lines.append('</svg>')

with open(svg_path, 'w') as f:
    f.write('\n'.join(lines))
print(f'Wrote {svg_path}')
