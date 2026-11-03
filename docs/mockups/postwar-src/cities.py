# Building-level mock maps for Neumina and Saint Halloran. Layout mock only (not game art).
# Run: python3 -I cities.py   (needs Pillow; writes PNGs next to docs/mockups/)
import random, os
from PIL import Image, ImageDraw, ImageFont
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
T = 12
FP = '/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf'
def font(s, b=False): return ImageFont.truetype(FP % ('-Bold' if b else ''), s)
def mix(c, k):  # k>0 lighten, k<0 darken
    return tuple(max(0, min(255, int(v + (255 - v) * k) if k > 0 else int(v * (1 + k)))) for v in c)

class City:
    def __init__(s, W, H, ground, seed, style):
        s.W, s.H, s.T = W, H, T; s.r = random.Random(seed); s.style = style
        s.im = Image.new('RGB', (W * T, H * T), ground); s.d = ImageDraw.Draw(s.im)
        s.marks = []; s.lots = []; s.used = set(); s.named = {}
    def rect(s, x, y, w, h, c, o=None): s.d.rectangle([x * T, y * T, (x + w) * T - 1, (y + h) * T - 1], fill=c, outline=o)
    def px(s, x0, y0, x1, y1, c): s.d.rectangle([x0, y0, x1, y1], fill=c)
    def sign(s, x, y, w, text, col):  # neon strip, text fitted
        sz = 9
        while sz > 5 and font(sz, True).getlength(text) > w * T - 4: sz -= 1
        f = font(sz, True)
        while f.getlength(text) > w * T - 4 and len(text) > 3: text = text[:-2]; f = font(sz, True)
        s.px(x * T + 1, y * T, (x + w) * T - 2, y * T + 10, mix(col, -0.75))
        s.d.rectangle([x * T + 1, y * T, (x + w) * T - 2, y * T + 10], outline=col)
        s.d.text((x * T + w * T // 2, y * T + 5), text, font=f, fill=mix(col, 0.55), anchor='mm')
    def building(s, x, y, w, h, wall, name, neon, kind='gen', big=False):
        r = s.r; roofh = h - 3
        roof = mix(wall, 0.22 if s.style == 'neu' else 0.05)
        if s.style == 'noir': roof = mix(wall, -0.25)
        s.rect(x, y, w, roofh, roof)
        s.px(x * T, y * T, (x + w) * T - 1, y * T + 1, mix(roof, 0.25))             # roof edge light
        s.px(x * T, (y + roofh) * T - 3, (x + w) * T - 1, (y + roofh) * T - 1, mix(roof, -0.45))  # eave shadow
        s.px(x * T, y * T, x * T, (y + roofh) * T - 1, mix(roof, 0.12))
        n = max(1, int(w * roofh / 38))
        for _ in range(n):  # roof details
            dx = x * T + r.randint(6, max(7, w * T - 26)); dy = y * T + r.randint(6, max(7, roofh * T - 30))
            k = r.random()
            if s.style == 'neu':
                if k < .3: s.px(dx, dy, dx + 14, dy + 12, (70, 74, 96)); s.d.ellipse([dx + 2, dy + 1, dx + 12, dy + 11], outline=(20, 20, 40), fill=(46, 48, 70))
                elif k < .5: s.px(dx, dy, dx + 18, dy + 10, (24, 26, 60)); [s.px(dx + i, dy, dx + i, dy + 10, (60, 70, 130)) for i in range(2, 18, 4)]
                elif k < .7: s.px(dx, dy, dx + w * 4, dy + 1, (200, 50, 70)); s.px(dx, dy + 1, dx + w * 4, dy + 1, (120, 20, 40))
                elif k < .85: s.px(dx, dy, dx + 9, dy + 9, (110, 86, 70)); s.px(dx + 1, dy + 1, dx + 8, dy + 8, (140, 110, 88))
                else: s.d.ellipse([dx, dy, dx + 5, dy + 5], fill=(255, 70, 200)); s.px(dx + 2, dy + 5, dx + 3, dy + 14, (90, 90, 110))
            else:
                if k < .3: s.px(dx, dy, dx + 8, dy + 14, (74, 56, 40)); s.px(dx - 1, dy - 2, dx + 9, dy, (50, 38, 28))        # chimney
                elif k < .5: s.d.ellipse([dx, dy, dx + 14, dy + 14], fill=(86, 66, 46), outline=(40, 30, 20)); s.px(dx + 5, dy + 14, dx + 8, dy + 20, (40, 30, 20))  # water tank
                elif k < .75: s.px(dx, dy, dx + 14, dy + 10, mix(roof, .15)); s.px(dx + 2, dy + 2, dx + 12, dy + 8, (30, 40, 56))
                else: s.px(dx, dy, dx + 10, dy + 6, (92, 90, 84))
        fy = (y + roofh) * T                                                         # facade
        s.rect(x, y + roofh, w, 3, wall); s.px(x * T, fy, (x + w) * T - 1, fy, mix(wall, -.5))
        if s.style == 'noir':  # brick courses
            for i in range(4, 36, 5): s.px(x * T, fy + i, (x + w) * T - 1, fy + i, mix(wall, -.18))
        for wx in range(x * T + 5, (x + w) * T - 9, 14):                           # windows
            lit = r.random() < (.55 if s.style == 'noir' else .6)
            col = r.choice([(255, 210, 110), (255, 150, 90)]) if s.style == 'noir' else r.choice([(255, 120, 220), (110, 230, 255), (255, 220, 120), (150, 130, 255)])
            s.px(wx, fy + 4, wx + 6, fy + 11, col if lit else mix(wall, -.55))
        dx = x * T + (w * T) // 2 - 8                                                # door
        s.px(dx, fy + 18, dx + 15, fy + 35, (12, 10, 22)); s.px(dx + 1, fy + 19, dx + 14, fy + 22, mix(neon, -.2))
        if s.style == 'noir' and kind in ('club', 'casino', 'hotel', 'shop', 'bar'):  # awning
            for i in range(0, 17, 4): s.px(dx - 2 + i, fy + 13, dx + 1 + i, fy + 17, neon if (i // 4) % 2 == 0 else (220, 220, 210))
        if w >= 6: s.sign(x, y + roofh - 1, w, name, neon)
        s.lots.append((x, y, w, h, name))
    def road_dashes(s, vx, hy, W, H, col):
        for x in vx:
            for y in range(0, H * 2, 3): s.px(x * T + 5, y * 6, x * T + 6, y * 6 + 7, col)
        for y in hy:
            for x in range(0, W * 2, 3): s.px(x * 6, y * T + 5, x * 6 + 7, y * T + 6, col)
    def block(s, x, y, w, h, pave, spec, wall, neons, names, special=None, alley=None, rows=None):
        """sidewalk ring, then buildings in rows. special: list of (name, kind, neon) given to the biggest lots first."""
        s.rect(x, y, w, h, pave); s.rect(x + 1, y + 1, w - 2, h - 2, mix(pave, -.35))
        ix, iy, iw, ih = x + 1, y + 1, w - 2, h - 2
        r = s.r; rowsl = []; cy = iy
        while cy < iy + ih:
            rh = r.randint(10, 14) if rows is None else rows
            if iy + ih - (cy + rh) < 9: rh = iy + ih - cy
            rowsl.append((cy, rh)); cy += rh + 2
        lots = []
        for (ry, rh) in rowsl:
            cx = ix
            while cx < ix + iw:
                lw = r.randint(8, 15)
                if ix + iw - (cx + lw) < 7: lw = ix + iw - cx
                lots.append([cx, ry, lw, rh]); cx += lw
            # alley (2 tiles) between rows is simply the gap
        order = sorted(range(len(lots)), key=lambda i: -(lots[i][2] * lots[i][3]))
        names = list(names); r.shuffle(names); sp = dict()
        for k, (nm, kd, nc) in enumerate(special or []):
            if k < len(order): sp[order[k]] = (nm, kd, nc); s.used.add(nm.lower())
        pool = [n for n in names if n.lower() not in s.used]
        for i, (lx, ly, lw, lh) in enumerate(lots):
            if i in sp: nm, kd, nc = sp[i]; s.named[nm] = (lx + lw // 2, ly + (lh - 3) // 2)
            else:
                nc = r.choice(neons); kd = 'gen'
                nm = next((n for n in pool if n.lower() not in s.used), None)
                if nm is None: nm = 'Unit %d' % r.randint(10, 99)
                s.used.add(nm.lower())
            wc = mix(wall, r.uniform(-.12, .12))
            s.building(lx, ly, lw, lh, wc, nm, nc, kd)
        # alley clutter
        for (ry, rh) in rowsl[:-1]:
            ay = ry + rh
            for _ in range(w // 9):
                bx = r.randint(ix + 1, ix + iw - 3); s.px(bx * T, ay * T + 3, bx * T + 8, ay * T + 11, r.choice([(40, 60, 46), (70, 60, 44), (60, 60, 70)]))
    def palm(s, x, y):
        s.px(x * T + 5, y * T + 6, x * T + 7, y * T + 24, (90, 70, 120))
        for a, b in [(-9, -3), (9, -3), (-8, 4), (8, 4), (0, -9), (-4, -7), (4, -7)]:
            s.d.line([x * T + 6, y * T + 6, x * T + 6 + a, y * T + 6 + b], fill=(255, 70, 190), width=3)
        s.d.ellipse([x * T + 3, y * T + 3, x * T + 9, y * T + 9], fill=(255, 120, 220))
    def tree(s, x, y, c=(34, 66, 44)):
        s.d.ellipse([x * T, y * T, x * T + 20, y * T + 20], fill=c); s.d.ellipse([x * T + 4, y * T + 3, x * T + 16, y * T + 13], fill=mix(c, .25))
    def lamp(s, x, y, glow):
        s.px(x * T + 5, y * T, x * T + 6, y * T + 18, (110, 110, 140)); s.d.ellipse([x * T + 1, y * T - 3, x * T + 10, y * T + 5], fill=glow)
    def car(s, x, y, col, hover=False, vert=False):
        w, h = (14, 24) if vert else (26, 12)
        if hover: s.d.ellipse([x - 2, y - 2, x + w + 2, y + h + 2], fill=mix(col, -.6))
        s.d.rounded_rectangle([x, y, x + w, y + h], 3, fill=col, outline=(10, 10, 20)); s.px(x + 3, y + 3, x + w - 3, y + 6, mix(col, .5) if not vert else mix(col, .5))
    def bridge(s, x, y, w, h):  # elevated walkway (plan view): glass deck with rails
        s.px(x * T, y * T, (x + w) * T - 1, (y + h) * T - 1, (40, 120, 150)); s.px(x * T, y * T, (x + w) * T - 1, y * T + 2, (130, 240, 255)); s.px(x * T, (y + h) * T - 3, (x + w) * T - 1, (y + h) * T - 1, (130, 240, 255))
        for i in range(0, w * T, 10): s.px(x * T + i, y * T + 3, x * T + i, (y + h) * T - 4, (70, 170, 200))
    def numbered(s, marks):
        f = font(11, True)
        for n, (x, y) in enumerate(marks, 1):
            s.d.ellipse([x * T - 10, y * T - 10, x * T + 10, y * T + 10], fill=(255, 235, 80), outline=(0, 0, 0), width=2)
            s.d.text((x * T, y * T), str(n), font=f, fill=(0, 0, 0), anchor='mm')

def legend_panel(im, items, title, sub, extra=()):
    W, H = im.size; P = 560; out = Image.new('RGB', (W + P, H), (10, 10, 18)); out.paste(im, (0, 0)); d = ImageDraw.Draw(out)
    x0 = W + 20; d.text((x0, 24), title, font=font(24, True), fill=(235, 235, 250))
    y = 62
    for line in sub:
        d.text((x0, y), line, font=font(12), fill=(170, 175, 200)); y += 17
    y += 8
    for n, nm, desc in items:
        d.ellipse([x0, y, x0 + 22, y + 22], fill=(255, 235, 80), outline=(0, 0, 0)); d.text((x0 + 11, y + 11), str(n), font=font(11, True), fill=(0, 0, 0), anchor='mm')
        d.text((x0 + 32, y - 1), nm, font=font(13, True), fill=(235, 235, 250)); d.text((x0 + 32, y + 15), desc, font=font(11), fill=(160, 165, 190)); y += 40
    y += 10
    for c, t in extra:
        d.rectangle([x0, y, x0 + 24, y + 14], fill=c, outline=(0, 0, 0)); d.text((x0 + 34, y + 7), t, font=font(12), fill=(210, 212, 230), anchor='lm'); y += 22
    d.text((x0, H - 28), 'Mock only: building footprints, names and routes. Final art follows the supplied pixel-art reference.', font=font(10), fill=(120, 125, 150))
    return out

# ======================================================================= NEUMINA (Windfen League)
def neumina():
    W, H = 172, 102
    c = City(W, H, (20, 18, 42), 11, 'neu')
    c.road_dashes([47, 97, 144], [32, 66], W, H, (80, 70, 140))
    pave = (62, 56, 112)
    NE = [(255, 70, 200), (90, 230, 255), (255, 210, 90), (140, 255, 160), (170, 130, 255)]
    # (x,y,w,h, wall, names, special)
    res_names = ['Noodle Bar', 'Capsule Hotel', 'Laundromat', 'Pocket Market', 'Vending Hall', 'Clinic 4', 'Tea Stall', 'Co-op Flats', 'Repair Shop', 'Arcade', 'Print Shop', 'Pawn & Loan', 'Hair & Chrome', 'Kiosk Row', 'Sleep Pods', 'Ramen 24', 'Stack 12', 'Stack 14']
    corp_names = ['Meridian Bank', 'Axion Labs', 'Kade Logistics', 'Vireo Media', 'Helix Legal', 'Sable Energy', 'Quill Data', 'Orrin Archive', 'Atrium Cafe', 'Corp Lobby', 'Tower Annex', 'Skyline Offices']
    ent_names = ['Neon Lotus', 'Static Lounge', 'Holo Casino', 'Sushi Line', 'Karaoke Cell', 'Dream Parlour', 'Synth Records', 'Mirage Bar', 'Rook\'s Arms', 'Tattoo & Ports', 'Game Hall', 'Bubble Tea', 'Glass Mile Hotel']
    seam_names = ['Glitch Market', 'Chop Shop', 'Back-Alley Clinic', 'Data Fence', 'Smoke Den', 'Scrap Yard', 'Bunker Bar', 'Gambling Cellar', 'Parts Swap', 'Safehouse 9', 'Squat', 'Drop Point']
    ind_names = ['Kiln Works', 'Cell Foundry', 'Coolant Plant', 'Depot 7', 'Assembly B', 'Power Hub', 'Cargo Gate', 'Pump House', 'Warehouse 22', 'Recycler', 'Data Farm', 'Relay Mast']
    tr_names = ['Ticket Hall', 'Bus Bays', 'Cargo Lift', 'Lost & Found', 'Food Court', 'Taxi Rank', 'Metro Annex', 'Locker Hall']
    lab_names = ['Gene Lab', 'Cold Store', 'Server Vault', 'Staff Block', 'Clean Room', 'Test Hall', 'Guard Post', 'Loading Dock']
    c.block(2, 2, 44, 29, pave, 'res', (58, 50, 104), NE, res_names, [('Stackhaven Clinic', 'clinic', (140, 255, 160)), ('Agency Dead-drop Noodles', 'drop', (140, 255, 160)), ('Safehouse 9 (Stack 3)', 'safe', (140, 255, 160))])
    c.block(2, 35, 44, 29, pave, 'res', (54, 46, 98), NE, res_names, [('Stackhaven Plaza Flats', 'res', (255, 210, 90)), ('Night Market Hall', 'shop', (255, 70, 200))])
    c.block(2, 68, 44, 31, pave, 'seam', (66, 44, 70), NE, seam_names, [('Glitch Market', 'market', (255, 150, 60)), ('Tunnel Hatch Depot', 'hatch', (255, 150, 60)), ('Safehouse (Seam)', 'safe', (140, 255, 160))])
    c.block(51, 2, 42, 29, pave, 'corp', (46, 52, 104), NE, corp_names, [('ORRIN-VOSS TOWER', 'hq', (255, 230, 90)), ('Meridian Bank', 'bank', (90, 230, 255)), ('Axion Labs', 'lab', (170, 130, 255))])
    c.block(99, 2, 43, 29, pave, 'corp', (50, 48, 112), NE, corp_names, [('Kade Logistics HQ', 'corp', (90, 230, 255)), ('Vireo Media Tower', 'media', (255, 70, 200)), ('Sable Energy', 'energy', (255, 210, 90))])
    c.block(147, 2, 23, 29, (80, 46, 78), 'lab', (80, 46, 84), [(255, 90, 90), (255, 70, 200)], lab_names, [('HALCYON WORKS (vault)', 'vault', (255, 90, 90)), ('Experiment Wing', 'lab', (255, 70, 200))])
    c.block(51, 35, 42, 29, pave, 'ent', (74, 42, 110), NE, ent_names, [('NEON LOTUS CLUB', 'club', (255, 70, 200)), ('Static Lounge', 'club', (90, 230, 255)), ("Rook's Arms", 'armoury', (255, 150, 60)), ('Glass Mile Hotel', 'hotel', (255, 210, 90))])
    c.block(99, 35, 43, 29, pave, 'ent', (70, 40, 108), NE, ent_names, [('Holo Casino', 'casino', (255, 210, 90)), ('Synth Records', 'shop', (170, 130, 255)), ('Dream Parlour', 'club', (255, 70, 200))])
    c.block(51, 68, 42, 31, pave, 'tran', (36, 76, 100), NE, tr_names, [('MERIDIAN LOOP STATION', 'metro', (90, 230, 255)), ('Bus Bays', 'bus', (140, 255, 160))])
    c.block(99, 68, 43, 31, pave, 'ind', (44, 62, 78), NE, ind_names, [('Kiln Works', 'factory', (255, 150, 60)), ('Relay Mast Plant', 'relay', (255, 255, 255)), ('Data Farm', 'server', (90, 230, 255))])
    c.block(147, 35, 23, 29, pave, 'ind', (44, 62, 78), NE, ind_names, [('Cell Foundry', 'factory', (255, 150, 60)), ('Depot 7', 'depot', (255, 210, 90))])
    c.block(147, 68, 23, 31, pave, 'ind', (44, 62, 78), NE, ind_names, [('Coolant Plant', 'factory', (255, 150, 60)), ('Cargo Gate', 'depot', (255, 210, 90))])
    # elevated walkways across the streets, stairs, palms, lamps, hover-cars, hologram
    for (x, y, w, h) in [(46, 14, 5, 3), (93, 14, 6, 3), (142, 16, 5, 3), (70, 31, 3, 4), (120, 31, 3, 4), (46, 48, 5, 3), (93, 48, 6, 3), (70, 64, 3, 4)]: c.bridge(x, y, w, h)
    for x in range(53, 92, 9): c.palm(x, 33)
    for x in range(101, 140, 9): c.palm(x, 33)
    for x in range(4, 150, 12): c.lamp(x, 32, (255, 200, 120)); c.lamp(x, 66, (150, 200, 255))
    for (x, y, col, v) in [(120, 380, (0, 150, 190), 0), (480, 385, (230, 120, 40), 0), (900, 390, (0, 150, 190), 0), (1500, 395, (230, 120, 40), 0), (1180, 770, (0, 150, 190), 0), (600, 800, (230, 120, 40), 0), (565, 420, (0, 150, 190), 1), (1140, 860, (230, 120, 40), 1), (1360, 440, (0, 150, 190), 1)]: c.car(x, y, col, True, bool(v))
    c.d.ellipse([46 * T - 30, 49 * T - 40, 46 * T + 10, 49 * T + 30], fill=(80, 200, 190)); c.d.text((46 * T - 10, 49 * T - 6), 'holo', font=font(9, True), fill=(10, 40, 40), anchor='mm')
    # underground service hatches
    for (x, y) in [(24, 70), (73, 85), (118, 85), (160, 70)]: c.px(x * T, y * T, x * T + 18, y * T + 14, (255, 150, 60)); c.d.text((x * T + 9, y * T + 7), 'T', font=font(9, True), fill=(40, 20, 0), anchor='mm')
    keys = ['ORRIN-VOSS TOWER', 'HALCYON WORKS (vault)', 'NEON LOTUS CLUB', 'Agency Dead-drop Noodles', 'Stackhaven Clinic', 'Glitch Market', 'MERIDIAN LOOP STATION', 'Relay Mast Plant', 'Kade Logistics HQ']
    c.numbered([c.named[k] for k in keys])
    items = [(1, 'Orrin-Voss Tower', 'corporate HQ; tower floors, vault, security checkpoints'), (2, 'Halcyon Works', 'restricted lab: vault, experiment wing, guard posts'), (3, 'Neon Lotus Club', 'entertainment; informants, bouncers with implants'), (4, 'Agency dead-drop (noodle bar)', 'where the agency leaves and takes messages'), (5, 'Stackhaven Clinic', 'implant repair, medical data'), (6, 'Glitch Market', 'black-market implants, hacking tools'), (7, 'Meridian Loop Station', 'metro and bus; fast travel between districts'), (8, 'Kiln Works / Relay mast', 'industrial; the surveillance network node'), (9, 'Kade Logistics HQ', 'corporate; shipping records, data courier')]
    img = legend_panel(c.im, items, 'NEUMINA, Windfen League', ['Top-down building plan (mock): 12 blocks, 7 districts.', 'Stackhaven (residential), Spire Rows (corporate),', 'Halcyon Works (lab), Glass Mile (entertainment),', 'the Seam (criminal), Meridian Loop (transit),', 'Kiln Basin (industrial).'], [((90, 230, 255), 'elevated walkway (separate map layer, stairs/lifts)'), ((255, 150, 60), 'service-tunnel hatch (underground layer)'), ((255, 70, 200), 'pink palms and neon: entertainment frontage'), ((0, 150, 190), 'hover-cars (ambient traffic)'), ((255, 235, 80), 'numbered landmark (see list)')])
    img.save(os.path.join(OUT, 'proposal-postwar-neumina-buildings.png'))

# ======================================================================= SAINT HALLORAN (Westreach)
def noir():
    W, H = 152, 104
    c = City(W, H, (24, 28, 36), 23, 'noir')
    c.rect(0, 80, W, 24, (22, 40, 62))
    for y in range(81, 104, 3): c.px(0, y * T, W * T, y * T, (30, 54, 82))
    c.road_dashes([50, 102], [30, 59, 78], W, H, (150, 130, 60))
    pave = (70, 70, 80)
    NB = [(255, 190, 80), (255, 90, 90), (120, 230, 150), (255, 140, 60), (170, 200, 255)]
    van = (110, 44, 48); lan = (112, 86, 40); kes = (48, 84, 108); neu = (84, 84, 92); res = (92, 76, 66)
    c.block(2, 2, 46, 26, pave, 'lan', lan, [(255, 200, 70), (255, 140, 60)], ['Lantern Tea House', 'Joss Pawnbroker', 'Fan Tan Parlour', 'Temple Shop', 'Old Town Bakery', 'Fortune Radio', 'Jade Tailor', 'Herb & Cure', 'Dragon Noodles', 'Society Office'], [('LANTERN HALL (Black Lantern HQ)', 'club', (255, 200, 70)), ('Red Lantern Bar', 'bar', (255, 90, 90)), ('Protection Office', 'office', (255, 200, 70))])
    c.block(52, 2, 48, 26, pave, 'van', van, [(255, 90, 100), (255, 190, 80)], ['Velvet Room', 'Gold Leaf Hotel', 'Ace Pawn', 'Ivory Bank', 'Oyster Bar', 'Dice & Dame', 'Midnight Jazz', 'Cigar Lounge', 'Dress Shop', 'Racing Wire'], [('GILDED ACE CASINO (Vantelli HQ)', 'casino', (255, 210, 80)), ('Club Verona', 'club', (255, 120, 140)), ('Vantelli Bank & Loans', 'bank', (255, 190, 80)), ('Hotel Regal', 'hotel', (255, 190, 80))])
    c.block(104, 2, 46, 26, (82, 86, 100), 'neu', neu, [(190, 210, 255), (255, 255, 200)], ['City Hall', 'Courthouse', 'Records Office', 'Press Club', 'Lawyers Row', 'Post Office', 'Bar Association', 'Night School'], [('CITY HALL', 'hall', (230, 235, 255)), ('Station 6 Police', 'police', (120, 170, 255)), ('Evidence Room (Station 6)', 'evidence', (120, 170, 255)), ('Halloran Courthouse', 'court', (230, 235, 255))])
    c.block(2, 32, 46, 24, pave, 'neu', res, [(255, 190, 80), (170, 200, 255)], ['Boarding House', 'Corner Grocery', 'Laundry', 'Cheap Rooms', 'Rag Shop', 'Soup Kitchen', 'Tenement 4', 'Tenement 9', 'Tenement 11', 'Chapel'], [('Hush Lane Tenements', 'res', (255, 190, 80)), ("Mama Reyes' Grocery (informant)", 'shop', (120, 230, 150)), ('St. Anselm Chapel', 'church', (230, 235, 255))])
    c.block(52, 32, 48, 24, pave, 'kes', kes, [(110, 190, 235), (255, 190, 80)], ['Dock Cafe', 'Chandlery', 'Rope Works', 'Pier Row Bar', 'Fish Market', 'Ship Agent', 'Cold Store', 'Customs Annex', 'Union Pub', 'Ice House'], [('KESTREL UNION HALL', 'hall', (110, 190, 235)), ('Warehouse 14 (ledger)', 'ware', (255, 140, 60)), ('Brine & Bait Pub', 'bar', (255, 190, 80))])
    c.block(104, 32, 46, 24, pave, 'neu', res, [(255, 190, 80), (170, 200, 255)], ['Maple Flats', 'Florist', 'Dentist', 'Bookshop', 'Pharmacy', 'Doctor Hale', 'Bakery', 'Tailor', 'Fire Station 2', 'Grocers'], [('Maple Heights Apartments', 'res', (255, 190, 80)), ("St. Mercy Hospital", 'hospital', (230, 235, 255)), ('Halloran Library', 'hall', (230, 235, 255))])
    c.block(2, 61, 46, 17, pave, 'kes', kes, [(110, 190, 235), (255, 140, 60)], ['Net Loft', 'Smokehouse', 'Boat Yard', 'Cannery', 'Shipwright', 'Crate Works'], [('Kestrel Cannery (front)', 'ware', (110, 190, 235)), ('Warehouse 9', 'ware', (255, 140, 60))], rows=12)
    c.block(52, 61, 48, 17, pave, 'kes', kes, [(110, 190, 235), (255, 140, 60)], ['Dock Office', 'Tally Shed', 'Rigging Loft', 'Crane House', 'Bonded Store', 'Fuel Shed'], [('Pier 3 Smuggler Warehouse', 'ware', (255, 90, 90)), ('Harbour Master', 'office', (230, 235, 255))], rows=12)
    c.block(104, 61, 46, 17, (82, 86, 100), 'neu', neu, [(190, 210, 255)], ['Customs House', 'Rail Freight', 'Ticket Office', 'Parcel Depot', 'Signal Box', 'Waiting Rooms'], [('Central Rail Station', 'station', (230, 235, 255)), ('Customs House', 'office', (230, 235, 255))], rows=12)
    # railway
    for x in range(104, 150): c.px(x * T, 78 * T + 1, x * T + 11, 78 * T + 2, (110, 100, 90)); c.px(x * T, 78 * T + 8, x * T + 11, 78 * T + 9, (110, 100, 90))
    # park
    for (x, y) in [(60, 29), (66, 29), (72, 29), (78, 29), (84, 29), (8, 59), (14, 59), (20, 59), (112, 58), (118, 58), (124, 58)]: c.tree(x, y)
    # piers, cargo, boats, cranes
    for x in range(54, 100, 9): c.rect(x, 78, 2, 12, (96, 72, 48), (20, 14, 8))
    for x in range(6, 46, 11): c.rect(x, 78, 2, 7, (96, 72, 48), (20, 14, 8))
    for (x, y, col) in [(70, 80, (170, 60, 50)), (73, 80, (60, 120, 170)), (70, 82, (200, 160, 60)), (22, 80, (60, 120, 170)), (25, 80, (170, 60, 50))]: c.rect(x, y, 3, 2, col, (10, 10, 10))
    for (x, y, w) in [(112, 90, 9), (33, 88, 7), (130, 94, 8)]: c.d.polygon([(x * T, y * T), ((x + w) * T, y * T), ((x + w) * T + 12, y * T + 16), (x * T + 6, y * T + 16)], fill=(70, 60, 54), outline=(10, 10, 10)); c.px(x * T + 20, y * T - 8, x * T + 40, y * T, (110, 100, 94))
    for x in (56, 70, 84): c.px(x * T + 22, 80 * T, x * T + 24, 80 * T + 60, (150, 120, 60)); c.px(x * T + 10, 80 * T, x * T + 40, 80 * T + 3, (150, 120, 60))
    # lamps, cars
    for x in range(4, 148, 11): c.lamp(x, 29, (255, 210, 130)); c.lamp(x, 58, (255, 210, 130))
    for (x, y, col, v) in [(160, 362, (150, 40, 40), 0), (520, 370, (30, 30, 36), 0), (900, 365, (190, 160, 60), 0), (1340, 375, (30, 30, 36), 0), (610, 200, (40, 40, 52), 1), (1215, 700, (150, 40, 40), 1), (300, 722, (30, 30, 36), 0)]: c.car(x, y, col, False, bool(v))
    # wet-street reflections
    ov = Image.new('RGBA', c.im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov); r = random.Random(4)
    for (x, y, col) in [(76, 29, (255, 90, 100)), (24, 29, (255, 200, 70)), (66, 58, (110, 190, 235)), (120, 29, (190, 210, 255)), (40, 30, (255, 140, 60))]:
        for k in range(6): od.rectangle([x * T + r.randint(-40, 40), y * T + k * 4 + 6, x * T + r.randint(10, 80), y * T + k * 4 + 8], fill=col + (48,))
    for _ in range(2200):
        x = r.randint(0, c.im.size[0]); y = r.randint(0, c.im.size[1]); od.line([x, y, x - 5, y + 14], fill=(170, 190, 230, 55), width=1)
    c.im = Image.alpha_composite(c.im.convert('RGBA'), ov).convert('RGB'); c.d = ImageDraw.Draw(c.im)
    keys = ['LANTERN HALL (Black Lantern HQ)', 'GILDED ACE CASINO (Vantelli HQ)', 'CITY HALL', 'Evidence Room (Station 6)', 'KESTREL UNION HALL', "Mama Reyes' Grocery (informant)", 'Pier 3 Smuggler Warehouse', 'Warehouse 9', 'Central Rail Station']
    c.numbered([c.named[k] for k in keys])
    items = [(1, 'Lantern Hall', 'Black Lantern Society HQ; protection and politics'), (2, 'Gilded Ace Casino', 'Vantelli Family HQ; gambling and finance; private table'), (3, 'City Hall', 'neutral; mayor, records, bribes'), (4, 'Station 6 Evidence Room', 'police; evidence mission; cops on the take'), (5, 'Kestrel Union Hall + Warehouse 14', 'dock union HQ; the ledger'), (6, "Mama Reyes' Grocery", 'informant in Hush Lane'), (7, 'Pier 3 Smuggler Warehouse', 'Kestrel smuggling; contraband'), (8, 'Warehouse 9', 'Kestrel front; a staging spot for framing jobs'), (9, 'Central Rail Station + Customs', 'arrivals; Westreach customs; agency entry by boat at the pier')]
    img = legend_panel(c.im, items, 'SAINT HALLORAN, Westreach', ['Top-down building plan (mock): 9 blocks, 4 zones.', 'Black Lantern (Old Town), Vantelli (Velvet Strip),', 'Kestrel Dock Union (Pier Row, docks), and neutral', '(city hall, courts, tenements, Maple Heights).'], [((255, 200, 70), 'Black Lantern accents (gold/red lanterns)'), ((255, 90, 100), 'Vantelli accents (velvet red)'), ((110, 190, 235), 'Kestrel accents (dock blue)'), ((120, 170, 255), 'police / civic (cold white-blue)'), ((255, 235, 80), 'numbered landmark (see list)')])
    img.save(os.path.join(OUT, 'proposal-postwar-noir-buildings.png'))
neumina(); noir(); print('ok')
