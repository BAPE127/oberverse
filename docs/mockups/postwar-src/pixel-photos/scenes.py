import sys, os
sys.path.insert(0, '/tmp/oldpipe')
exec(open('/tmp/oldpipe/shots.py').read())
ONLY = sys.argv[1:] 
def want(k): return not ONLY or k in ONLY
PINK, CYAN, YEL, GRN, RED = (255, 70, 200), (90, 230, 255), (255, 215, 90), (140, 255, 160), (255, 90, 100)
# ------------------------------------------------------------ N1: Neumina street, Neon Lotus queue
if want('n1'):
    cx, cy = 1331, 1420; im, x0, y0 = view(NEU, cx, cy)
    crowd(im, x0, y0, (1180, 1440, 1480, 1500), 14, [(220, 60, 160), (60, 200, 230), (240, 200, 70), (150, 110, 240), (60, 60, 90)])
    for k in range(7): px, py = P(x0, y0, 1262 - k * 11, 1444 + (k % 2) * 4); sprite(im, px, py, [(220, 60, 160), (60, 200, 230), (240, 200, 70)][k % 3])
    for dx in (0, 34): px, py = P(x0, y0, 1318 + dx, 1428); sprite(im, px, py, (40, 40, 66), visor=(255, 70, 70), coat=(30, 30, 50))
    px, py = P(x0, y0, 1318, 1428); tag(im, px, py - 60, 'Bouncer', (255, 120, 120), 'Optic Mk II  |  neural link: locked')
    ppx, ppy = P(x0, y0, 1288, 1458); sprite(im, ppx, ppy, (240, 200, 70), ring=(255, 255, 255), coat=(60, 40, 120), hair=(255, 70, 200)); tag(im, ppx, ppy - 60, 'You', (255, 255, 255))
    hud(im, 'n', x0, y0, 'NEUMINA  /  Glass Mile', 'Fri 23:40   rain: none   crowd: heavy', 'o 4,820', NEU, 0.08, extra='SIGNAL', level='LEVEL 0   STREET', prompt='[E] Talk to the bouncer     [H] Open neural link')
    finish(im, 'proposal-postwar-pixel-neumina-street.png', 'In-game mock: Neumina, street level at the Neon Lotus Club (queue, bouncers with implants, hover traffic, a flying car in its lane above)')
# ------------------------------------------------------------ N2: sky bridge (level +1)
if want('n2'):
    (a, b) = ND['L1'][6]; cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; im, x0, y0 = view(NEU, cx, cy)
    from PIL import ImageFilter
    mask = Image.new('L', im.size, 0); md = ImageDraw.Draw(mask); md.line([P(x0, y0, *a), P(x0, y0, *b)], fill=255, width=26 * Z)
    low = im.point(lambda v: int(v * .42)); im = Image.composite(im, low, mask)
    d = ImageDraw.Draw(im)
    for k in range(5): t = .2 + k * .15; px, py = P(x0, y0, a[0] + (b[0] - a[0]) * t + 3, a[1] + (b[1] - a[1]) * t); sprite(im, px, py, [(220, 60, 160), (60, 200, 230), (240, 200, 70), (200, 200, 220)][k % 4], umb=None)
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); ppx, ppy = P(x0, y0, m[0] - 3, m[1] + 4); sprite(im, ppx, ppy, (240, 200, 70), ring=(255, 255, 255), coat=(60, 40, 120), hair=(255, 70, 200)); tag(im, ppx, ppy - 60, 'You', (255, 255, 255))
    hud(im, 'n', x0, y0, 'NEUMINA  /  Sky Bridge 7', 'Sat 00:12   wind: gusts', 'o 4,820', NEU, 0.08, extra='SIGNAL', level='LEVEL +1   SKY BRIDGE', prompt='[E] Take the lift down     [Q] Look over the rail')
    finish(im, 'proposal-postwar-pixel-neumina-skybridge.png', 'In-game mock: crossing a sky bridge (the street is dimmed below; lifts and stairs at both ends)')
