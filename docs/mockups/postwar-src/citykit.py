# Shared toolkit for the organic city mock maps (layout mock, not game art).
import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
FP = '/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf'
def font(s, b=False): return ImageFont.truetype(FP % ('-Bold' if b else ''), s)
def mix(c, k):
    return tuple(max(0, min(255, int(v + (255 - v) * k) if k > 0 else int(v * (1 + k)))) for v in c)
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def smooth(pts, seg=14):
    P = [pts[0]] + list(pts) + [pts[-1]]; out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(seg):
            t = k / seg; t2 = t * t; t3 = t2 * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(tuple(pts[-1])); return out
class Path:
    def __init__(s, pts, seg=14, closed=False):
        pts = list(pts)
        if closed: pts = pts + pts[:3]
        s.p = smooth(pts, seg) if seg else pts; s.c = [0]
        for a, b in zip(s.p, s.p[1:]): s.c.append(s.c[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        s.L = s.c[-1]
    def at(s, d):
        d = max(0, min(s.L - 1e-6, d)); lo, hi = 0, len(s.c) - 1
        while hi - lo > 1:
            m = (lo + hi) // 2
            if s.c[m] <= d: lo = m
            else: hi = m
        a, b = s.p[lo], s.p[lo + 1]; t = (d - s.c[lo]) / max(1e-6, s.c[lo + 1] - s.c[lo])
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, math.atan2(b[1] - a[1], b[0] - a[0]))
def rotrect(cx, cy, l, w, a):
    c, s_ = math.cos(a), math.sin(a); out = []
    for dx, dy in [(-l / 2, -w / 2), (l / 2, -w / 2), (l / 2, w / 2), (-l / 2, w / 2)]: out.append((cx + dx * c - dy * s_, cy + dx * s_ + dy * c))
    return out

class Scene:
    def __init__(S, W, H, bg, seed):
        S.W, S.H = W, H; S.r = random.Random(seed)
        S.im = Image.new('RGB', (W, H), bg); S.dr = ImageDraw.Draw(S.im)
        S.glow = Image.new('RGB', (W, H), (0, 0, 0)); S.gd = ImageDraw.Draw(S.glow)
        S.blk = Image.new('L', (W, H), 0); S.bd = ImageDraw.Draw(S.blk)      # where buildings may not go
        S.occ = Image.new('L', (W, H), 0); S.od = ImageDraw.Draw(S.occ)
        S.roads = []; S.blds = []; S.used = set(); S.named = {}
        S.shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); S.sd = ImageDraw.Draw(S.shadow)
    # ---------- roads
    def road(S, pts, w, kind='road', seg=14, closed=False, sw=13, tag=None):
        S.roads.append(dict(path=Path(pts, seg, closed), w=w, kind=kind, sw=sw, tag=tag)); return S.roads[-1]
    def draw_roads(S, walk, asph, edge, line, two=True, line2=None):
        for r in S.roads:
            pts = r['path'].p; w = r['w'] + 2 * r['sw']
            S.dr.line(pts, fill=walk, width=w, joint='curve'); S.bd.line(pts, fill=255, width=w + 4, joint='curve')
            for p in (pts[0], pts[-1]): S.dr.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=walk)
        for r in S.roads:
            pts = r['path'].p; w = r['w']
            S.dr.line(pts, fill=edge, width=w + 2, joint='curve'); S.dr.line(pts, fill=asph, width=w - 2, joint='curve')
            for p in (pts[0], pts[-1]): S.dr.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=asph)
        for r in S.roads:   # centre marking
            P = r['path']; d = 0; on = True
            if r['w'] < 34: continue
            while d < P.L - 14:
                x0, y0, _ = P.at(d); x1, y1, _ = P.at(d + 13)
                if on: S.dr.line([x0, y0, x1, y1], fill=line, width=2)
                d += 13 if on else 15; on = not on
            if two and r['w'] >= 70:
                for off in (-r['w'] * .25, r['w'] * .25):
                    d = 0
                    while d < P.L - 8:
                        x0, y0, a = P.at(d); x1, y1, _ = P.at(d + 8); nx, ny = -math.sin(a) * off, math.cos(a) * off
                        S.dr.line([x0 + nx, y0 + ny, x1 + nx, y1 + ny], fill=line2 or line, width=1); d += 22
    def blockarea(S, shape, *a):  # make an area unavailable for buildings (plaza, water, park...)
        getattr(S.bd, shape)(*a, fill=255)
    # ---------- placement
    def free(S, x, y, w, h, pad=5):
        b = (int(x - pad), int(y - pad), int(x + w + pad), int(y + h + pad))
        if b[0] < 4 or b[1] < 4 or b[2] > S.W - 4 or b[3] > S.H - 4: return False
        return S.blk.crop(b).getbbox() is None and S.occ.crop(b).getbbox() is None
    def claim(S, x, y, w, h):
        S.od.rectangle([x, y, x + w, y + h], fill=255)
    def add(S, **b):
        S.blds.append(b); S.claim(b['x'], b['y'], b['w'], b['d'] + b['fh']); return b
    def spiral(S, x, y, w, h, pad=5, maxr=520):
        if S.free(x, y, w, h, pad): return x, y
        for r in range(10, maxr, 10):
            for k in range(24):
                a = k / 24 * 6.2832
                nx, ny = x + r * math.cos(a), y + r * math.sin(a)
                if S.free(nx, ny, w, h, pad): return nx, ny
        return None
    # ---------- decor
    def name_sign(S, x, y, w, text, col, glow=True, h=11):
        sz = 10
        while sz > 6 and font(sz, True).getlength(text) > w - 6: sz -= 1
        f = font(sz, True)
        while f.getlength(text) > w - 6 and len(text) > 3: text = text[:-2]; f = font(sz, True)
        S.dr.rectangle([x, y, x + w - 1, y + h], fill=mix(col, -.8), outline=col)
        S.dr.text((x + w / 2, y + h / 2 + 1), text, font=f, fill=mix(col, .6), anchor='mm')
        if glow: S.gd.rectangle([x, y, x + w - 1, y + h], fill=mix(col, -.35))
    def person(S, x, y, col, umb=None):
        d = S.dr; d.ellipse([x - 3, y + 3, x + 4, y + 6], fill=(10, 10, 16))
        d.rectangle([x - 1, y - 1, x + 1, y + 4], fill=(20, 20, 30)); d.rectangle([x - 2, y - 5, x + 2, y], fill=col)
        d.rectangle([x - 1, y - 8, x + 1, y - 6], fill=(220, 180, 150) if S.r.random() < .6 else (150, 110, 80))
        if umb: d.ellipse([x - 7, y - 14, x + 7, y - 6], fill=umb); d.line([x, y - 6, x, y], fill=(200, 200, 200))
    def car(S, x, y, ang, col, l=28, w=13, glow=None, cabin=None):
        d = S.dr; d.polygon(rotrect(x + 2, y + 3, l, w, ang), fill=(8, 8, 12))
        d.polygon(rotrect(x, y, l, w, ang), fill=col, outline=(8, 8, 14))
        d.polygon(rotrect(x - math.cos(ang) * l * .06, y - math.sin(ang) * l * .06, l * .42, w * .78, ang), fill=cabin or mix(col, -.55))
        if glow: S.gd.polygon(rotrect(x + math.cos(ang) * l * .5, y + math.sin(ang) * l * .5, 8, w * .8, ang), fill=glow)
    def finish(S, glow_amt=1.0, vignette=.55, tint=None):
        im = S.im.convert('RGBA'); im = Image.alpha_composite(im, S.shadow).convert('RGB')
        g1 = S.glow.filter(ImageFilter.GaussianBlur(4)); g2 = S.glow.filter(ImageFilter.GaussianBlur(16)); g3 = S.glow.filter(ImageFilter.GaussianBlur(38))
        out = ImageChops.screen(im, g1); out = ImageChops.screen(out, g2); out = ImageChops.screen(out, g3.point(lambda v: min(255, int(v * 1.6))))
        out = ImageChops.screen(out, S.glow.point(lambda v: int(v * .8)))
        if vignette:
            v = Image.new('L', (S.W // 8, S.H // 8), 0); vd = ImageDraw.Draw(v)
            for i in range(60):
                k = i / 60; vd.rectangle([k * v.size[0] * .5, k * v.size[1] * .5, v.size[0] - k * v.size[0] * .5, v.size[1] - k * v.size[1] * .5], outline=int(255 * (1 - k) ** 2 * vignette))
            v = v.resize((S.W, S.H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(20))
            out = Image.composite(Image.new('RGB', (S.W, S.H), (0, 0, 8)), out, v)
        S.out = out; return out

def legend_panel(im, items, title, sub, extra=(), P=640, foot=''):
    W, H = im.size; out = Image.new('RGB', (W + P, H), (10, 10, 18)); out.paste(im, (0, 0)); d = ImageDraw.Draw(out)
    x0 = W + 24; d.text((x0, 26), title, font=font(28, True), fill=(235, 235, 250)); y = 72
    for line in sub: d.text((x0, y), line, font=font(14), fill=(170, 175, 200)); y += 20
    y += 12
    for n, nm, desc in items:
        d.ellipse([x0, y, x0 + 26, y + 26], fill=(255, 235, 80), outline=(0, 0, 0)); d.text((x0 + 13, y + 13), str(n), font=font(13, True), fill=(0, 0, 0), anchor='mm')
        d.text((x0 + 38, y - 1), nm, font=font(15, True), fill=(235, 235, 250)); d.text((x0 + 38, y + 18), desc, font=font(12), fill=(160, 165, 190)); y += 48
    y += 12
    for c, t in extra:
        d.rectangle([x0, y, x0 + 28, y + 16], fill=c, outline=(0, 0, 0)); d.text((x0 + 40, y + 8), t, font=font(13), fill=(210, 212, 230), anchor='lm'); y += 26
    d.text((x0, H - 30), foot or 'Mock only: layout, buildings, levels and routes. Final art follows the pixel-art reference.', font=font(11), fill=(120, 125, 150))
    return out
