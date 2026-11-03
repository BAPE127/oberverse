import sys, os, math, pickle, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from citykit import *
from pixel import *
OUT = '/tmp/oldpipe/out'
D = pickle.load(open('/tmp/neu_data.pkl', 'rb')); r = random.Random(3)
W, H, K = 3200, 2000, .5
DK = {'corp': (70, 80, 150), 'res': (92, 76, 140), 'ent': (120, 66, 160), 'seam': (100, 72, 100), 'ind': (64, 90, 106), 'tran': (56, 108, 140), 'lab': (118, 70, 118)}
def panel(level):
    bg = {'-1': (8, 14, 20), '0': (18, 16, 38), '+1': (14, 14, 34), '+2': (10, 10, 30)}[level]
    im = Image.new('RGB', (int(W * K), int(H * K)), bg); Qp = []; d = DeferDraw(im, Qp)
    s = lambda p: (p[0] * K, p[1] * K)
    dim = {'-1': .0, '0': 1, '+1': -.5, '+2': -.7}[level]
    if level == '-1':
        for (x, y, w, dd, fh, dk) in D['blds']: d.rectangle([x * K, y * K, (x + w) * K, (y + dd + fh) * K], outline=(28, 40, 52))
        for (p, w) in D['roads']: d.line([s(q) for q in p], fill=(18, 28, 38), width=max(1, int(w * K * .6)), joint='curve')
        # service tunnels follow the big roads offset; metro loop; sewers
        for i, (p, w) in enumerate(D['roads'][:9]):
            d.line([s(q) for q in p], fill=(150, 90, 30), width=5, joint='curve')
            for q in p[::9]: d.ellipse([q[0] * K - 3, q[1] * K - 3, q[0] * K + 3, q[1] * K + 3], fill=(255, 150, 60))
        metro = Path([(60, 1010), (700, 1060), (1250, 1180), (1600, 1000), (2100, 880), (2700, 960), (3150, 1000)], 14)
        d.line([s(q) for q in metro.p], fill=(235, 240, 255), width=7, joint='curve'); d.line([s(q) for q in metro.p], fill=(30, 40, 70), width=3, joint='curve')
        for x, y in [(700, 1060), (1600, 1000), (2700, 960)]: d.rounded_rectangle([x * K - 24, y * K - 12, x * K + 24, y * K + 12], 4, fill=(40, 60, 120), outline=(235, 240, 255), width=2)
        for q in D['named'].items(): pass
        gx, gy = D['named']['Glitch Market']; d.ellipse([gx * K - 70, gy * K - 50, gx * K + 70, gy * K + 50], fill=(60, 30, 20), outline=(255, 150, 60), width=3); d.text((gx * K, gy * K), 'BLACK MARKET\nDEEP BAZAAR', font=font(12, True), fill=(255, 190, 120), anchor='mm', align='center')
        vx, vy = D['named']['HALCYON WORKS (vault)']; d.rectangle([vx * K - 60, vy * K - 40, vx * K + 60, vy * K + 40], fill=(50, 20, 24), outline=(255, 90, 90), width=3); d.text((vx * K, vy * K), 'SERVER VAULT\n(Halcyon, sealed)', font=font(12, True), fill=(255, 150, 150), anchor='mm', align='center')
        for (x, y) in [(1330, 1420), (2400, 1250), (700, 700), (2000, 1650)]: d.rectangle([x * K - 20, y * K - 12, x * K + 20, y * K + 12], fill=(24, 60, 70), outline=(90, 230, 255)); d.text((x * K, y * K), 'GRID', font=font(9, True), fill=(160, 240, 255), anchor='mm')
        for k in range(9): x0 = r.uniform(100, 3000); y0 = r.uniform(100, 1900); d.line([(x0 * K, y0 * K), ((x0 + r.uniform(-300, 300)) * K, (y0 + r.uniform(-200, 200)) * K)], fill=(30, 80, 130), width=3)
    else:
        for (x, y, w, dd, fh, dk) in D['blds']:
            c = DK[dk]; c = mix(c, .1) if level == '0' else mix(c, -.55 if level == '+1' else -.7)
            d.rectangle([x * K, y * K, (x + w) * K, (y + dd) * K], fill=c); d.rectangle([x * K, (y + dd) * K, (x + w) * K, (y + dd + fh) * K], fill=mix(c, -.35))
        for (p, w) in D['roads']: d.line([s(q) for q in p], fill=(40, 38, 74) if level == '0' else (22, 22, 46), width=max(1, int(w * K)), joint='curve')
        for (px, py, pr, nm) in D['PZ']: d.ellipse([(px - pr) * K, (py - pr) * K, (px + pr) * K, (py + pr) * K], outline=(110, 100, 180), width=2)
    if level == '0':
        for (nm, (x, y)) in D['named'].items(): d.ellipse([x * K - 5, y * K - 5, x * K + 5, y * K + 5], fill=(255, 235, 80))
        for (p0, p1) in D['L1']:
            for q in (p0, p1): d.rectangle([q[0] * K - 5, q[1] * K - 5, q[0] * K + 5, q[1] * K + 5], fill=(60, 220, 255))   # lift/stairs foot
        d.text((20, int(H * K) - 30), 'street level: roads, pavement, plazas, shopfronts, hover traffic; cyan squares are lift and stair feet to level +1', font=font(13), fill=(190, 190, 230))
    if level == '+1':
        for (p0, p1) in D['L1']:
            d.line([s(p0), s(p1)], fill=(110, 230, 250), width=6); d.line([s(p0), s(p1)], fill=(30, 100, 130), width=2)
            for q in (p0, p1): d.ellipse([q[0] * K - 6, q[1] * K - 6, q[0] * K + 6, q[1] * K + 6], fill=(30, 80, 110), outline=(180, 255, 255))
        d.line([s(q) for q in D['mag']], fill=(190, 190, 255), width=8, joint='curve'); d.line([s(q) for q in D['mag']], fill=(60, 60, 110), width=2, joint='curve')
        for (x, y, w, h) in [(1470, 1070, 280, 36), (1040, 1000, 150, 28), (2120, 880, 190, 30)]: d.rectangle([x * K, y * K, (x + w) * K, (y + h) * K], fill=(60, 140, 190), outline=(200, 255, 255)); 
        d.text((1470 * K, 1040 * K), 'GLASS MILE PROMENADE DECK', font=font(11, True), fill=(210, 255, 255))
        d.text((20, int(H * K) - 30), 'sky bridges (cyan), maglev viaduct (lavender), elevated decks; rooftop plazas on the tallest roofs; each end has a lift and stairs', font=font(13), fill=(190, 220, 240))
    if level == '+2':
        cols = [(255, 90, 170), (90, 230, 255), (255, 70, 200), (140, 255, 160)]
        for i, p in enumerate(D['lanes']):
            d.line([s(q) for q in p], fill=mix(cols[i], -.45), width=18, joint='curve'); d.line([s(q) for q in p], fill=cols[i], width=2, joint='curve')
        for (x, y, w, dd, fh, dk) in D['blds']:
            if fh >= 90: d.ellipse([(x + w / 2) * K - 7, (y + dd / 2) * K - 7, (x + w / 2) * K + 7, (y + dd / 2) * K + 7], outline=(255, 215, 90), width=2)
        d.ellipse([2250 * K, 1480 * K, 2550 * K, 1550 * K], outline=(255, 70, 190), width=2); d.text((2400 * K, 1515 * K), 'blimp', font=font(11), fill=(255, 150, 220), anchor='mm')
        d.text((20, int(H * K) - 30), 'four one-way sky lanes with chevrons; yellow rings are rooftop landing pads (towers 100 m up); drones roam freely below the lanes', font=font(13), fill=(210, 190, 235))
    if level == '-1': d.text((20, int(H * K) - 30), 'service tunnels (orange), the metro (white), sewers (blue), power grid vaults, the black-market chamber and the sealed Halcyon server vault', font=font(13), fill=(170, 200, 210))
    im = pix(im, 2); replay(im, Qp); return im
