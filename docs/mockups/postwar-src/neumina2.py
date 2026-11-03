import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from citykit import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
W, H = 3200, 2000
S = Scene(W, H, (18, 16, 38), 31); r = S.r
CY, MG, YL, VI, PK, GR, OR = (90, 230, 255), (255, 70, 200), (255, 215, 90), (170, 130, 255), (255, 90, 170), (140, 255, 160), (255, 150, 60)
NEON = [CY, MG, YL, VI, PK, GR]
PAL = {
 'corp': dict(wall=(52, 58, 116), roof=(86, 94, 150), neon=[CY, YL, VI], sz=((100, 220), (80, 160)), fh=(60, 118)),
 'res': dict(wall=(66, 54, 112), roof=(96, 82, 140), neon=[MG, YL, GR, CY], sz=((60, 140), (50, 110)), fh=(40, 80)),
 'ent': dict(wall=(88, 46, 124), roof=(120, 76, 156), neon=[MG, CY, PK, YL], sz=((70, 160), (56, 110)), fh=(38, 70)),
 'seam': dict(wall=(78, 52, 80), roof=(104, 78, 106), neon=[OR, GR, MG], sz=((40, 110), (36, 86)), fh=(28, 58)),
 'ind': dict(wall=(46, 66, 82), roof=(74, 96, 112), neon=[OR, YL, CY], sz=((110, 280), (90, 190)), fh=(34, 66)),
 'tran': dict(wall=(40, 82, 110), roof=(70, 116, 146), neon=[CY, GR, YL], sz=((80, 190), (60, 120)), fh=(40, 72)),
 'lab': dict(wall=(90, 50, 92), roof=(124, 80, 126), neon=[PK, (255, 90, 90)], sz=((80, 200), (70, 150)), fh=(40, 80)),
}
SEEDS = [(1500, 380, 'corp', 1.3), (2050, 330, 'corp', 1.1), (1150, 520, 'corp', .8), (2950, 330, 'lab', 1.0), (420, 380, 'res', 1.2), (520, 1180, 'res', 1.1), (880, 760, 'res', .9),
         (400, 1760, 'seam', 1.0), (900, 1700, 'seam', .9), (1400, 1250, 'ent', 1.2), (1950, 1150, 'ent', 1.0), (1000, 1100, 'ent', .7), (1500, 1800, 'tran', 1.1),
         (2600, 1500, 'ind', 1.1), (2900, 1850, 'ind', 1.0), (2300, 1800, 'ind', .9), (3050, 1000, 'ind', .8), (2550, 800, 'corp', .7)]
def district(x, y):
    best, bk = 1e9, 'res'
    for sx, sy, k, w in SEEDS:
        dd = math.hypot(x - sx, y - sy) / w + r.uniform(-40, 40)
        if dd < best: best, bk = dd, k
    return bk
NAMES = {
 'corp': ['Meridian Bank', 'Axion Labs', 'Vireo Media', 'Helix Legal', 'Sable Energy', 'Quill Data', 'Atrium Cafe', 'Corp Lobby', 'Skyline Offices', 'Pelham Trust', 'Nova Insurance', 'Zephyr Holdings', 'Iris Biotech', 'Tessel Arms Inc', 'Lumen Utilities', 'Argent Capital', 'Cobalt Consulting', 'Halden Group'],
 'res': ['Noodle Bar', 'Capsule Hotel', 'Laundromat', 'Pocket Market', 'Vending Hall', 'Tea Stall', 'Co-op Flats', 'Repair Shop', 'Arcade', 'Print Shop', 'Pawn & Loan', 'Hair & Chrome', 'Kiosk Row', 'Sleep Pods', 'Ramen 24', 'Stack 12', 'Stack 14', 'Stack 21', 'Dumpling House', 'Pet Cloner', 'Secondhand Limbs', 'Night School', 'Corner Pharmacy', 'Stack 30', 'Tofu Works', 'Bike & Drone'],
 'ent': ['Static Lounge', 'Holo Casino', 'Sushi Line', 'Karaoke Cell', 'Dream Parlour', 'Synth Records', 'Mirage Bar', 'Tattoo & Ports', 'Game Hall', 'Bubble Tea', 'Glass Mile Hotel', 'Cinema Nine', 'Skin & Sound', 'Pachinko Palace', 'Velvet Wire', 'Chrome Cafe', 'Dance Vault', 'VR Parlour', 'Spice Row', 'Lucky Octopus'],
 'seam': ['Chop Shop', 'Back-Alley Clinic', 'Data Fence', 'Smoke Den', 'Scrap Yard', 'Bunker Bar', 'Gambling Cellar', 'Parts Swap', 'Safehouse 9', 'Squat', 'Drop Point', 'Tunnel Hatch Depot', 'Rust Cafe', 'Wire Bazaar', 'Broker Den', 'Cracked Screens', 'Ink Cellar', 'Black Lamp'],
 'ind': ['Kiln Works', 'Cell Foundry', 'Coolant Plant', 'Depot 7', 'Assembly B', 'Power Hub', 'Cargo Gate', 'Pump House', 'Warehouse 22', 'Recycler', 'Data Farm', 'Fab Line 3', 'Smelter', 'Stamping Hall', 'Battery Store', 'Cable Works', 'Tank Farm 2', 'Loading Bay 5', 'Plasma Cutters', 'Parts Depot'],
 'tran': ['Ticket Hall', 'Bus Bays', 'Cargo Lift', 'Lost & Found', 'Food Court', 'Taxi Rank', 'Metro Annex', 'Locker Hall', 'Transit Police', 'Skybus Lounge', 'Rail Freight', 'Maglev Depot'],
 'lab': ['Gene Lab', 'Cold Store', 'Server Vault', 'Staff Block', 'Clean Room', 'Test Hall', 'Guard Post', 'Loading Dock', 'Animal Wing', 'Incinerator'],
}
# ------------------------------------------------------------------ roads (organic: curves, diagonals, a ring, branches)
ring = [(1600 + 1020 * math.cos(a / 12 * 6.283) + r.uniform(-60, 60), 1000 + 640 * math.sin(a / 12 * 6.283) + r.uniform(-50, 50)) for a in range(12)]
S.road([(-60, 1010), (500, 950), (1050, 1050), (1600, 1000), (2200, 950), (2800, 1040), (3260, 990)], 96, tag='Meridian Boulevard')
S.road([(1560, -60), (1470, 420), (1660, 800), (1600, 1000), (1520, 1420), (1660, 1800), (1600, 2060)], 88, tag='Spire Way')
S.road(ring, 62, closed=True, tag='Ring Road')
S.road([(560, 1560), (1100, 1260), (1600, 1000), (2100, 760), (2760, 540)], 72, tag='Glass Mile')
S.road([(560, 480), (1100, 760), (1600, 1000), (2100, 1250), (2700, 1520)], 62, tag='Kiln Diagonal')
S.road([(60, 1560), (500, 1480), (900, 1620), (1250, 1900)], 54, tag='Seam Run')
S.road([(2000, -60), (2150, 300), (2500, 450), (3260, 380)], 56, tag='Halcyon Road')
S.road([(60, 540), (420, 700), (800, 640), (1150, 760)], 52, tag='Stackhaven Way')
S.road([(2300, 2060), (2400, 1700), (2700, 1380), (3260, 1250)], 56, tag='Kiln Road')
mains = list(S.roads)
for m_ in mains:
    S.bd.line(m_['path'].p, fill=255, width=m_['w'] + 2 * m_['sw'] + 4, joint='curve')