# ------------------------------------------------------------ N3: hacking a guard
if want('n3'):
    cx, cy = 2307, 250; im, x0, y0 = view(NEU, cx, cy)
    gs = [(2290, 262), (2322, 268), (2262, 240)]
    for (gx, gy) in gs: px, py = P(x0, y0, gx, gy); sprite(im, px, py, (40, 40, 66), visor=(255, 70, 70), coat=(30, 30, 50))
    gx, gy = P(x0, y0, *gs[0]); d = ImageDraw.Draw(im)
    for rr in (34, 50): d.ellipse([gx - rr, gy - 30 - rr, gx + rr, gy - 30 + rr], outline=CYAN, width=2)
    d.line([gx - 62, gy - 30, gx - 28, gy - 30], fill=CYAN, width=2); d.line([gx + 28, gy - 30, gx + 62, gy - 30], fill=CYAN, width=2)
    for (hx, hy) in [(gs[1][0], gs[1][1]), (gs[2][0], gs[2][1])]: px, py = P(x0, y0, hx, hy); d.rectangle([px - 20, py - 62, px + 20, py - 56], outline=(255, 150, 60)); tag(im, px, py - 66, 'Guard', (255, 150, 60))
    ppx, ppy = P(x0, y0, 2338, 292); sprite(im, ppx, ppy, (240, 200, 70), ring=(255, 255, 255), coat=(60, 40, 120), hair=(255, 70, 200))
    panel(im, 780, 196, 470, 330, 'NEURAL LINK   Kade Logistics gate', CYAN); d = ImageDraw.Draw(im)
    d.text((798, 244), 'Target: Security guard  |  Optic Mk II  |  Comms band 4', font=font(13), fill=(190, 230, 240), anchor='lm')
    rows = [('1  Disrupt comms', 'safe 71%', 'guard cannot call help for 40 s', GRN), ('2  Blind optics', 'safe 48%', 'sees only 3 m for 20 s', YEL), ('3  Read ID chip', 'safe 82%', 'name, rank, patrol, gate code', GRN), ('4  Spoof badge', 'needs intel', 'missing: gate cipher (Kade)', RED)]
    for i, (a_, b_, c_, col) in enumerate(rows):
        y = 276 + i * 58; d.rounded_rectangle([796, y, 1236, y + 48], 6, fill=(14, 16, 34), outline=(70, 90, 120)); d.text((810, y + 14), a_, font=font(15, True), fill=(235, 235, 250), anchor='lm'); d.text((1224, y + 14), b_, font=font(13, True), fill=col, anchor='rm'); d.text((810, y + 34), c_, font=font(12), fill=(160, 170, 195), anchor='lm')
    d.text((798, 514), 'Tool: Ghost Deck Mk I (2 charges)   Trace 12%   Alert: none', font=font(12), fill=(255, 200, 120), anchor='lm')
    hud(im, 'n', x0, y0, 'NEUMINA  /  Spire Rows', 'Fri 21:05', 'o 4,820', NEU, 0.08, extra='SIGNAL', level='LEVEL 0   STREET')
    finish(im, 'proposal-postwar-pixel-neumina-hacking.png', 'In-game mock: the neural link menu: every action has a chance, a tool cost, a trace risk and an intel requirement')
# ------------------------------------------------------------ N4: rooftop landing pad
if want('n4'):
    cx, cy = 1214, 150; im, x0, y0 = view(NEU, cx, cy)
    d = ImageDraw.Draw(im)
    for (qx, qy, ang) in [(1180, 112, -.5)]:
        px, py = P(x0, y0, qx, qy); sh_ = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh_).polygon(rotrect(px + 40, py + 70, 140, 70, ang), fill=(0, 0, 14, 120)); im = Image.alpha_composite(im.convert('RGBA'), sh_).convert('RGB'); d = ImageDraw.Draw(im)
        d.polygon(rotrect(px, py, 130, 62, ang), fill=(255, 215, 90), outline=(10, 10, 20), width=3); d.polygon(rotrect(px + 18, py - 8, 50, 38, ang), fill=(210, 245, 255))
        for sg in (-1, 1): ex, ey = px - math.sin(ang) * 40 * sg, py + math.cos(ang) * 40 * sg; d.ellipse([ex - 14, ey - 14, ex + 14, ey + 14], fill=(255, 255, 255), outline=(150, 220, 255), width=3)
    for (gx, gy) in [(1240, 126)]: px, py = P(x0, y0, gx, gy); sprite(im, px, py, (40, 40, 66), visor=(255, 70, 70), coat=(30, 30, 50))
    ppx, ppy = P(x0, y0, 1226, 120); sprite(im, ppx, ppy, (240, 200, 70), ring=(255, 255, 255), coat=(60, 40, 120), hair=(255, 70, 200)); tag(im, ppx, ppy - 60, 'You', (255, 255, 255))
    hud(im, 'n', x0, y0, 'NEUMINA  /  Orrin-Voss Tower, roof', 'Sat 01:30   altitude 118 m', 'o 4,820', NEU, 0.08, extra='SIGNAL', level='LEVEL +2   ROOF / SKY', prompt='[E] Hail air-taxi to Kiln Basin     [F] Hijack a parked car')
    finish(im, 'proposal-postwar-pixel-neumina-rooftop.png', 'In-game mock: a tower rooftop landing pad; flying cars use sky lanes and land on pads (a mission route and a taxi service)')