names = [('+2', 'LEVEL +2   SKY LANES  (flying cars, drones, landing pads)'), ('+1', 'LEVEL +1   SKY BRIDGES, MAGLEV, DECKS'), ('0', 'LEVEL 0   STREET'), ('-1', 'LEVEL -1   UNDERGROUND (service tunnels, metro, black market)')]
P = [panel(k) for k, _ in names]; pw, ph = P[0].size
sheet = Image.new('RGB', (pw * 2 + 30, ph * 2 + 170), (10, 10, 18)); d = ImageDraw.Draw(sheet)
d.text((20, 18), 'NEUMINA: the four levels (mock). Each level is its own map layer; stairs, lifts, hatches and pads join them.', font=font(22, True), fill=(235, 235, 250))
for i, ((k, t), im) in enumerate(zip(names, P)):
    x, y = 10 + (i % 2) * (pw + 10), 100 + (i // 2) * (ph + 50); d.text((x, y - 24), t, font=font(16, True), fill=(220, 220, 250)); sheet.paste(im, (x, y))
sheet.save(os.path.join(OUT, 'proposal-postwar-pixel-neumina-levels.png')); print('levels', sheet.size)
# ---------------------------------------------------------------- cross section
Wc, Hc = 2200, 820; im = Image.new('RGB', (Wc, Hc), (12, 10, 30)); Qs = []; d = DeferDraw(im, Qs); gy = 520
for y in range(0, gy): d.line([0, y, Wc, y], fill=lerp((14, 10, 40), (60, 30, 90), y / gy))
d.rectangle([0, gy, Wc, Hc], fill=(14, 20, 28)); d.rectangle([0, gy, Wc, gy + 16], fill=(52, 48, 100))
x = 20; rr = random.Random(8); towers = []
while x < Wc - 60:
    w = rr.randint(70, 190); h = rr.choice([90, 130, 170, 230, 300, 380]); c = rr.choice([(54, 58, 120), (80, 50, 118), (46, 70, 90), (66, 54, 110)])
    d.rectangle([x, gy - h, x + w, gy], fill=c, outline=mix(c, .3))
    for wy in range(gy - h + 12, gy - 24, 16):
        for wx in range(x + 8, x + w - 10, 14):
            if rr.random() < .55: cc = rr.choice([(255, 120, 220), (110, 230, 255), (255, 220, 120)]); d.rectangle([wx, wy, wx + 6, wy + 8], fill=cc)
    d.rectangle([x + w // 2 - 8, gy - 22, x + w // 2 + 8, gy], fill=(8, 6, 18)); 
    towers.append((x, w, h)); x += w + rr.randint(14, 40)
tt = [t for t in towers if t[2] >= 230]
for a, b in zip(tt, tt[1:]):
    if b[0] - (a[0] + a[1]) < 120:
        y = gy - min(a[2], b[2]) + 60; d.rectangle([a[0] + a[1], y, b[0], y + 14], fill=(100, 220, 245), outline=(200, 255, 255)); d.line([a[0] + a[1], y + 7, b[0], y + 7], fill=(40, 120, 150))
for (x0, w0, h0) in tt: d.rectangle([x0 + w0 // 2 - 20, gy - h0 - 6, x0 + w0 // 2 + 20, gy - h0], fill=(255, 215, 90))
d.rectangle([60, gy - 120, Wc - 60, gy - 108], fill=(120, 120, 190)); [d.rectangle([px, gy - 108, px + 6, gy], fill=(80, 80, 140)) for px in range(100, Wc - 60, 220)]
d.rounded_rectangle([700, gy - 142, 880, gy - 120], 8, fill=(240, 240, 255), outline=(255, 70, 200), width=2)
for k in range(14):
    xx = rr.randint(40, Wc - 80); yy = rr.choice([120, 160, 210, 250]); col = rr.choice([(255, 90, 170), (90, 230, 255), (255, 215, 90)]); d.rounded_rectangle([xx, yy, xx + 44, yy + 16], 6, fill=col, outline=(10, 10, 20)); d.ellipse([xx + 6, yy + 16, xx + 38, yy + 24], fill=mix(col, -.6))
d.ellipse([1500, 60, 1820, 130], fill=(255, 70, 190), outline=(200, 190, 255), width=2); d.text((1660, 95), 'WINDFEN SYNTH-CHAIN', font=font(14, True), fill=(255, 240, 255), anchor='mm')
for yy, col in [(120, (255, 90, 170)), (260, (90, 230, 255))]:
    for xx in range(0, Wc, 40): d.line([xx, yy, xx + 22, yy], fill=col, width=2)
# underground
d.rectangle([0, gy + 60, Wc, gy + 100], fill=(30, 20, 14)); d.line([0, gy + 80, Wc, gy + 80], fill=(255, 150, 60), width=3)
d.rectangle([0, gy + 140, Wc, gy + 200], fill=(14, 30, 48)); d.rounded_rectangle([300, gy + 150, 560, gy + 190], 10, fill=(235, 240, 255), outline=(60, 70, 120), width=2)
d.ellipse([1300, gy + 40, 1700, gy + 130], fill=(60, 30, 20), outline=(255, 150, 60), width=3); d.text((1500, gy + 85), 'BLACK MARKET (deep bazaar)', font=font(15, True), fill=(255, 200, 140), anchor='mm')
for xx in (240, 1000, 1900): d.rectangle([xx, gy, xx + 18, gy + 80], fill=(255, 150, 60)); d.text((xx + 9, gy + 90), 'hatch', font=font(10), fill=(255, 190, 120), anchor='mm')
for lab, yy in [('LEVEL +2   sky lanes: flying cars, drones, landing pads, blimp', 40), ('LEVEL +1   sky bridges between towers, maglev viaduct, rooftop plazas, elevated decks', 70)]: d.text((20, yy), lab, font=font(18, True), fill=(240, 235, 255))
d.text((20, gy + 24), 'LEVEL 0   street, shopfronts, hover traffic, plazas', font=font(16, True), fill=(240, 235, 255))
d.text((20, gy + 212), 'LEVEL -1   service tunnels, metro, sewers, black market, sealed server vault', font=font(16, True), fill=(220, 235, 245))
d.text((20, Hc - 28), 'Cross-section (mock, not to scale). Stairs, lifts, hatches and landing pads join the levels; each level is a separate map layer in the engine.', font=font(12), fill=(140, 140, 170))
im = pix(im, 2); replay(im, Qs); im.save(os.path.join(OUT, 'proposal-postwar-pixel-neumina-section.png')); print('section')