# plazas
PZ = [(1600, 1000, 150, 'Convergence Plaza'), (1380, 1560, 90, ''), (2480, 520, 80, ''), (760, 1150, 90, 'Stackhaven Square')]
for (px, py, pr, nm) in PZ: S.bd.ellipse([px - pr - 8, py - pr - 8, px + pr + 8, py + pr + 8], fill=255)
# ------------------------------------------------------------------ landmarks (placed first, nudged off roads)
LM = [  # key, x, y, w, d, fh, district, neon, shape, label
 ('ORRIN-VOSS TOWER', 1330, 250, 250, 170, 120, 'corp', YL, 'tier'), ('Kade Logistics HQ', 1980, 230, 230, 150, 100, 'corp', CY, 'tier'),
 ('HALCYON WORKS (vault)', 2700, 140, 400, 280, 70, 'lab', (255, 90, 90), 'compound'), ('NEON LOTUS CLUB', 1190, 1130, 210, 120, 58, 'ent', MG, 'box'),
 ('Agency Dead-drop Noodles', 470, 660, 100, 62, 42, 'res', GR, 'box'), ('Stackhaven Clinic', 330, 860, 140, 96, 52, 'res', GR, 'box'),
 ('Glitch Market', 620, 1640, 320, 190, 0, 'seam', OR, 'market'), ('MERIDIAN LOOP STATION', 1330, 1700, 380, 150, 64, 'tran', CY, 'station'),
 ('Relay Mast Plant', 2540, 1380, 150, 100, 52, 'ind', (255, 255, 255), 'mast'), ('Meridian Bank', 1120, 380, 170, 110, 90, 'corp', CY, 'tier'),
 ('Glass Mile Hotel', 1700, 1230, 210, 120, 80, 'ent', YL, 'tier'), ('Holo Casino', 1880, 1020, 220, 120, 60, 'ent', YL, 'box'), ("Rook's Arms", 1330, 1360, 130, 84, 46, 'ent', OR, 'box'),
 ('Static Lounge', 980, 1230, 160, 100, 52, 'ent', CY, 'box'), ('Synth Records', 1500, 1180, 120, 80, 44, 'ent', VI, 'box'), ('Safehouse 9 (Stack 3)', 280, 400, 100, 70, 46, 'res', GR, 'box'),
 ('Halcyon Test Hall', 2640, 460, 150, 110, 50, 'lab', PK, 'box'), ('Cell Foundry', 2900, 1560, 260, 170, 50, 'ind', OR, 'box'), ('Coolant Plant', 2300, 1700, 280, 180, 50, 'ind', OR, 'box'),
 ('Meridian Skybus Port', 1760, 1760, 200, 120, 56, 'tran', CY, 'box'), ('Tunnel Hatch Depot', 400, 1440, 130, 90, 44, 'seam', OR, 'box'),
]
for (nm, x, y, w, d, fh, dk, nc, shape) in LM:
    if shape == 'market':
        pos = S.spiral(x, y, w, d, 4); 
        if pos: S.claim(pos[0], pos[1], w, d); S.named[nm] = (pos[0] + w / 2, pos[1] + d / 2); S.blds.append(dict(x=pos[0], y=pos[1], w=w, d=d, fh=0, dk=dk, name=nm, neon=nc, shape='market', lm=True))
        continue
    pos = S.spiral(x, y, w, d + fh, 4)
    if not pos: print('NO SPOT', nm); continue
    b = S.add(x=int(pos[0]), y=int(pos[1]), w=w, d=d, fh=fh, dk=dk, name=nm, neon=nc, shape=shape, lm=True); S.used.add(nm.lower()); S.named[nm] = (b['x'] + w / 2, b['y'] + d / 2)