# ------------------------------------------------------------ R1: noir Velvet Strip, disguise
if want('r1'):
    cx, cy = 1290, 505; im, x0, y0 = view(NOIR, cx, cy)
    for (gx, gy, cl) in [(1330, 482, (120, 30, 40)), (1352, 484, (120, 30, 40))]: px, py = P(x0, y0, gx, gy); sprite(im, px, py, cl, coat=(30, 20, 24), hair=(20, 20, 20), umb=None)
    px, py = P(x0, y0, 1330, 482); tag(im, px, py - 56, 'Vantelli doorman', (255, 120, 140), 'knows you: no  |  suspicion 18%')
    ppx, ppy = P(x0, y0, 1296, 506); sprite(im, ppx, ppy, (120, 30, 40), ring=(255, 255, 255), coat=(30, 20, 24), hair=(40, 30, 20)); tag(im, ppx, ppy - 60, 'You', (255, 255, 255))
    crowd(im, x0, y0, (1180, 495, 1260, 515), 5, [(40, 40, 52), (110, 90, 70), (60, 40, 40)], umb=[(20, 20, 26), (130, 30, 40), (30, 40, 80)])
    hud(im, 'r', x0, y0, 'SAINT HALLORAN  /  Velvet Strip', 'Thu 23:10   rain: heavy', 'o 1,260', NOIR, 0.08, extra='NERVE')
    panel(im, 16, 100, 330, 150, 'DISGUISE', (255, 130, 150)); d = ImageDraw.Draw(im); d.text((30, 140), 'Vantelli soldier (stolen coat)', font=font(14, True), fill=(255, 230, 235), anchor='lm')
    for i, (t, v, c) in enumerate([('Doorman recognises coat', 'yes', GRN), ('Carrying a weapon', 'hidden', YEL), ('Restricted door ahead', 'strict check', RED)]): d.text((30, 170 + i * 24), t, font=font(12), fill=(190, 190, 210), anchor='lm'); d.text((336, 170 + i * 24), v, font=font(12, True), fill=c, anchor='rm')
    d.text((30, 238), 'Suspicion  18%   (glance at 40, challenge at 70)', font=font(11), fill=(170, 170, 195), anchor='lm')
    hud_prompt = '[E] Walk past the doorman     [R] Take a different way in'; f = font(18, True); w = int(f.getlength(hud_prompt)) + 40; panel(im, 1284 // 2 - w // 2, 720 - 150, w, 44, None, (255, 235, 120)); ImageDraw.Draw(im).text((642, 720 - 128), hud_prompt, font=f, fill=(255, 245, 190), anchor='mm')
    finish(im, 'proposal-postwar-pixel-noir-disguise.png', 'In-game mock: Saint Halloran, the Velvet Strip: a stolen Vantelli coat and the recognition / suspicion readout')
# ------------------------------------------------------------ R2: noir docks, stealth
if want('r2'):
    cx, cy = 1760, 1475; im, x0, y0 = view(NOIR, cx, cy); d = ImageDraw.Draw(im)
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov); gp = P(x0, y0, 1700, 1472)
    od.polygon([gp, (gp[0] + 330, gp[1] - 70), (gp[0] + 330, gp[1] + 90)], fill=(255, 240, 160, 70)); im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
    sprite(im, gp[0], gp[1], (50, 70, 90), coat=(30, 40, 56), hair=(30, 30, 30)); tag(im, gp[0], gp[1] - 56, 'Kestrel guard', BLUE if False else (110, 190, 235), 'patrol route 2  |  alert: calm')
    for (gx, gy) in [(1830, 1515), (1655, 1530)]: px, py = P(x0, y0, gx, gy); sprite(im, px, py, (60, 60, 70), coat=(40, 40, 46), umb=(20, 20, 26))
    ppx, ppy = P(x0, y0, 1740, 1505); sprite(im, ppx, ppy, (60, 54, 40), ring=(255, 255, 255), coat=(40, 34, 28), hair=(30, 30, 30)); tag(im, ppx, ppy - 60, 'You (crouched)', (255, 255, 255))
    hud(im, 'r', x0, y0, 'SAINT HALLORAN  /  Pier Row docks', 'Fri 02:20   rain: light', 'o 1,260', NOIR, 0.08, extra='NERVE', prompt='[E] Pick the side door     [F] Throw a bottle (distraction)')
    panel(im, 16, 100, 340, 130, 'CONTRACT: THE LEDGER', (255, 200, 110)); d = ImageDraw.Draw(im)
    for i, (t, c) in enumerate([('Recover the ledger from Pier 3', (235, 235, 245)), ('  optional: leave no trace', (160, 165, 190)), ('  optional: frame the Kestrel foreman', (160, 165, 190)), ('Extract by boat at the landing', (235, 235, 245))]): d.text((30, 140 + i * 24), ('o ' if not t.startswith(' ') else '   - ') + t.strip(), font=font(12), fill=c, anchor='lm')
    finish(im, 'proposal-postwar-pixel-noir-docks.png', 'In-game mock: stealth at the docks: vision cones, patrols, a quiet way in, optional objectives')
