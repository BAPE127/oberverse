import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from citykit import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
W, H = 3000, 2000
S = Scene(W, H, (22, 26, 34), 77); r = S.r
GOLD, RED, BLUE, AMB, WHT, GRN = (255, 200, 70), (255, 90, 100), (110, 190, 235), (255, 150, 70), (225, 232, 255), (120, 230, 150)
PAL = {
 'lan': dict(wall=(116, 74, 40), roof=(66, 54, 44), neon=[GOLD, RED, AMB], sz=((50, 130), (44, 100)), fh=(36, 78)),
 'van': dict(wall=(104, 44, 52), roof=(62, 48, 52), neon=[RED, GOLD, (255, 130, 170)], sz=((70, 170), (56, 120)), fh=(46, 96)),
 'kes': dict(wall=(52, 78, 100), roof=(58, 66, 76), neon=[BLUE, AMB, GRN], sz=((90, 230), (70, 150)), fh=(34, 64)),
 'civ': dict(wall=(116, 116, 128), roof=(86, 88, 98), neon=[WHT, (200, 220, 255)], sz=((80, 190), (64, 130)), fh=(52, 104)),
 'ten': dict(wall=(100, 72, 58), roof=(60, 50, 46), neon=[AMB, GOLD, GRN], sz=((46, 110), (40, 90)), fh=(44, 92)),
 'mhe': dict(wall=(116, 90, 70), roof=(72, 64, 56), neon=[AMB, GOLD], sz=((50, 120), (44, 90)), fh=(34, 62)),
 'sta': dict(wall=(90, 92, 102), roof=(70, 72, 82), neon=[WHT, AMB], sz=((90, 220), (70, 140)), fh=(40, 70)),
}
SEEDS = [(450, 480, 'lan', 1.2), (900, 330, 'lan', .7), (1250, 430, 'van', 1.2), (1000, 850, 'van', .8), (2400, 420, 'civ', 1.2), (1850, 780, 'civ', .8), (500, 1150, 'ten', 1.1), (250, 1500, 'ten', .6),
         (1300, 1330, 'kes', 1.0), (700, 1330, 'kes', .9), (1900, 1330, 'kes', .9), (2450, 1000, 'mhe', 1.0), (2700, 750, 'mhe', .7), (2550, 1300, 'sta', .8)]
def district(x, y):
    best, bk = 1e9, 'ten'
    for sx, sy, k, w in SEEDS:
        dd = math.hypot(x - sx, y - sy) / w + r.uniform(-40, 40)
        if dd < best: best, bk = dd, k
    return bk