for k in range(120):  # branches
    m = r.choice(mains); d = r.uniform(80, m['path'].L - 80); x, y, a = m['path'].at(d)
    s = r.choice([-1, 1]); a2 = a + s * (math.pi / 2 + r.uniform(-.5, .5)); n = r.randint(2, 4); pts = [(x, y)]
    for i in range(n): L = r.uniform(130, 260); a2 += r.uniform(-.35, .35); x += math.cos(a2) * L; y += math.sin(a2) * L; pts.append((x, y))
    if not all(40 < px < W - 40 and 40 < py < H - 40 for px, py in pts): continue
    Pb = Path(pts, 8)
    if any(S.occ.getpixel((int(min(W - 1, max(0, px))), int(min(H - 1, max(0, py))))) for px, py in Pb.p[::3]): continue
    if sum(1 for q in S.roads if q['tag'] is None) >= 20: break
    if any(S.blk.getpixel((int(min(W - 1, max(0, px))), int(min(H - 1, max(0, py))))) for px, py in Pb.p[10::3]): continue
    S.road(pts, r.choice([34, 38, 42]), seg=8, sw=11); S.bd.line(Pb.p, fill=255, width=60, joint='curve')
S.draw_roads((60, 56, 116), (26, 24, 52), (14, 12, 30), (88, 80, 150), line2=(60, 56, 110))
for (px, py, pr, nm) in PZ:
    S.dr.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(70, 64, 124), outline=(120, 110, 190), width=3)
    for k in (.75, .5, .25): S.dr.ellipse([px - pr * k, py - pr * k, px + pr * k, py + pr * k], outline=(96, 88, 150), width=1)
    S.blockarea('ellipse', [px - pr - 6, py - pr - 6, px + pr + 6, py + pr + 6])
# ------------------------------------------------------------------ fill the rest: many sizes, tight gaps, mixed shapes
def fill(attempts, scale, pad):
    for _ in range(attempts):
        x, y = r.uniform(10, W - 150), r.uniform(10, H - 150); dk = district(x, y); P = PAL[dk]
        w = int(r.uniform(*P['sz'][0]) * scale); d = int(r.uniform(*P['sz'][1]) * scale); fh = int(r.uniform(*P['fh']) * max(.55, scale))
        if not S.free(x, y, w, d + fh, pad): continue
        shape = r.choice(['box'] * 5 + ['chamfer', 'chamfer', 'tier']) if dk != 'ind' else r.choice(['box', 'box', 'round', 'tier'])
        pool = [n for n in NAMES[dk] if n.lower() not in S.used]; nm = pool[0] if pool and scale > .5 else None
        if nm: S.used.add(nm.lower()); r.shuffle(NAMES[dk])
        S.add(x=int(x), y=int(y), w=w, d=d, fh=fh, dk=dk, name=nm, neon=r.choice(P['neon']), shape=shape if w > 54 and d > 44 else 'box')
fill(20000, 1.0, 6); fill(40000, .75, 5); fill(60000, .5, 4); fill(80000, .32, 4)
print('buildings', len(S.blds))
# ------------------------------------------------------------------ draw: shadows then buildings, back to front
for b in S.blds:
    if b['fh'] <= 0: continue
    k = b['fh'] * .55; x, y, w, d, fh = b['x'], b['y'], b['w'], b['d'], b['fh']
    S.sd.polygon([(x + w, y + d + fh), (x + w + k, y + d + fh + k * .6), (x + w + k, y + fh + k * .6 + 4), (x + w, y + 4), (x, y + d + fh), (x + k * .4, y + d + fh + k * .9)], fill=(0, 0, 10, 110))