# ------------------------------------------------------------ R3: mob war, stage 3
if want('r3'):
    cx, cy = 1500, 960; im, x0, y0 = view(NOIR, cx, cy); d = ImageDraw.Draw(im); rr = random.Random(5)
    red, blue = (120, 30, 40), (50, 80, 120)
    def flash(px, py): d.polygon([(px, py - 16), (px + 6, py - 5), (px + 18, py), (px + 6, py + 5), (px, py + 16), (px - 6, py + 5), (px - 18, py), (px - 6, py - 5)], fill=(255, 235, 150)); d.ellipse([px - 6, py - 6, px + 6, py + 6], fill=(255, 255, 255))
    groupA = [(1440, 930), (1452, 962), (1430, 985), (1465, 940)]; groupB = [(1570, 920), (1585, 955), (1560, 985), (1600, 935)]
    for (gx, gy) in groupA: px, py = P(x0, y0, gx, gy); sprite(im, px, py, red, coat=(30, 20, 24))
    for (gx, gy) in groupB: px, py = P(x0, y0, gx, gy); sprite(im, px, py, blue, coat=(30, 40, 56))
    for (ax, ay, bx, by) in [(groupA[0], groupB[0]), (groupA[2], groupB[1]), (groupB[3], groupA[1])] if False else [(groupA[0][0], groupA[0][1], groupB[0][0], groupB[0][1]), (groupA[2][0], groupA[2][1], groupB[1][0], groupB[1][1]), (groupB[3][0], groupB[3][1], groupA[1][0], groupA[1][1])]:
        p0 = P(x0, y0, ax, ay); p1 = P(x0, y0, bx, by); d.line([p0[0], p0[1] - 20, p1[0], p1[1] - 20], fill=(255, 225, 120), width=2); flash(p0[0] + 12, p0[1] - 22); flash(p1[0] - 12, p1[1] - 22)
    px, py = P(x0, y0, 1455, 1000); d.rectangle([px - 22, py, px + 22, py + 12], fill=red); d.ellipse([px + 14, py - 8, px + 30, py + 8], fill=(220, 190, 160))
    for k in range(8): px, py = P(x0, y0, 1500 + rr.randint(-60, 60), 1010 + rr.randint(0, 70)); sprite(im, px, py, rr.choice([(130, 120, 110), (90, 76, 60), (60, 60, 80)]), umb=rr.choice([(20, 20, 26), (130, 30, 40), None]))
    for (sx, sy, c1) in [(1380, 950, (255, 60, 60)), (1630, 1005, (60, 100, 255))]:
        px, py = P(x0, y0, sx, sy); d.polygon(rotrect(px, py, 70, 34, .3), fill=(20, 20, 26), outline=(200, 200, 210), width=2); d.ellipse([px - 80, py - 80, px + 80, py + 80], outline=c1, width=3)
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for (sx, sy, c1) in [(1380, 950, (255, 40, 40, 70)), (1630, 1005, (40, 80, 255, 70))]: px, py = P(x0, y0, sx, sy); od.ellipse([px - 150, py - 150, px + 150, py + 150], fill=c1)
    im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
    ppx, ppy = P(x0, y0, 1500, 1040); sprite(im, ppx, ppy, (60, 54, 40), ring=(255, 255, 255), coat=(40, 34, 28), hair=(30, 30, 30)); tag(im, ppx, ppy - 60, 'You (behind cover)', (255, 255, 255))
    hud(im, 'r', x0, y0, 'SAINT HALLORAN  /  Founders Square', 'Sat 00:45   rain: heavy', 'o 1,260', NOIR, 0.08, extra='NERVE')
    panel(im, 16, 100, 370, 190, 'MOB TENSION', (255, 130, 150)); d = ImageDraw.Draw(im); d.text((30, 136), 'STAGE 3  STREET CONFLICT', font=font(15, True), fill=(255, 190, 120), anchor='lm')
    for i, (nm, v, c) in enumerate([('Vantelli  vs  Kestrel', .62, (255, 90, 100)), ('Kestrel  vs  Black Lantern', .35, (110, 190, 235)), ('Black Lantern  vs  Vantelli', .22, (255, 200, 70))]): d.text((30, 170 + i * 36), nm, font=font(12), fill=(210, 210, 225), anchor='lm'); bar(im, 30, 182 + i * 36, 250, v, c, f'{int(v * 100)}%'); d = ImageDraw.Draw(im)
    d.text((30, 276), 'Police response: 2 units, arriving in 90 s', font=font(11), fill=(150, 170, 255), anchor='lm')
    finish(im, 'proposal-postwar-pixel-noir-mobwar.png', 'In-game mock: a staged attack has escalated; two mobs fight in the square, civilians flee, police are on the way')