NAMES = {
 'lan': ['Lantern Tea House', 'Joss Pawnbroker', 'Fan Tan Parlour', 'Temple Shop', 'Old Town Bakery', 'Fortune Radio', 'Jade Tailor', 'Herb & Cure', 'Dragon Noodles', 'Society Office', 'Red Lantern Bar', 'Moon Gate Cafe', 'Abacus Bank', 'Ink & Seal', 'Silk Row', 'Opium Den (closed)', 'Mahjong Hall', 'Lucky Cat Laundry'],
 'van': ['Velvet Room', 'Ace Pawn', 'Ivory Bank', 'Oyster Bar', 'Dice & Dame', 'Midnight Jazz', 'Cigar Lounge', 'Dress Shop', 'Racing Wire', 'Opera Door', 'Diamond Row', 'Silver Fox Bar', 'Casino Annex', 'Penthouse Club', 'Tux Rental', 'The Roulette', 'Gold Leaf Hotel', 'Kiss & Tell'],
 'kes': ['Dock Cafe', 'Chandlery', 'Rope Works', 'Pier Row Bar', 'Fish Market', 'Ship Agent', 'Cold Store', 'Customs Annex', 'Union Pub', 'Ice House', 'Net Loft', 'Smokehouse', 'Boat Yard', 'Cannery', 'Shipwright', 'Crate Works', 'Tally Shed', 'Rigging Loft', 'Bonded Store', 'Fuel Shed'],
 'civ': ['Records Office', 'Press Club', 'Lawyers Row', 'Post Office', 'Bar Association', 'Night School', 'Tax Bureau', 'Land Office', 'Fire Station 1', 'Notary', 'City Archive', 'Mayor Annex'],
 'ten': ['Boarding House', 'Corner Grocery', 'Laundry', 'Cheap Rooms', 'Rag Shop', 'Soup Kitchen', 'Tenement 4', 'Tenement 9', 'Tenement 11', 'Pool Hall', 'Pawn & Loan', 'Tailor', 'Penny Cafe', 'Cobbler', 'Barber', 'Hush Lane Flats', 'Coal Yard', 'Rooms To Let'],
 'mhe': ['Maple Flats', 'Florist', 'Dentist', 'Bookshop', 'Pharmacy', 'Doctor Hale', 'Bakery', 'Fire Station 2', 'Grocers', 'Diner', 'School', 'Toy Shop', 'Cinema', 'Tea Room'],
 'sta': ['Signal Box', 'Rail Freight', 'Ticket Office', 'Parcel Depot', 'Waiting Rooms', 'Left Luggage', 'Rail Hotel', 'Telegraph', 'Newsstand', 'Porter Lodge'],
}
# ------------------------------------------------------------------ water: harbour + river
coast = [(-20, 1590), (250, 1560), (600, 1600), (950, 1570), (1300, 1620), (1650, 1580), (2000, 1610), (2350, 1560), (2700, 1600), (3020, 1570)]
cp = Path(coast, 12).p
S.dr.polygon(cp + [(W, H), (0, H)], fill=(20, 40, 62)); S.bd.polygon(cp + [(W, H), (0, H)], fill=255)
river = Path([(3020, 1020), (2800, 1100), (2650, 1260), (2500, 1420), (2420, 1560)], 12)
S.dr.line(river.p, fill=(20, 40, 62), width=110, joint='curve'); S.bd.line(river.p, fill=255, width=130, joint='curve')
for y in range(1600, H, 8): S.dr.line([0, y, W, y + r.randint(-3, 3)], fill=(28, 52, 78), width=1)
for _ in range(400): x, y = r.randint(0, W), r.randint(1620, H); S.dr.line([x, y, x + r.randint(10, 30), y], fill=(46, 80, 112))
# ------------------------------------------------------------------ roads
S.road([(-60, 980), (500, 930), (1100, 1000), (1500, 940), (2000, 1000), (2600, 960), (3060, 1000)], 86, tag='Halloran Avenue')
S.road([(900, -60), (1000, 400), (1300, 650), (1500, 940)], 92, tag='Velvet Strip')
S.road([(1500, 940), (2000, 700), (2500, 520), (3060, 420)], 66, tag='Courthouse Road')
S.road([(1500, 940), (1100, 1200), (700, 1300), (-60, 1380)], 62, tag='Hush Lane Road')
S.road([(1500, 940), (1550, 1200), (1500, 1480)], 68, tag='Pier Row')
S.road([(1500, 940), (2000, 1150), (2500, 1250), (3060, 1300)], 60, tag='Station Road')
S.road([(100, 120), (900, 170), (1700, 100), (2500, 160), (3060, 220)], 58, tag='North Ring')
S.road([(-60, 1470), (600, 1500), (1300, 1520), (2000, 1500), (2480, 1460)], 62, tag='Quay Road')
mains = list(S.roads)
for m in mains: S.bd.line(m['path'].p, fill=255, width=m['w'] + 2 * m['sw'] + 4, joint='curve')
PZ = [(1500, 940, 112, 'Founders Square'), (2020, 1130, 100, 'Maple Park'), (2350, 650, 70, ''), (420, 800, 62, '')]
for (px, py, pr, nm) in PZ: S.bd.ellipse([px - pr - 8, py - pr - 8, px + pr + 8, py + pr + 8], fill=255)
# ------------------------------------------------------------------ landmarks
LM = [
 ('LANTERN HALL (Black Lantern HQ)', 440, 360, 270, 170, 90, 'lan', GOLD, 'tier'), ('GILDED ACE CASINO (Vantelli HQ)', 1100, 300, 300, 180, 100, 'van', GOLD, 'tier'),
 ('CITY HALL', 2150, 260, 320, 190, 90, 'civ', WHT, 'dome'), ('Station 6 Police', 2640, 300, 220, 140, 70, 'civ', BLUE, 'box'),
 ('KESTREL UNION HALL', 1180, 1250, 260, 160, 72, 'kes', BLUE, 'box'), ("Mama Reyes' Grocery (informant)", 410, 1190, 120, 70, 44, 'ten', GRN, 'box'),
 ('Pier 3 Smuggler Warehouse', 1620, 1280, 320, 170, 58, 'kes', RED, 'box'), ('Warehouse 9', 640, 1160, 270, 160, 58, 'kes', AMB, 'box'), ('Central Rail Station', 2600, 1060, 290, 120, 56, 'sta', WHT, 'station'),
 ('Club Verona', 980, 540, 150, 100, 60, 'van', (255, 130, 170), 'box'), ('Hotel Regal', 1450, 520, 210, 120, 96, 'van', GOLD, 'tier'), ('Vantelli Bank & Loans', 1620, 380, 190, 110, 80, 'van', GOLD, 'box'),
 ('St. Anselm Chapel', 330, 940, 120, 100, 70, 'ten', WHT, 'chapel'), ('Halloran Courthouse', 1900, 380, 220, 150, 76, 'civ', WHT, 'box'), ('St. Mercy Hospital', 2500, 840, 220, 130, 72, 'mhe', WHT, 'box'),
 ('Red Lantern Bar', 270, 480, 120, 80, 48, 'lan', RED, 'box'), ('Brine & Bait Pub', 1060, 1380, 140, 80, 44, 'kes', AMB, 'box'), ('Customs House', 1900, 1290, 200, 120, 56, 'kes', WHT, 'box'),
 ('Harbour Master', 640, 1400, 120, 80, 44, 'kes', WHT, 'box'), ('Evidence Room (Station 6)', 2900, 300, 100, 80, 50, 'civ', BLUE, 'box'), ('Halloran Library', 2720, 560, 190, 110, 64, 'civ', WHT, 'box'),
]
for (nm, x, y, w, d, fh, dk, nc, shape) in LM:
    pos = S.spiral(x, y, w, d + fh, 4)
    if not pos: print('NO SPOT', nm); continue
    b = S.add(x=int(pos[0]), y=int(pos[1]), w=w, d=d, fh=fh, dk=dk, name=nm, neon=nc, shape=shape, lm=True); S.used.add(nm.lower()); S.named[nm] = (b['x'] + w / 2, b['y'] + d / 2)
