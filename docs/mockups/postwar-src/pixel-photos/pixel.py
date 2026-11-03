# Pixel-art finishing: limited palette, ordered (Bayer) dithering instead of smooth gradients, dark ink outlines on strong edges, chunky pixels.
import numpy as np
from PIL import Image, ImageDraw
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16.0 - 0.5
INK = np.array([27, 26, 36], dtype=np.float32)
def pix(im, block=1, colors=72, spread=8, edge=34, ink_mix=0.6):
    from PIL import ImageFilter
    im = im.convert('RGB').filter(ImageFilter.MedianFilter(3)); W, H = im.size; W2, H2 = W // block, H // block
    small = im.resize((W2, H2), Image.BOX) if block > 1 else im.copy()
    pal = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    flat = np.asarray(pal.convert('RGB')).astype(np.float32)              # the undithered, palette-limited picture (used to find edges)
    a = np.asarray(small).astype(np.float32); bay = np.tile(BAYER, (H2 // 4 + 1, W2 // 4 + 1))[:H2, :W2, None]
    noisy = Image.fromarray(np.clip(a + bay * spread, 0, 255).astype(np.uint8))
    dith = np.asarray(noisy.quantize(palette=pal, dither=Image.Dither.NONE).convert('RGB')).astype(np.float32)
    lum = flat @ np.array([0.3, 0.59, 0.11], dtype=np.float32); out = dith.copy()
    dx = np.abs(lum[:, 1:] - lum[:, :-1]) > edge; dy = np.abs(lum[1:, :] - lum[:-1, :]) > edge
    inkm = np.zeros((H2, W2), bool)
    xs, ys = np.where(dx.T)[0], np.where(dx.T)[1]
    for (y, x) in zip(*np.where(dx)):  # darker side of each strong horizontal edge
        t = x if lum[y, x] <= lum[y, x + 1] else x + 1; inkm[y, t] = True
    for (y, x) in zip(*np.where(dy)):
        t = y if lum[y, x] <= lum[y + 1, x] else y + 1; inkm[t, x] = True
    out[inkm] = out[inkm] * (1 - ink_mix) + INK * ink_mix
    res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    return res.resize((W2 * block, H2 * block), Image.NEAREST) if block > 1 else res
class DeferDraw:
    """Wraps ImageDraw: shapes draw now, text is queued (to be replayed crisp after pixelation, like the game's HUD font)."""
    def __init__(self, im, q): self._d = ImageDraw.Draw(im); self.q = q
    def text(self, *a, **k): self.q.append((a, k))
    def __getattr__(self, n): return getattr(self._d, n)
def replay(im, q):
    d = ImageDraw.Draw(im)
    for a, k in q: d.text(*a, **k)