def person_col(): return r.choice([(220, 60, 160), (60, 200, 230), (240, 200, 70), (150, 110, 240), (60, 60, 90), (200, 200, 220), (90, 220, 150), (230, 90, 90)])
def draw_building(b):
    dr, gd = S.dr, S.gd; x, y, w, d, fh = b['x'], b['y'], b['w'], b['d'], b['fh']; P = PAL[b['dk']]; sh = b['shape']; nc = b['neon']
    wall = mix(P['wall'], r.uniform(-.14, .14)); roof = mix(P['roof'], r.uniform(-.1, .1)); fy = y + d
    if sh == 'compound':
        dr.rectangle([x - 14, y - 14, x + w + 14, y + d + fh + 14], fill=(46, 30, 54), outline=(255, 90, 90), width=3)
        for xx in range(x - 14, x + w + 14, 16): dr.line([xx, y - 14, xx, y - 4], fill=(255, 90, 90)); dr.line([xx, y + d + fh + 4, xx, y + d + fh + 14], fill=(255, 90, 90))
        gd.rectangle([x - 14, y - 14, x + w + 14, y + d + fh + 14], outline=(110, 30, 30), width=2)
        for (ox, oy, ww, dd, ff) in [(.05, .1, .42, .5, 46), (.55, .12, .38, .42, 40), (.1, .62, .3, .3, 30)]:
            draw_building(dict(x=int(x + ox * w), y=int(y + oy * d), w=int(ww * w), d=int(dd * d), fh=ff, dk='lab', shape='box', neon=nc, name=None))
        vx, vy = x + w * .62, y + d * .66; dr.rectangle([vx, vy, vx + 80, vy + 60], fill=(60, 30, 40), outline=(255, 90, 90), width=2); dr.ellipse([vx + 24, vy + 12, vx + 56, vy + 44], outline=(255, 90, 90), width=3); dr.text((vx + 40, vy + 28), 'V', font=font(14, True), fill=(255, 140, 140), anchor='mm'); gd.ellipse([vx + 20, vy + 8, vx + 60, vy + 48], fill=(90, 20, 20))
        S.name_sign(x + 10, y + d + fh - 6, 200, b['name'], nc); return
    if sh == 'market':
        dr.rectangle([x, y, x + w, y + d], fill=(60, 44, 66), outline=(255, 150, 60))
        for k in range(26):
            sx, sy = x + 12 + (k % 7) * (w - 24) / 7, y + 14 + (k // 7) * 40; col = r.choice([OR, MG, CY, YL, GR]); aw = r.randint(22, 30)
            dr.rectangle([sx, sy, sx + aw, sy + 16], fill=mix(col, -.35)); [dr.rectangle([sx + i, sy, sx + i + 4, sy + 16], fill=mix(col, -.1)) for i in range(0, aw, 8)]
            dr.rectangle([sx + 2, sy + 16, sx + aw - 2, sy + 22], fill=(40, 30, 40)); gd.rectangle([sx, sy, sx + aw, sy + 4], fill=mix(col, -.4))
            for _ in range(r.randint(1, 3)): S.person(sx + r.randint(0, aw), sy + 30 + r.randint(0, 6), person_col())
        for _ in range(26): S.person(x + r.randint(8, w - 8), y + r.randint(8, d - 6), person_col())
        S.name_sign(x + 40, y - 14, 240, 'GLITCH MARKET (night bazaar)', OR); return
    if sh == 'station':
        for ty in range(y + 12, y + d, 16): dr.line([x - 220, ty, x + w + 220, ty], fill=(110, 120, 150), width=2); [dr.line([tx, ty - 3, tx, ty + 3], fill=(70, 64, 100)) for tx in range(int(x - 220), int(x + w + 220), 10)]
    if sh == 'round':
        dr.rectangle([x, y + d // 2, x + w, y + d // 2 + fh], fill=wall); dr.ellipse([x, y + d // 2 + fh - d // 2, x + w, y + d // 2 + fh + d // 2], fill=wall)
        for i in range(5, w - 5, 9): dr.line([x + i, y + d // 2, x + i, y + d // 2 + fh], fill=mix(wall, -.25))
        dr.ellipse([x, y, x + w, y + d], fill=roof, outline=mix(roof, .35), width=2); dr.ellipse([x + w * .25, y + d * .25, x + w * .75, y + d * .75], outline=mix(roof, -.3), width=2); dr.ellipse([x + w * .4, y + d * .4, x + w * .6, y + d * .6], fill=mix(roof, -.4)); return
    # facade
    dr.rectangle([x, fy, x + w - 1, fy + fh - 1], fill=wall); dr.rectangle([x + w - 4, fy, x + w - 1, fy + fh - 1], fill=mix(wall, -.3)); dr.rectangle([x, fy, x + w - 1, fy + 2], fill=mix(wall, -.5))
    lit = .55 if b['dk'] != 'ind' else .3; wc = P['neon'] + [(255, 220, 130), (200, 190, 255)]
    for wy in range(fy + 6, fy + fh - 26, 12):
        for wx in range(x + 5, x + w - 12, 12):
            if r.random() < lit: c = r.choice(wc); dr.rectangle([wx, wy, wx + 6, wy + 7], fill=c); gd.rectangle([wx, wy, wx + 6, wy + 7], fill=mix(c, -.62)) if r.random() < .35 else None
            else: dr.rectangle([wx, wy, wx + 6, wy + 7], fill=mix(wall, -.5))
            if b['dk'] == 'res' and r.random() < .1: dr.line([wx - 2, wy + 9, wx + 8, wy + 9], fill=(150, 150, 170), width=2)
    sy0 = fy + fh - 22; dr.rectangle([x, sy0, x + w - 1, fy + fh - 1], fill=(14, 12, 28)); dr.line([x, sy0, x + w - 1, sy0], fill=mix(nc, -.3))
    nd = max(1, w // 38)
    for i in range(nd):
        dx = x + int((i + .5) * w / nd) - 7; c = r.choice(P['neon'] + [nc]); dr.rectangle([dx - 8, sy0 + 3, dx + 22, fy + fh - 2], fill=mix(c, -.62)); dr.rectangle([dx, sy0 + 4, dx + 13, fy + fh - 2], fill=(10, 8, 20)); gd.rectangle([dx - 8, sy0 + 3, dx + 22, fy + fh - 2], fill=mix(c, -.55))
        if r.random() < .5: [dr.rectangle([dx - 8 + j, sy0 - 1, dx - 4 + j, sy0 + 3], fill=mix(c, -.1 if (j // 8) % 2 else -.45)) for j in range(0, 30, 8)]
    if b.get('name') and w >= 56: S.name_sign(x + 2, sy0 - 12, w - 4, b['name'], nc)
    if r.random() < .3 or b.get('lm'):  # vertical blade sign
        bx = x - 3 if r.random() < .5 else x + w - 3; c = nc; dr.rectangle([bx, fy + 6, bx + 5, fy + 6 + max(8, min(fh - 30, 44))], fill=c, outline=(0, 0, 0)); gd.rectangle([bx - 2, fy + 4, bx + 7, fy + 8 + max(8, min(fh - 30, 44))], fill=mix(c, -.35))
    # roof
    if sh == 'chamfer': k = min(14, w // 5, d // 4); dr.polygon([(x + k, y), (x + w - k, y), (x + w, y + k), (x + w, y + d), (x, y + d), (x, y + k)], fill=roof, outline=mix(roof, .35))
    else: dr.rectangle([x, y, x + w, y + d], fill=roof, outline=mix(roof, .35)); dr.line([x + 1, y + d, x + w - 1, y + d], fill=mix(roof, -.5), width=3)
    for _ in range(max(1, int(w * d / 1500))):
        px, py = x + r.randint(8, max(9, w - 30)), y + r.randint(8, max(9, d - 24)); q = r.random()
        if q < .22: dr.rectangle([px, py, px + 16, py + 14], fill=(76, 80, 104)); dr.ellipse([px + 2, py + 1, px + 14, py + 13], outline=(20, 20, 40), fill=(46, 48, 72)); dr.line([px + 8, py + 2, px + 8, py + 12], fill=(100, 100, 130))
        elif q < .38: dr.rectangle([px, py, px + 24, py + 12], fill=(22, 24, 62)); [dr.line([px + i, py, px + i, py + 12], fill=(70, 80, 150)) for i in range(3, 24, 5)]
        elif q < .5: dr.line([px, py, px + r.randint(30, 80), py], fill=(215, 54, 74), width=3)
        elif q < .62: dr.rectangle([px, py, px + 26, py + 16], fill=(34, 90, 70)); [dr.ellipse([px + 2 + i * 7, py + 3, px + 8 + i * 7, py + 13], fill=(70, 190, 120)) for i in range(3)]       # rooftop garden
        elif q < .74: dr.rectangle([px, py, px + 20, py + 12], fill=(30, 40, 90)); [dr.line([px + i, py, px + i, py + 12], fill=(60, 120, 220)) for i in range(2, 20, 4)]  # solar
        elif q < .86: dr.line([px, py, px, py - 3], fill=(150, 150, 170)); dr.rectangle([px - 1, py - 18, px + 1, py - 3], fill=(130, 130, 150)); dr.ellipse([px - 3, py - 22, px + 3, py - 16], fill=(255, 40, 40)); gd.ellipse([px - 7, py - 26, px + 7, py - 12], fill=(120, 10, 10))
        else: dr.rectangle([px, py, px + 12, py + 9], fill=(120, 96, 76)); dr.rectangle([px + 1, py + 1, px + 11, py + 8], fill=(150, 120, 96))
    if r.random() < .25 and w > 70: bc = r.choice(NEON); bx = x + r.randint(4, w - 44); dr.rectangle([bx, y + 3, bx + 40, y + 12], fill=mix(bc, -.5), outline=bc); gd.rectangle([bx, y + 3, bx + 40, y + 12], fill=mix(bc, -.3))
    if sh == 'tier' or b.get('lm') and sh == 'box' and fh > 55:
        ix, iy, iw, idd = x + w * .22, y + d * .18, w * .56, d * .5; ifh = 22 if fh < 90 else 34
        dr.rectangle([ix, iy + idd, ix + iw, iy + idd + ifh], fill=mix(wall, -.1)); [dr.rectangle([ix + j, iy + idd + 5, ix + j + 6, iy + idd + 11], fill=r.choice(wc)) for j in range(6, int(iw) - 6, 12)]
        dr.rectangle([ix, iy, ix + iw, iy + idd], fill=mix(roof, .12), outline=mix(roof, .4)); dr.rectangle([ix + iw * .3, iy + idd * .3, ix + iw * .7, iy + idd * .7], fill=mix(roof, -.1), outline=mix(roof, .25))
        if fh >= 90 or b['name'] in ('ORRIN-VOSS TOWER', 'Glass Mile Hotel', 'Kade Logistics HQ', 'Meridian Bank'):
            hx, hy = ix + iw / 2, iy + idd / 2; dr.ellipse([hx - 16, hy - 16, hx + 16, hy + 16], fill=(30, 30, 60), outline=YL, width=2); dr.text((hx, hy), 'H', font=font(14, True), fill=YL, anchor='mm'); gd.ellipse([hx - 18, hy - 18, hx + 18, hy + 18], outline=(110, 90, 20), width=2); b['pad'] = (hx, hy)
    if sh == 'mast':
        mx, my = x + w * .5, y + d * .5; dr.line([mx, my, mx, my - 90], fill=(220, 220, 240), width=3)
        for k in range(1, 6): dr.line([mx - 14 + k * 2, my - k * 15, mx + 14 - k * 2, my - k * 15], fill=(190, 190, 210), width=1)
        dr.ellipse([mx - 6, my - 96, mx + 6, my - 84], fill=(255, 40, 40)); gd.ellipse([mx - 20, my - 110, mx + 20, my - 70], fill=(160, 10, 10)); gd.ellipse([mx - 60, my - 120, mx + 60, my - 60], outline=(80, 80, 90))
for b in sorted(S.blds, key=lambda b: b['y'] + b['d']): draw_building(b)
# ------------------------------------------------------------------ street life
def edge_point(m, d, s, off=0):
    x, y, a = m['path'].at(d); o = m['w'] / 2 + m['sw'] / 2 + off; return x - math.sin(a) * o * s, y + math.cos(a) * o * s, a
for m in S.roads:
    P = m['path']; d = 30
    while d < P.L - 30:
        for s in (-1, 1):
            x, y, a = edge_point(m, d, s); dk = district(x, y)
            if dk == 'ent' and r.random() < .5: pass
            S.dr.rectangle([x - 1, y - 12, x, y + 1], fill=(120, 120, 150)); S.dr.ellipse([x - 3, y - 15, x + 3, y - 9], fill=(255, 225, 150)); S.gd.ellipse([x - 7, y - 19, x + 7, y - 5], fill=(80, 64, 34))
            if dk == 'ent' and r.random() < .28:   # pink palms along entertainment frontage
                for ax, ay in [(-9, -3), (9, -3), (-8, 4), (8, 4), (0, -9)]: S.dr.line([x, y - 10, x + ax, y - 10 + ay], fill=(255, 70, 190), width=3)
                S.gd.ellipse([x - 12, y - 22, x + 12, y + 2], fill=(110, 20, 80))
        d += 230
    d = 20
    while d < P.L - 20:
        s = r.choice([-1, 1]); x, y, a = edge_point(m, d, s, r.uniform(-4, 4))
        if S.blk.getpixel((int(min(W - 1, max(0, x))), int(min(H - 1, max(0, y))))) and r.random() < (.85 if district(x, y) in ('ent', 'res', 'seam') else .5):
            n = r.choice([1, 1, 2]); 
            for _ in range(n): S.person(x + r.uniform(-8, 8), y + r.uniform(-4, 4), person_col())
        d += r.uniform(14, 40)
for (nm, (cx, cy)) in S.named.items():  # crowds at clubs, queues
    if nm in ('NEON LOTUS CLUB', 'Holo Casino', 'Static Lounge'):
        for k in range(10): S.person(cx - 60 + k * 8, cy + 74 + (k % 2) * 6, person_col())
for (px, py, pr, nm) in PZ:
    for _ in range(int(pr / 3)): a = r.uniform(0, 6.28); rr = r.uniform(10, pr - 8); S.person(px + rr * math.cos(a), py + rr * math.sin(a), person_col())
# holo statue in the plaza
S.dr.ellipse([1600 - 28, 1000 - 40, 1600 + 28, 1000 + 40], fill=(60, 190, 190)); S.gd.ellipse([1600 - 60, 1000 - 70, 1600 + 60, 1000 + 70], fill=(30, 110, 120)); S.dr.ellipse([1600 - 9, 1000 - 18, 1600 + 9, 1000 - 2], fill=(190, 255, 250))
# ground traffic (hover cars skim just above the road)
for m in S.roads:
    P = m['path']; n = int(P.L / (300 if m['w'] > 60 else 480))
    for _ in range(n):
        x, y, a = P.at(r.uniform(30, P.L - 30)); s = r.choice([-1, 1]); off = m['w'] * .24 * s; x2, y2 = x - math.sin(a) * off, y + math.cos(a) * off
        if s < 0: a += math.pi
        c = r.choice([(0, 150, 190), (230, 120, 40), (200, 40, 150), (120, 100, 230), (60, 60, 80), (220, 220, 235)]); S.car(x2, y2, a, c, glow=(40, 110, 130) if r.random() < .5 else (130, 60, 30))
        S.gd.ellipse([x2 - 16, y2 - 8, x2 + 16, y2 + 8], fill=(6, 30, 44))
# ------------------------------------------------------------------ LEVEL +1: sky bridges, maglev, market decks
L1 = []
def exit_pt(b, tx, ty):
    cx, cy = b['x'] + b['w'] / 2, b['y'] + b['d'] / 2; dx, dy = tx - cx, ty - cy; hw, hh = b['w'] / 2, b['d'] / 2
    t = min(hw / abs(dx) if dx else 1e9, hh / abs(dy) if dy else 1e9); return cx + dx * t, cy + dy * t
tall = [b for b in S.blds if b['fh'] >= 56 and b['w'] > 60 and b['shape'] not in ('round', 'compound', 'market')]
pairs = []; seen = set()
for i, a in enumerate(tall):
    cands = sorted(tall, key=lambda b: math.hypot(b['x'] - a['x'], b['y'] - a['y']))[1:5]
    for b in cands:
        gap = math.hypot(b['x'] + b['w'] / 2 - a['x'] - a['w'] / 2, b['y'] + b['d'] / 2 - a['y'] - a['d'] / 2) - (a['w'] + b['w']) / 3
        if 50 < gap < 230 and (id(a), id(b)) not in seen and (id(b), id(a)) not in seen and r.random() < .55 and len(pairs) < 46: seen.add((id(a), id(b))); pairs.append((a, b))
for (a, b) in pairs:
    acx, acy, bcx, bcy = a['x'] + a['w'] / 2, a['y'] + a['d'] / 2, b['x'] + b['w'] / 2, b['y'] + b['d'] / 2
    p0 = exit_pt(a, bcx, bcy); p1 = exit_pt(b, acx, acy); L1.append((p0, p1))
    S.sd.line([p0[0] + 34, p0[1] + 50, p1[0] + 34, p1[1] + 50], fill=(0, 0, 12, 90), width=18)
mag = Path([(60, 1150), (600, 1240), (1100, 1470), (1330, 1690), (1700, 1740), (2100, 1690), (2600, 1640), (3150, 1700)], 14)
for k in range(0, int(mag.L), 12):
    x, y, a = mag.at(k); S.sd.ellipse([x + 22, y + 34, x + 36, y + 44], fill=(0, 0, 12, 90))
S.im_overlay = None
def finish_lvl1(target_im, td, tg):
    for (p0, p1) in L1:
        td.line([p0, p1], fill=(40, 120, 150), width=20); td.line([p0, p1], fill=(110, 220, 245), width=14); td.line([p0, p1], fill=(150, 250, 255), width=2)
        ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0]); nx, ny = -math.sin(ang) * 9, math.cos(ang) * 9
        td.line([p0[0] + nx, p0[1] + ny, p1[0] + nx, p1[1] + ny], fill=(210, 255, 255), width=2); td.line([p0[0] - nx, p0[1] - ny, p1[0] - nx, p1[1] - ny], fill=(210, 255, 255), width=2)
        tg.line([p0, p1], fill=(26, 92, 112), width=22)
        for p in (p0, p1): td.ellipse([p[0] - 9, p[1] - 9, p[0] + 9, p[1] + 9], fill=(30, 80, 110), outline=(150, 250, 255), width=2); td.text((p[0], p[1]), 'L', font=font(9, True), fill=(200, 255, 255), anchor='mm')
        for t in (.3, .55, .8):
            if r.random() < .8: S.person(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, person_col()) if td is S.dr else None
    # maglev elevated rail
    td.line(mag.p, fill=(34, 34, 64), width=30, joint='curve'); td.line(mag.p, fill=(100, 100, 160), width=24, joint='curve'); td.line(mag.p, fill=(40, 40, 76), width=2, joint='curve')
    for k in range(0, int(mag.L), 36): x, y, a = mag.at(k); td.line([x - math.sin(a) * 12, y + math.cos(a) * 12, x + math.sin(a) * 12, y - math.cos(a) * 12], fill=(60, 60, 110), width=2)
    for k0 in (420, 1860):
        for j in range(5):
            x, y, a = mag.at(k0 + j * 26); td.polygon(rotrect(x, y, 24, 14, a), fill=(230, 235, 250) if j else (255, 70, 200), outline=(20, 20, 40)); tg.polygon(rotrect(x, y, 24, 14, a), fill=(80, 40, 90) if j else (140, 20, 100))
            td.polygon(rotrect(x, y, 14, 6, a), fill=(40, 60, 110))
    x, y, a = mag.at(1290); td.rectangle([x - 44, y - 20, x + 44, y + 20], fill=(60, 66, 120), outline=(150, 250, 255), width=2); td.text((x, y), 'MAGLEV', font=font(10, True), fill=(210, 255, 255), anchor='mm')
finish_lvl1(S.im, S.dr, S.gd)
# elevated decks over the entertainment boulevard
for (dx, dy, dw, dh) in [(1470, 1070, 280, 36), (1040, 1000, 150, 28), (2120, 880, 190, 30)]:
    S.dr.rectangle([dx, dy, dx + dw, dy + dh], fill=(54, 100, 140), outline=(150, 250, 255), width=2); S.gd.rectangle([dx, dy, dx + dw, dy + dh], outline=(30, 90, 110), width=2)
    for i in range(10, dw - 10, 34): c = r.choice(NEON); S.dr.rectangle([dx + i, dy + 6, dx + i + 22, dy + 18], fill=mix(c, -.35), outline=c); S.gd.rectangle([dx + i, dy + 6, dx + i + 22, dy + 18], fill=mix(c, -.5)); S.person(dx + i + 28, dy + 24, person_col())
    S.sd.rectangle([dx + 32, dy + 46, dx + dw + 32, dy + dh + 46], fill=(0, 0, 12, 80))
# ------------------------------------------------------------------ LEVEL +2: sky lanes, flying cars, landing pads, blimp, drones
lanes = [Path([(0, 380), (800, 540), (1600, 720), (2400, 620), (3200, 800)], 14), Path([(120, 1900), (900, 1620), (1600, 1320), (2300, 1260), (3200, 1120)], 14), Path([(1100, 0), (1220, 700), (1700, 1180), (2050, 2000)], 14), Path([(3200, 120), (2600, 600), (2000, 900), (1200, 940), (0, 760)], 14)]
sky = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sk = ImageDraw.Draw(sky)
for i, ln in enumerate(lanes):
    col = [PK, CY, MG, GR][i]
    sk.line(ln.p, fill=col + (34,), width=64, joint='curve'); sk.line(ln.p, fill=col + (110,), width=2, joint='curve')
    for off in (-32, 32):
        pts = [(x - math.sin(a) * off, y + math.cos(a) * off) for (x, y, a) in [ln.at(k) for k in range(0, int(ln.L), 20)]]
        for j in range(0, len(pts) - 1, 2): sk.line([pts[j], pts[j + 1]], fill=col + (180,), width=2)
    for k in range(60, int(ln.L), 180): x, y, a = ln.at(k); sk.polygon(rotrect(x, y, 22, 14, a)[:3], fill=col + (140,)) if False else sk.polygon([(x + math.cos(a) * 12, y + math.sin(a) * 12), (x - math.cos(a) * 6 - math.sin(a) * 9, y - math.sin(a) * 6 + math.cos(a) * 9), (x - math.cos(a) * 6 + math.sin(a) * 9, y - math.sin(a) * 6 - math.cos(a) * 9)], fill=col + (150,))
S.im = Image.alpha_composite(S.im.convert('RGBA'), sky).convert('RGB'); S.dr = ImageDraw.Draw(S.im)
S.shadow = Image.alpha_composite(S.shadow, Image.new('RGBA', (W, H), (0, 0, 0, 0)))
S.sd = ImageDraw.Draw(S.shadow)
def fly(x, y, a, col, big=False):
    l, w = (40, 20) if big else (32, 16); S.sd.polygon(rotrect(x + 46, y + 74, l, w, a), fill=(0, 0, 14, 105))
    S.dr.polygon(rotrect(x, y, l, w, a), fill=col, outline=(10, 10, 20)); S.dr.polygon(rotrect(x + math.cos(a) * 4, y + math.sin(a) * 4, l * .4, w * .7, a), fill=(210, 245, 255))
    for sgn in (-1, 1): ex, ey = x - math.sin(a) * w * .7 * sgn, y + math.cos(a) * w * .7 * sgn; S.dr.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], fill=(255, 255, 255)); S.gd.ellipse([ex - 7, ey - 7, ex + 7, ey + 7], fill=(40, 90, 104))
    S.gd.polygon(rotrect(x, y, l + 8, w + 6, a), fill=mix(col, -.78))
for i, ln in enumerate(lanes):
    for k in range(int(ln.L / 120)):
        x, y, a = ln.at(r.uniform(20, ln.L - 20)); off = r.choice([-14, 14]); x -= math.sin(a) * off; y += math.cos(a) * off
        if off > 0: a += math.pi
        fly(x, y, a, r.choice([(230, 60, 160), (60, 200, 230), (240, 200, 70), (150, 110, 240), (230, 230, 245), (255, 130, 60)]), r.random() < .25)
for (b) in S.blds:  # landing pads on towers get a visiting car
    if b.get('pad'): hx, hy = b['pad']; fly(hx + 4, hy - 2, -.5, (255, 215, 90), True)
for _ in range(60):  # drones
    x, y = r.uniform(80, W - 80), r.uniform(80, H - 80); S.dr.rectangle([x - 3, y - 3, x + 3, y + 3], fill=(40, 40, 60)); [S.dr.line([x, y, x + ax * 5, y + ay * 5], fill=(110, 110, 140)) for ax, ay in ((-1, -1), (1, -1), (-1, 1), (1, 1))]; S.gd.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(150, 20, 20)); S.sd.ellipse([x + 30, y + 52, x + 38, y + 58], fill=(0, 0, 14, 90))
# blimp with an advert
bx, by = 2250, 1480; S.sd.ellipse([bx + 40, by + 90, bx + 330, by + 150], fill=(0, 0, 14, 95))
S.dr.ellipse([bx, by, bx + 300, by + 70], fill=(54, 40, 100), outline=(180, 170, 255), width=2); S.dr.ellipse([bx + 24, by + 10, bx + 276, by + 46], fill=(255, 70, 190)); S.dr.polygon([(bx, by + 35), (bx - 36, by + 6), (bx - 30, by + 66)], fill=(54, 40, 100)); S.dr.text((bx + 150, by + 28), 'WINDFEN SYNTH-CHAIN', font=font(14, True), fill=(255, 245, 255), anchor='mm'); S.gd.ellipse([bx + 24, by + 10, bx + 276, by + 46], fill=(110, 20, 80))
S.dr.ellipse([bx + 120, by + 66, bx + 180, by + 84], fill=(60, 60, 90))
S.finish(); 
S.out.save('/tmp/neu_raw.png')
# ------------------------------------------------------------------ labels, levels legend, markers
d = ImageDraw.Draw(S.out)
for (px, py, pr, nm) in PZ:
    if nm: d.text((px, py + pr + 14), nm, font=font(14, True), fill=(210, 205, 255), anchor='mm')
dl = {'corp': 'SPIRE ROWS (corporate)', 'ent': 'GLASS MILE (entertainment)', 'res': 'STACKHAVEN (residential)', 'seam': 'THE SEAM (criminal)', 'ind': 'KILN BASIN (industrial)', 'tran': 'MERIDIAN LOOP (transit)', 'lab': 'HALCYON WORKS (restricted)'}
for (x, y, t) in [(1560, 120, 'corp'), (1560, 1470, 'ent'), (420, 120, 'res'), (400, 1930, 'seam'), (2700, 1950, 'ind'), (1340, 1900, 'tran'), (2950, 60, 'lab')]:
    f = font(26, True); tt = dl[t]; d.text((x + 2, y + 2), tt, font=f, fill=(0, 0, 0), anchor='mm'); d.text((x, y), tt, font=f, fill=(235, 225, 255), anchor='mm')
keys = ['ORRIN-VOSS TOWER', 'HALCYON WORKS (vault)', 'NEON LOTUS CLUB', 'Agency Dead-drop Noodles', 'Stackhaven Clinic', 'Glitch Market', 'MERIDIAN LOOP STATION', 'Relay Mast Plant', 'Kade Logistics HQ']
for n, k in enumerate(keys, 1):
    x, y = S.named[k]; d.ellipse([x - 15, y - 15, x + 15, y + 15], fill=(255, 235, 80), outline=(0, 0, 0), width=3); d.text((x, y), str(n), font=font(17, True), fill=(0, 0, 0), anchor='mm')
S.out.save('/tmp/neu_raw_final.png')
items = [(1, 'Orrin-Voss Tower', 'corporate HQ; helipad on the roof, vault, checkpoints'), (2, 'Halcyon Works', 'fenced restricted lab: vault, experiment wing, guards'), (3, 'Neon Lotus Club', 'queue outside; informants, bouncers with implants'), (4, 'Agency dead-drop (noodle bar)', 'where the agency leaves and takes messages'), (5, 'Stackhaven Clinic', 'implant repair, medical data'), (6, 'Glitch Market', 'night bazaar; black-market implants, hacking tools'), (7, 'Meridian Loop Station', 'metro, bus, maglev, skybus; fast travel'), (8, 'Relay Mast Plant', 'industrial; the surveillance network node'), (9, 'Kade Logistics HQ', 'corporate; shipping records, data courier')]
img = legend_panel(S.out, items, 'NEUMINA, Windfen League', ['Organic city plan (mock), all levels drawn together.', 'Street level: curved boulevards, ring road, plazas, crowds.', 'Level +1: cyan sky bridges, maglev viaduct, elevated decks.', 'Level +2: pink/cyan sky lanes, flying cars, drones, blimp.', 'Level -1 (tunnels, metro) is on the levels sheet.'], [((110, 230, 250), 'sky bridge (lift and stairs at each end)'), ((130, 130, 190), 'maglev viaduct with trains'), ((255, 90, 170), 'sky lane with flying cars (shadows fall on the street)'), ((255, 215, 90), 'rooftop landing pad'), ((255, 70, 200), 'pink palms: entertainment frontage'), ((255, 235, 80), 'numbered landmark')])
img.save(os.path.join(OUT, 'proposal-postwar-neumina-city.png'))
import pickle
pickle.dump(dict(L1=L1, mag=mag.p, lanes=[l.p for l in lanes], roads=[(m['path'].p, m['w']) for m in S.roads], blds=[(b['x'], b['y'], b['w'], b['d'], b['fh'], b['dk']) for b in S.blds], named=S.named, PZ=PZ), open('/tmp/neu_data.pkl', 'wb'))
print('done', S.out.size)