# branches: narrow, winding lanes (esp. Old Town and tenements)
for k in range(220):
    m = r.choice(mains); d0 = r.uniform(80, m['path'].L - 80); x, y, a = m['path'].at(d0)
    s_ = r.choice([-1, 1]); a2 = a + s_ * (math.pi / 2 + r.uniform(-.7, .7)); n = r.randint(2, 5); pts = [(x, y)]
    for i in range(n): L = r.uniform(90, 200); a2 += r.uniform(-.55, .55); x += math.cos(a2) * L; y += math.sin(a2) * L; pts.append((x, y))
    if not all(40 < px < W - 40 and 40 < py < 1440 for px, py in pts): continue
    Pb = Path(pts, 8)
    if sum(1 for q in S.roads if q['tag'] is None) >= 34: break
    if any(S.occ.getpixel((int(min(W - 1, max(0, px))), int(min(H - 1, max(0, py))))) for px, py in Pb.p[::3]): continue
    if any(S.blk.getpixel((int(min(W - 1, max(0, px))), int(min(H - 1, max(0, py))))) for px, py in Pb.p[8::3]): continue
    dk = district(x, y); S.road(pts, r.choice([22, 26, 30]) if dk in ('lan', 'ten') else r.choice([32, 38]), seg=8, sw=9); S.bd.line(Pb.p, fill=255, width=52, joint='curve')
S.draw_roads((86, 86, 98), (30, 32, 40), (16, 18, 24), (150, 130, 60), two=False)
for (px, py, pr, nm) in PZ:
    S.dr.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(70, 78, 70) if nm in ('Maple Park',) else (92, 92, 104), outline=(130, 130, 144), width=3)
# rail yard + tracks (kestrel docks) and station tracks
for ty in range(1425, 1465, 7): S.dr.line([600, ty, 1500, ty], fill=(110, 100, 90), width=2); S.bd.line([600, ty, 1500, ty], fill=255, width=6)
for tx in range(600, 1500, 12): S.dr.line([tx, 1422, tx, 1462], fill=(60, 48, 40))
S.bd.rectangle([600, 1418, 1500, 1466], fill=255)
for k in range(9): S.dr.rectangle([620 + k * 70, 1428, 620 + k * 70 + 56, 1440], fill=r.choice([(120, 50, 40), (60, 90, 70), (130, 110, 60), (60, 70, 100)]), outline=(10, 10, 10))
# ------------------------------------------------------------------ fill
def fill(att, scale, pad):
    for _ in range(att):
        x, y = r.uniform(10, W - 150), r.uniform(10, 1560); dk = district(x, y); P = PAL[dk]
        w = int(r.uniform(*P['sz'][0]) * scale); d = int(r.uniform(*P['sz'][1]) * scale); fh = int(r.uniform(*P['fh']) * max(.6, scale))
        if not S.free(x, y, w, d + fh, pad): continue
        pool = [n for n in NAMES[dk] if n.lower() not in S.used]; nm = pool[0] if pool and scale > .45 else None
        if nm: S.used.add(nm.lower()); r.shuffle(NAMES[dk])
        S.add(x=int(x), y=int(y), w=w, d=d, fh=fh, dk=dk, name=nm, neon=r.choice(P['neon']), shape=r.choice(['box'] * 6 + ['chim', 'tank']))
fill(30000, 1.0, 6); fill(60000, .8, 5); fill(90000, .6, 4); fill(120000, .42, 3); fill(150000, .28, 3)
print('buildings', len(S.blds))
for b in S.blds:
    k = b['fh'] * .5; x, y, w, d, fh = b['x'], b['y'], b['w'], b['d'], b['fh']
    S.sd.polygon([(x + w, y + d + fh), (x + w + k, y + d + fh + k * .6), (x + w + k, y + fh + k * .6 + 4), (x + w, y + 4), (x, y + d + fh), (x + k * .4, y + d + fh + k * .9)], fill=(0, 0, 8, 120))
