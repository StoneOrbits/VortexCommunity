#!/usr/bin/env python3
"""Trace device PNG contours to clean SVG.
Handles multi-component bodies (gloves) and inner holes (orbit)."""

from PIL import Image
import numpy as np
import os, json, math
from collections import deque

def moore_neighbor(binary, start):
    """Trace one outer contour given a binary mask and a starting pixel."""
    h, w = binary.shape
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
        if not found or (cx, cy) == start or len(boundary) > 50000:
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

def trace_all_components(binary, min_size=100):
    """Find all connected components and trace their contours."""
    h, w = binary.shape
    visited = np.zeros_like(binary, dtype=bool)
    all_contours = []

    for y in range(h):
        for x in range(w):
            if not binary[y, x] or visited[y, x]:
                continue
            # Flood-fill this component
            comp_pixels = []
            q = deque([(x, y)])
            visited[y, x] = True
            while q:
                cx, cy = q.popleft()
                comp_pixels.append((cx, cy))
                for dx, dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
                    nx, ny = cx+dx, cy+dy
                    if 0 <= nx < w and 0 <= ny < h and binary[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((nx, ny))

            if len(comp_pixels) < min_size:
                continue

            # Create binary mask just for this component
            comp_mask = np.zeros_like(binary, dtype=bool)
            for px, py in comp_pixels:
                comp_mask[py, px] = True

            # Find start: topmost, then leftmost
            start = None
            for py in range(h):
                row = np.where(comp_mask[py])[0]
                if len(row):
                    start = (row[0], py)
                    break

            if start:
                contour = moore_neighbor(comp_mask, start)
                if len(contour) > 5:
                    all_contours.append(contour)

    return all_contours

def detect_inner_holes(binary, min_area=30):
    """Find inner holes (background regions not connected to image border).
    Uses morphological close to bridge anti-aliasing gaps."""
    h, w = binary.shape

    # Morphological close: dilate then erode to fill tiny gaps in body
    closed = binary.copy()
    # Dilate 1 iteration (8-neighbor) — just enough to bridge anti-aliasing gaps
    for _ in range(1):
        dilated = np.zeros_like(closed)
        for y in range(h):
            for x in range(w):
                if closed[y, x]:
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny, nx = y+dy, x+dx
                            if 0 <= nx < w and 0 <= ny < h:
                                dilated[ny, nx] = True
        closed = dilated

    # Now flood-fill background from edges on the CLOSED mask
    background = np.zeros_like(binary, dtype=bool)
    stack = []
    for x in range(w):
        if not closed[0, x] and not background[0, x]: stack.append((x, 0))
        if not closed[h-1, x] and not background[h-1, x]: stack.append((x, h-1))
    for y in range(h):
        if not closed[y, 0] and not background[y, 0]: stack.append((0, y))
        if not closed[y, w-1] and not background[y, w-1]: stack.append((w-1, y))
    while stack:
        px, py = stack.pop()
        if px < 0 or px >= w or py < 0 or py >= h: continue
        if background[py, px] or closed[py, px]: continue
        background[py, px] = True
        stack.extend([(px-1,py),(px+1,py),(px,py-1),(px,py+1)])

    # Hole mask: transparent on closed mask, not background
    hole_mask_closed = ~closed & ~background

    # Find hole components
    hole_parts = []
    hole_visited = np.zeros_like(binary, dtype=bool)
    for y in range(h):
        for x in range(w):
            if not hole_mask_closed[y, x] or hole_visited[y, x]:
                continue
            comp = []
            q = deque([(x, y)])
            hole_visited[y, x] = True
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                    nx, ny = cx+dx, cy+dy
                    if 0 <= nx < w and 0 <= ny < h and hole_mask_closed[ny, nx] and not hole_visited[ny, nx]:
                        hole_visited[ny, nx] = True
                        q.append((nx, ny))
            if len(comp) >= min_area:
                hole_parts.append(comp)

    # Trace the boundary of each hole by tracing the hole's edge on the closed mask
    rings = []
    for comp in hole_parts:
        hole_local = np.zeros_like(binary, dtype=bool)
        for px, py in comp:
            hole_local[py, px] = True

        # Trace the outer contour of the hole directly on its own mask
        contour = moore_neighbor(hole_local, None)
        if len(contour) > 10:
            rings.append(contour)

    return rings

# Overload: if start is None, find one automatically
def moore_neighbor(binary, start):
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
        if not found or (cx, cy) == start or len(boundary) > 50000:
            break
    return boundary

def path_str(pts, closed=True):
    if not pts: return ''
    s = f'M {pts[0][0]},{pts[0][1]}'
    for p in pts[1:]:
        s += f' L {p[0]},{p[1]}'
    if closed: s += ' Z'
    return s

def convert_device(png_path, positions_json, svg_path, name):
    print(f'\n=== {name} ===')
    img = Image.open(png_path).convert('RGBA')
    arr = np.array(img)
    binary = arr[:,:,3] > 50

    # Track all outer contours (gloves = 5 separate components)
    outer_contours = trace_all_components(binary, min_size=500)
    print(f'  outer components: {len(outer_contours)}')

    simplified = []
    for i, c in enumerate(outer_contours):
        s = rdp(c, eps=1.2)
        print(f'  component {i}: {len(c)} -> {len(s)} pts')
        simplified.append(s)

    # Inner holes (orbit center)
    rings = detect_inner_holes(binary, min_area=30)
    print(f'  inner rings: {len(rings)}')
    ring_paths = []
    for r in rings:
        rs = rdp(r, 0.5)
        if len(rs) > 5:
            ring_paths.append(rs)

    # LED positions
    holes = []
    if os.path.exists(positions_json):
        with open(positions_json) as f:
            data = json.load(f)
        for i, p in enumerate(data.get('points', [])):
            if name == 'orbit':
                r = 15
            elif name == 'duo':
                r = 16
            elif name == 'chromadeck':
                r = 13
            elif name == 'spark':
                r = 14
            elif name == 'gloves':
                r = 14
            elif name == 'handle':
                r = 14
            else:
                r = 12
            holes.append({'cx': p['x'], 'cy': p['y'], 'r': r})

    lines = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 250">',
             '  <defs>',
             '    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">',
              '      <stop offset="0%" stop-color="#3d3d3d"/>',
             '      <stop offset="100%" stop-color="#222"/>',
             '    </linearGradient>',
             '  </defs>']

    # Group into one <g> for the device body
    for s in simplified:
        lines.append(f'  <path d="{path_str(s)}" fill="url(#g)" stroke="#666" stroke-width="2.5" stroke-linejoin="round"/>')

    for rp in ring_paths:
        lines.append(f'  <path d="{path_str(rp)}" fill="#222" stroke="#444" stroke-width="2" stroke-linejoin="round"/>')

    # Draw overlapping holes as a single merged path
    if holes:
        parts = []
        for h in holes:
            cx, cy, r = h["cx"], h["cy"], h["r"]
            # Approximate circle as polygon with arc commands for clean union
            k = 0.55228
            rk = r * k
            parts.extend([
                f'M {cx},{cy - r}',
                f'C {cx + rk},{cy - r} {cx + r},{cy - rk} {cx + r},{cy}',
                f'C {cx + r},{cy + rk} {cx + rk},{cy + r} {cx},{cy + r}',
                f'C {cx - rk},{cy + r} {cx - r},{cy + rk} {cx - r},{cy}',
                f'C {cx - r},{cy - rk} {cx - rk},{cy - r} {cx},{cy - r} Z'
            ])
        lines.append(f'  <path d="{" ".join(parts)}" fill="#555" stroke="#666" stroke-width="2" fill-rule="evenodd"/>')

    lines.append('</svg>')
    with open(svg_path, 'w') as f:
        f.write('\n'.join(lines))
    print(f'  Wrote {svg_path}')

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base = os.path.join(script_dir, '..', 'public')
    for name in ['gloves', 'orbit', 'handle', 'duo', 'chromadeck', 'spark']:
        png = os.path.join(base, 'images', f'{name}-leds.png')
        json_f = os.path.join(base, 'data', f'{name}-led-positions.json')
        if not os.path.exists(json_f):
            json_f = os.path.join(script_dir, '..', '..', 'lightshow.lol', 'public', 'data', f'{name}-led-positions.json')
        svg = os.path.join(base, 'images', f'{name}.svg')
        convert_device(png, json_f, svg, name)
