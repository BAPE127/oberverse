import sys, os, math, pickle, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from citykit import *
OUT = '/tmp/oldpipe/out'
VW, VH, Z = 428, 240, 3          # source window and zoom: the game camera shows 640x360 world px at 2x
NEU = Image.open('/tmp/neu_raw.png').convert('RGB'); NOIR = None
ND = pickle.load(open('/tmp/neu_data.pkl', 'rb'))
def view(src, cx, cy):
    x0 = int(min(max(cx - VW // 2, 0), src.size[0] - VW)); y0 = int(min(max(cy - VH // 2, 0), src.size[1] - VH))
    return src.crop((x0, y0, x0 + VW, y0 + VH)).resize((VW * Z, VH * Z), Image.NEAREST), x0, y0
def P(x0, y0, x, y): return ((x - x0) * Z, (y - y0) * Z)
def sprite(im, x, y, body, head=(220, 180, 150), hair=(30, 24, 30), legs=(24, 24, 36), s=3, ring=None, visor=None, umb=None, coat=None):
    d = ImageDraw.Draw(im); x, y = int(x), int(y)
    d.ellipse([x - 4 * s, y + 6 * s, x + 4 * s, y + 9 * s], fill=(6, 6, 12))
    if ring: d.ellipse([x - 5 * s, y + 5 * s, x + 5 * s, y + 10 * s], outline=ring, width=3)
    d.rectangle([x - 2 * s, y + 2 * s, x - 1 * s, y + 7 * s], fill=legs); d.rectangle([x + 0, y + 2 * s, x + 1 * s, y + 7 * s], fill=legs)
    d.rectangle([x - 3 * s, y - 3 * s, x + 2 * s, y + 3 * s], fill=body); d.rectangle([x - 4 * s, y - 2 * s, x - 3 * s, y + 2 * s], fill=mix(body, -.25)); d.rectangle([x + 2 * s, y - 2 * s, x + 3 * s, y + 2 * s], fill=mix(body, -.25))
    if coat: d.rectangle([x - 3 * s, y + 1 * s, x + 2 * s, y + 4 * s], fill=coat)
    d.rectangle([x - 2 * s, y - 7 * s, x + 1 * s, y - 3 * s], fill=head); d.rectangle([x - 2 * s, y - 8 * s, x + 1 * s, y - 6 * s], fill=hair)
    if visor: d.rectangle([x - 2 * s, y - 6 * s, x + 1 * s, y - 5 * s], fill=visor)
    if umb: d.ellipse([x - 9 * s, y - 14 * s, x + 8 * s, y - 6 * s], fill=umb, outline=(0, 0, 0), width=2); d.line([x, y - 6 * s, x, y - 2 * s], fill=(200, 200, 200), width=2)
def tag(im, x, y, text, col=(120, 230, 255), sub=None):
    d = ImageDraw.Draw(im); f = font(14, True); w = max(int(f.getlength(text)), int(font(11).getlength(sub or ''))) + 18; h = 22 + (14 if sub else 0)
    d.rounded_rectangle([x - w // 2, y - h, x + w // 2, y], 5, fill=(8, 8, 20), outline=col)
    d.text((x, y - h + 11), text, font=f, fill=mix(col, .5), anchor='mm')
    if sub: d.text((x, y - 12), sub, font=font(11), fill=(190, 190, 210), anchor='mm')
def panel(im, x, y, w, h, title=None, col=(120, 230, 255)):
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov); od.rounded_rectangle([x, y, x + w, y + h], 8, fill=(6, 6, 18, 215), outline=col + (255,), width=2); im.paste(Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB'))
    d = ImageDraw.Draw(im)
    if title: d.text((x + 12, y + 14), title, font=font(14, True), fill=mix(col, .5), anchor='lm')
def bar(im, x, y, w, v, col, label):
    d = ImageDraw.Draw(im); d.rectangle([x, y, x + w, y + 12], fill=(12, 12, 20), outline=(90, 90, 110)); d.rectangle([x + 1, y + 1, x + 1 + int((w - 2) * v), y + 11], fill=col); d.text((x + w + 8, y + 6), label, font=font(11, True), fill=(220, 220, 235), anchor='lm')
def hud(im, world, wx, wy, loc, time, money, mini_src, mini_scale, bars=True, extra=None, level=None, prompt=None):
    d = ImageDraw.Draw(im); W, H = im.size
    panel(im, 16, 16, 380, 74, None, (120, 130, 200)); d = ImageDraw.Draw(im)
    d.text((30, 34), loc, font=font(17, True), fill=(235, 235, 250), anchor='lm'); d.text((30, 60), time, font=font(14), fill=(170, 175, 205), anchor='lm'); d.text((380, 60), money, font=font(15, True), fill=(255, 220, 110), anchor='rm')
    if level: panel(im, 410, 16, 230, 40, None, (120, 230, 255)); d = ImageDraw.Draw(im); d.text((525, 36), level, font=font(14, True), fill=(180, 245, 255), anchor='mm')
    # minimap
    mw = 260; mh = int(mw * mini_src.size[1] / mini_src.size[0]); mm = mini_src.resize((mw, mh), Image.NEAREST)
    im.paste(mm, (W - mw - 20, 20)); d = ImageDraw.Draw(im); d.rectangle([W - mw - 20, 20, W - 20, 20 + mh], outline=(200, 200, 230), width=2)
    vx = W - mw - 20 + wx * mw / mini_src.size[0]; vy = 20 + wy * mh / mini_src.size[1]; d.rectangle([vx, vy, vx + VW * mw / mini_src.size[0], vy + VH * mw / mini_src.size[0]], outline=(255, 235, 80), width=2); d.ellipse([vx + VW * mw / mini_src.size[0] / 2 - 3, vy + VH * mw / mini_src.size[0] / 2 - 3, vx + VW * mw / mini_src.size[0] / 2 + 3, vy + VH * mw / mini_src.size[0] / 2 + 3], fill=(255, 80, 80))
    if bars:
        panel(im, 16, H - 96, 330, 80, None, (120, 130, 200)); d = ImageDraw.Draw(im); bar(im, 30, H - 82, 200, .82, (220, 70, 80), 'HEALTH'); bar(im, 30, H - 62, 200, .64, (90, 200, 120), 'ENERGY'); bar(im, 30, H - 42, 200, .30, (255, 190, 70), 'FOCUS' if extra is None else extra)
    d = ImageDraw.Draw(im)
    for i, t in enumerate(['Tab  OberPad', 'J  Journal', 'M  Atlas']): d.text((W - 30, H - 70 + i * 20), t, font=font(13), fill=(190, 190, 215), anchor='rm')
    if prompt: f = font(18, True); w = int(f.getlength(prompt)) + 40; panel(im, W // 2 - w // 2, H - 150, w, 44, None, (255, 235, 120)); ImageDraw.Draw(im).text((W // 2, H - 128), prompt, font=f, fill=(255, 245, 190), anchor='mm')
def caption(im, text):
    d = ImageDraw.Draw(im); d.rectangle([0, im.size[1] - 26, im.size[0], im.size[1]], fill=(0, 0, 0)); d.text((12, im.size[1] - 13), text, font=font(12), fill=(150, 155, 185), anchor='lm')
def finish(im, name, text):
    out = Image.new('RGB', (im.size[0], im.size[1] + 26), (0, 0, 0)); out.paste(im, (0, 0)); caption(out, text + '  |  MOCK: composed from the city map mock-up, not the game.'); out.save(os.path.join(OUT, name)); print(name)
rnd = random.Random(2)
def crowd(im, x0, y0, region, n, cols, umb=None, s=3):
    for _ in range(n):
        x = rnd.uniform(region[0], region[2]); y = rnd.uniform(region[1], region[3]); px, py = P(x0, y0, x, y); sprite(im, px, py, rnd.choice(cols), s=s, umb=rnd.choice(umb) if umb else None, hair=rnd.choice([(30, 24, 30), (200, 60, 160), (60, 200, 230), (230, 220, 200)]))