def pcol(): return r.choice([(30, 30, 40), (60, 40, 40), (50, 56, 70), (90, 76, 60), (130, 120, 110), (40, 50, 40)])
STACK = {'HOTEL': RED, 'BAR': GOLD, 'JAZZ': BLUE, 'CASINO': GOLD, 'DINER': AMB, 'ROOMS': GRN}
def draw_building(b):
    dr, gd = S.dr, S.gd; x, y, w, d, fh = b['x'], b['y'], b['w'], b['d'], b['fh']; P = PAL[b['dk']]; sh = b['shape']; nc = b['neon']
    wall = mix(P['wall'], r.uniform(-.14, .14)); roof = mix(P['roof'], r.uniform(-.1, .1)); fy = y + d
    if sh == 'station':
        for ty in range(y - 40, y + d + 40, 10): dr.line([x - 260, ty, x + w + 260, ty], fill=(110, 104, 96), width=2)
        for tx in range(int(x - 260), int(x + w + 260), 12): dr.line([tx, y - 44, tx, y + d + 40], fill=(56, 44, 36))
        dr.rectangle([x - 30, y - 56, x + w + 30, y - 40], fill=(70, 70, 80)); gd.rectangle([x - 30, y - 56, x + w + 30, y - 40], outline=(40, 40, 30))
        for k in range(3): dr.rectangle([x + 70 + k * 120, y + d + 52, x + 160 + k * 120, y + d + 64], fill=r.choice([(110, 44, 36), (46, 74, 60)]))
    dr.rectangle([x, fy, x + w - 1, fy + fh - 1], fill=wall); dr.rectangle([x + w - 4, fy, x + w - 1, fy + fh - 1], fill=mix(wall, -.3)); dr.rectangle([x, fy, x + w - 1, fy + 3], fill=mix(wall, .12))
    if b['dk'] in ('civ', 'sta'):
        for cx in range(x + 8, x + w - 8, 24): dr.rectangle([cx, fy + 4, cx + 6, fy + fh - 4], fill=mix(wall, .25))   # columns
    else:
        for i in range(8, fh, 6): dr.line([x, fy + i, x + w - 1, fy + i], fill=mix(wall, -.2))                         # brick courses
    wl = [(255, 210, 120), (255, 160, 90), (255, 230, 170)]
    for wy in range(fy + 7, fy + fh - 24, 14):
        for wx in range(x + 6, x + w - 12, 13):
            if r.random() < .5: c = r.choice(wl); dr.rectangle([wx, wy, wx + 6, wy + 8], fill=c); gd.rectangle([wx, wy, wx + 6, wy + 8], fill=mix(c, -.68)) if r.random() < .4 else None
            else: dr.rectangle([wx, wy, wx + 6, wy + 8], fill=mix(wall, -.55))
            dr.line([wx - 1, wy + 9, wx + 7, wy + 9], fill=mix(wall, .2))
    if b['dk'] == 'ten' and w > 40:   # fire escape
        fx = x + w - 16
        for fyy in range(fy + 6, fy + fh - 26, 14): dr.line([fx, fyy, fx + 12, fyy], fill=(20, 20, 24), width=2); dr.line([fx, fyy, fx + 12, fyy + 14], fill=(20, 20, 24))
    sy0 = fy + fh - 22; dr.rectangle([x, sy0, x + w - 1, fy + fh - 1], fill=(16, 14, 18))
    nd = max(1, w // 40)
    for i in range(nd):
        dx = x + int((i + .5) * w / nd) - 8; c = r.choice(P['neon'] + [nc]); dr.rectangle([dx - 8, sy0 + 4, dx + 24, fy + fh - 2], fill=mix((255, 200, 120), -.55)); dr.rectangle([dx + 2, sy0 + 5, dx + 14, fy + fh - 2], fill=(18, 14, 12)); gd.rectangle([dx - 8, sy0 + 4, dx + 24, fy + fh - 2], fill=(90, 62, 30))
        for j in range(0, 36, 8): dr.rectangle([dx - 10 + j, sy0 - 1, dx - 6 + j, sy0 + 5], fill=c if (j // 8) % 2 == 0 else (225, 225, 215))      # awning stripes
    if b.get('name') and w >= 56: S.name_sign(x + 2, sy0 - 12, w - 4, b['name'], nc)
    if (r.random() < .22 or b.get('lm')) and fh > 56:   # vertical neon blade sign, stacked letters
        word = r.choice(list(STACK)); c = STACK[word]; bx = x - 2 if r.random() < .5 else x + w - 8; dr.rectangle([bx, fy + 6, bx + 9, fy + 6 + 11 * len(word)], fill=mix(c, -.75), outline=c)
        for i, ch in enumerate(word): dr.text((bx + 5, fy + 12 + i * 11), ch, font=font(9, True), fill=mix(c, .5), anchor='mm')
        gd.rectangle([bx - 3, fy + 4, bx + 12, fy + 8 + 11 * len(word)], fill=mix(c, -.55))
    dr.rectangle([x, y, x + w, y + d], fill=roof, outline=mix(roof, .35)); dr.line([x + 1, y + d, x + w - 1, y + d], fill=mix(roof, -.5), width=3)
    for _ in range(int(w * d / 90)): px, py = x + r.randint(3, max(4, w - 3)), y + r.randint(3, max(4, d - 3)); dr.point([px, py], fill=mix(roof, r.choice([-.2, .15])))
    for _ in range(max(1, int(w * d / 1700))):
        px, py = x + r.randint(8, max(9, w - 30)), y + r.randint(8, max(9, d - 24)); q = r.random()
        if q < .3: dr.rectangle([px, py, px + 8, py + 14], fill=(82, 60, 44)); dr.rectangle([px - 1, py - 2, px + 9, py], fill=(50, 38, 28)); S.sd.ellipse([px - 4, py - 16, px + 14, py - 2], fill=(180, 180, 190, 50))   # chimney + smoke
        elif q < .5: dr.ellipse([px, py, px + 15, py + 15], fill=(92, 70, 48), outline=(30, 22, 14)); dr.line([px + 2, py + 15, px + 2, py + 24], fill=(30, 22, 14)); dr.line([px + 13, py + 15, px + 13, py + 24], fill=(30, 22, 14))  # water tank
        elif q < .75: dr.rectangle([px, py, px + 16, py + 11], fill=mix(roof, .12)); dr.rectangle([px + 2, py + 2, px + 14, py + 9], fill=(30, 40, 56))
        else: dr.rectangle([px, py, px + 10, py + 6], fill=(96, 94, 88))
    if r.random() < .12 and w > 70: bc = r.choice([GOLD, RED, BLUE]); bx = x + 6; dr.rectangle([bx, y + 4, bx + 52, y + 20], fill=mix(bc, -.6), outline=bc); dr.text((bx + 26, y + 12), r.choice(['GIN', 'ROYAL', 'COLA', 'LUCKY']), font=font(10, True), fill=mix(bc, .5), anchor='mm'); gd.rectangle([bx, y + 4, bx + 52, y + 20], fill=mix(bc, -.45))
    if sh == 'tier' or (b.get('lm') and sh == 'box' and fh > 80):
        ix, iy, iw, idd = x + w * .22, y + d * .2, w * .56, d * .5; ifh = 24
        dr.rectangle([ix, iy + idd, ix + iw, iy + idd + ifh], fill=mix(wall, -.1)); [dr.rectangle([ix + j, iy + idd + 6, ix + j + 6, iy + idd + 13], fill=r.choice(wl)) for j in range(6, int(iw) - 6, 13)]
        dr.rectangle([ix, iy, ix + iw, iy + idd], fill=mix(roof, .1), outline=mix(roof, .4))
    if sh == 'dome':
        cx, cy = x + w / 2, y + d / 2; dr.ellipse([cx - 52, cy - 52, cx + 52, cy + 52], fill=(70, 130, 130), outline=(160, 220, 210), width=3)
        for a_ in range(0, 360, 30): dr.line([cx, cy, cx + 52 * math.cos(math.radians(a_)), cy + 52 * math.sin(math.radians(a_))], fill=(110, 170, 165))
        dr.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(220, 240, 235)); dr.rectangle([x + w - 52, y + 12, x + w - 22, y + 42], fill=(110, 108, 118), outline=(190, 190, 205)); dr.ellipse([x + w - 48, y + 16, x + w - 26, y + 38], fill=(235, 235, 220), outline=(40, 40, 40)); gd.ellipse([x + w - 48, y + 16, x + w - 26, y + 38], fill=(120, 110, 70))
    if sh == 'chapel':
        dr.rectangle([x + w // 2 - 9, y - 38, x + w // 2 + 9, y + 10], fill=(150, 150, 160), outline=(40, 40, 50)); dr.polygon([(x + w // 2 - 11, y - 38), (x + w // 2 + 11, y - 38), (x + w // 2, y - 62)], fill=(90, 70, 70))
    if b['name'] in ('GILDED ACE CASINO (Vantelli HQ)', 'Club Verona', 'Hotel Regal', 'Station 6 Police'):  # marquee bulbs and searchlight
        for i in range(0, w, 8): dr.ellipse([x + i, fy + fh - 28, x + i + 4, fy + fh - 24], fill=(255, 235, 150)); gd.ellipse([x + i - 3, fy + fh - 31, x + i + 7, fy + fh - 21], fill=(100, 80, 30))
for b in sorted(S.blds, key=lambda b: b['y'] + b['d']): draw_building(b)
# ------------------------------------------------------------------ piers, quay, ships, cranes, containers, lighthouse
for k, px in enumerate(range(160, 2900, 150)):
    if 2380 < px < 2480: continue
    ln = r.randint(130, 300); yy = 1575 + (math.sin(px / 400) * 18)
    S.dr.rectangle([px, yy - 20, px + 26, yy + ln], fill=(98, 72, 48), outline=(20, 14, 8)); [S.dr.line([px, i, px + 26, i], fill=(60, 44, 30)) for i in range(int(yy), int(yy + ln), 8)]
    for i in range(int(yy), int(yy + ln), 28): S.dr.ellipse([px - 3, i, px + 1, i + 4], fill=(30, 24, 20)); S.dr.ellipse([px + 25, i, px + 29, i + 4], fill=(30, 24, 20))
    if r.random() < .6: bx = px + 40; by = yy + r.randint(20, ln - 80); S.sd.polygon(rotrect(bx + 10, by + 60, 36, 120, 1.5708), fill=(0, 0, 8, 90)); S.dr.polygon([(bx, by), (bx + 34, by), (bx + 40, by + 24), (bx + 17, by + 54), (bx - 6, by + 24)], fill=r.choice([(110, 46, 36), (46, 76, 100), (60, 60, 64)]), outline=(10, 10, 10)); S.dr.rectangle([bx + 8, by + 12, bx + 26, by + 28], fill=(210, 205, 190)); S.gd.ellipse([bx + 12, by + 14, bx + 22, by + 24], fill=(100, 80, 40))
    if r.random() < .35: S.dr.line([px + 13, yy - 20, px + 13, yy - 70], fill=(170, 120, 50), width=4); S.dr.line([px + 13, yy - 70, px + 90, yy - 70], fill=(170, 120, 50), width=4); S.dr.line([px + 90, yy - 70, px + 90, yy - 30], fill=(80, 80, 80), width=1)
for k in range(46):  # containers on the quay
    cx = r.randint(40, 2350); cy = r.choice([1534, 1546, 1558]); 
    if S.blk.getpixel((cx, cy - 10)) == 0: continue
    S.dr.rectangle([cx, cy, cx + 38, cy + 10], fill=r.choice([(150, 60, 50), (50, 100, 140), (190, 150, 60), (60, 120, 80), (110, 110, 120)]), outline=(10, 10, 10))
S.dr.polygon([(1960, 1560), (1990, 1560), (1990, 1700), (1975, 1712), (1960, 1700)], fill=(30, 30, 30)); S.dr.ellipse([1965, 1530, 1985, 1550], fill=(255, 230, 150)); S.gd.ellipse([1930, 1500, 2020, 1590], fill=(110, 90, 40))   # lighthouse top
S.sd.polygon([(1975, 1540), (1700, 1750), (1700, 1850)], fill=(255, 240, 180, 26))
# bridge over river
for ang_pt in [river.at(river.L * .55)]:
    x, y, a = ang_pt
    for rd in S.roads:
        if rd['tag'] == 'Station Road':
            for px in range(2550, 2850, 14): S.dr.line([px, 1240, px, 1275], fill=(60, 60, 70)); 
# ------------------------------------------------------------------ street life
def edge(m, d, s, off=0):
    x, y, a = m['path'].at(d); o = m['w'] / 2 + m['sw'] / 2 + off; return x - math.sin(a) * o * s, y + math.cos(a) * o * s, a
for m in S.roads:
    P = m['path']; d = 40
    while d < P.L - 40:
        s = r.choice([-1, 1]); x, y, a = edge(m, d, s)
        if 0 <= x < W and 0 <= y < H and S.blk.getpixel((int(x), int(y))):
            S.dr.rectangle([x - 1, y - 14, x, y], fill=(70, 74, 84)); S.dr.ellipse([x - 4, y - 18, x + 4, y - 11], fill=(255, 225, 150)); S.gd.ellipse([x - 22, y - 36, x + 22, y + 8], fill=(60, 48, 26))
            for k in range(5): S.gd.line([x - 2 + k * 2, y + 14, x - 2 + k * 2, y + 14 + r.randint(10, 26)], fill=(40, 34, 20))   # wet reflection
        d += 200
    d = 20
    while d < P.L - 20:
        s = r.choice([-1, 1]); x, y, a = edge(m, d, s, r.uniform(-3, 3))
        if 0 <= x < W and 0 <= y < H and S.blk.getpixel((int(x), int(y))) and r.random() < .8:
            for _ in range(r.choice([1, 1, 2])): S.person(x + r.uniform(-7, 7), y + r.uniform(-3, 3), pcol(), umb=r.choice([(20, 20, 26), (130, 30, 40), (30, 40, 80), (20, 20, 26), (200, 200, 190)]) if r.random() < .6 else None)
        d += r.uniform(16, 44)
    if m['w'] >= 56 and district(*m['path'].at(m['path'].L / 2)[:2]) in ('lan',) or m['tag'] is None and m['w'] <= 30 and r.random() < .5:   # lantern strings across lanes
        for k in range(0, int(P.L), 140):
            x, y, a = P.at(k); nx, ny = -math.sin(a), math.cos(a); hw = m['w'] / 2 + 14
            S.dr.line([x - nx * hw, y - ny * hw, x + nx * hw, y + ny * hw], fill=(70, 20, 20), width=1)
            for t in range(-int(hw), int(hw) + 1, 9): lx, ly = x + nx * t, y + ny * t; S.dr.ellipse([lx - 3, ly - 3, lx + 3, ly + 3], fill=r.choice([(230, 50, 50), (255, 190, 60)])); S.gd.ellipse([lx - 8, ly - 8, lx + 8, ly + 8], fill=(90, 30, 20))
for (nm, (cx, cy)) in S.named.items():
    if nm in ('GILDED ACE CASINO (Vantelli HQ)', 'Club Verona', 'Red Lantern Bar'):
        for k in range(8): S.person(cx - 40 + k * 10, cy + 70 + (k % 2) * 6, pcol(), umb=(20, 20, 26) if k % 2 else None)
for (px, py, pr, nm) in PZ:
    for _ in range(int(pr / 6)): a = r.uniform(0, 6.28); rr = r.uniform(8, pr - 8); S.person(px + rr * math.cos(a), py + rr * math.sin(a), pcol(), umb=(20, 20, 26) if r.random() < .5 else None)
    if nm in ('Maple Park', ''):
        for _ in range(int(pr / 8)): a = r.uniform(0, 6.28); rr = r.uniform(10, pr - 14); S.dr.ellipse([px + rr * math.cos(a) - 10, py + rr * math.sin(a) - 10, px + rr * math.cos(a) + 10, py + rr * math.sin(a) + 10], fill=(34, 62, 44)); 
S.dr.ellipse([1500 - 22, 940 - 22, 1500 + 22, 940 + 22], fill=(70, 100, 120), outline=(160, 200, 220), width=2); S.dr.rectangle([1497, 925, 1503, 957], fill=(150, 150, 160)); S.gd.ellipse([1480, 920, 1520, 960], fill=(30, 50, 60))   # fountain + statue
# tram on Halloran Avenue
tm = [m for m in S.roads if m['tag'] == 'Halloran Avenue'][0]['path']
for t0 in (400, 1500, 2300):
    for j in range(2):
        x, y, a = tm.at(t0 + j * 74); S.dr.polygon(rotrect(x, y, 70, 20, a), fill=(210, 205, 170), outline=(20, 20, 20)); S.dr.polygon(rotrect(x, y, 56, 10, a), fill=(255, 220, 130)); S.gd.polygon(rotrect(x, y, 60, 14, a), fill=(90, 70, 30))
for t in range(0, int(tm.L), 6): x, y, a = tm.at(t); S.dr.point([x - math.sin(a) * 6, y + math.cos(a) * 6], fill=(150, 150, 160)); S.dr.point([x + math.sin(a) * 6, y - math.cos(a) * 6], fill=(150, 150, 160))
# vintage cars with headlight glow
for m in S.roads:
    P = m['path']; n = int(P.L / (320 if m['w'] > 56 else 520))
    for _ in range(n):
        x, y, a = P.at(r.uniform(30, P.L - 30)); s = r.choice([-1, 1]); off = m['w'] * .24 * s; x2, y2 = x - math.sin(a) * off, y + math.cos(a) * off
        if m['tag'] == 'Halloran Avenue': continue
        if s < 0: a += math.pi
        c = r.choice([(24, 24, 30), (110, 28, 34), (200, 190, 150), (36, 54, 74), (50, 70, 50)]); S.car(x2, y2, a, c, l=32, w=14, glow=(120, 100, 40))
        S.gd.polygon([(x2 + math.cos(a) * 16, y2 + math.sin(a) * 16), (x2 + math.cos(a) * 54 - math.sin(a) * 18, y2 + math.sin(a) * 54 + math.cos(a) * 18), (x2 + math.cos(a) * 54 + math.sin(a) * 18, y2 + math.sin(a) * 54 - math.cos(a) * 18)], fill=(46, 40, 18))
# steam from manholes and rain ripples
for _ in range(60):
    m = r.choice(S.roads); x, y, a = m['path'].at(r.uniform(0, m['path'].L))
    if 0 <= x < W and 0 <= y < H: S.dr.ellipse([x - 4, y - 3, x + 4, y + 3], fill=(40, 42, 50)); S.sd.ellipse([x - 12, y - 24, x + 12, y - 2], fill=(200, 200, 215, 46))
for _ in range(700):
    x, y = r.randint(0, W - 1), r.randint(0, H - 1)
    if S.blk.getpixel((x, y)): S.dr.ellipse([x - 5, y - 2, x + 5, y + 2], outline=(70, 90, 120))
S.finish(vignette=.5)
im = S.out.convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov); r2 = random.Random(5)
for _ in range(9000): x, y = r2.randint(0, W), r2.randint(0, H); od.line([x, y, x - 6, y + 16], fill=(170, 190, 230, 60), width=1)
fog = Image.new('RGBA', im.size, (0, 0, 0, 0)); fd = ImageDraw.Draw(fog)
for y in range(1450, 1700, 4): fd.line([0, y, W, y], fill=(110, 130, 160, int(34 * (1 - abs(y - 1560) / 140)) if abs(y - 1560) < 140 else 0))
S.out = Image.alpha_composite(Image.alpha_composite(im, fog), ov).convert('RGB')
d = ImageDraw.Draw(S.out)
dl = {'lan': 'OLD TOWN (Black Lantern)', 'van': 'THE VELVET STRIP (Vantelli)', 'kes': 'PIER ROW & THE DOCKS (Kestrel Union)', 'civ': 'DOWNTOWN (neutral: city hall, courts, Station 6)', 'ten': 'HUSH LANE (tenements)', 'mhe': 'MAPLE HEIGHTS', 'sta': 'CENTRAL RAIL'}
for (x, y, t) in [(520, 250, 'lan'), (1280, 220, 'van'), (1260, 1190, 'kes'), (2350, 150, 'civ'), (480, 1080, 'ten'), (2480, 770, 'mhe'), (2560, 1130, 'sta')]:
    f = font(26, True); tt = dl[t]; d.text((x + 2, y + 2), tt, font=f, fill=(0, 0, 0), anchor='mm'); d.text((x, y), tt, font=f, fill=(235, 228, 210), anchor='mm')
d.text((1500, 1078), 'Founders Square', font=font(14, True), fill=(210, 215, 235), anchor='mm'); d.text((1500, 1760), 'HALLORAN HARBOUR', font=font(30, True), fill=(120, 150, 190), anchor='mm')
keys = ['LANTERN HALL (Black Lantern HQ)', 'GILDED ACE CASINO (Vantelli HQ)', 'CITY HALL', 'Evidence Room (Station 6)', 'KESTREL UNION HALL', "Mama Reyes' Grocery (informant)", 'Pier 3 Smuggler Warehouse', 'Warehouse 9', 'Central Rail Station']
for n, k in enumerate(keys, 1):
    x, y = S.named[k]; d.ellipse([x - 15, y - 15, x + 15, y + 15], fill=(255, 235, 80), outline=(0, 0, 0), width=3); d.text((x, y), str(n), font=font(17, True), fill=(0, 0, 0), anchor='mm')
items = [(1, 'Lantern Hall', 'Black Lantern Society HQ; protection and politics'), (2, 'Gilded Ace Casino', 'Vantelli Family HQ; gambling and finance; private table'), (3, 'City Hall', 'neutral; mayor, records, bribes'), (4, 'Evidence Room (Station 6)', 'police; evidence mission; cops on the take'), (5, 'Kestrel Union Hall', 'dock union HQ; Warehouse 14 ledger nearby'), (6, "Mama Reyes' Grocery", 'informant in Hush Lane'), (7, 'Pier 3 Smuggler Warehouse', 'Kestrel contraband'), (8, 'Warehouse 9', 'Kestrel front; framing-job staging spot'), (9, 'Central Rail Station', 'arrivals; customs; agency entry by boat at the pier')]
img = legend_panel(S.out, items, 'SAINT HALLORAN, Westreach', ['Organic city plan (mock). Rain, wet streets, brick, neon.', 'Black Lantern (Old Town lanes, lantern strings),', 'Vantelli (Velvet Strip, marquees), Kestrel (docks, rail yard),', 'neutral civic core, tenements, Maple Heights, harbour.'], [(GOLD, 'Black Lantern: gold and red lanterns'), (RED, 'Vantelli: velvet red, marquee bulbs'), (BLUE, 'Kestrel: dock blue, cranes, containers'), (WHT, 'police and civic: cold white-blue'), ((255, 225, 150), 'tram line on Halloran Avenue'), ((255, 235, 80), 'numbered landmark')])
S.out.save('/tmp/noir_raw_final.png')
img.save(os.path.join(OUT, 'proposal-postwar-noir-city.png')); print('done')
