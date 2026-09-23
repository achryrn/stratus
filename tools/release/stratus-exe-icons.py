"""Swap the blue Floorp icon groups in the staged floorp.exe for the red Stratus S mark."""
"""Run from the repo root after assemble: python tools/release/stratus-exe-icons.py"""
import ctypes, os, struct, pickle, sys
from ctypes import wintypes
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXE = os.path.join(ROOT, '_dist', 'bin', 'floorp', 'floorp.exe')
FONTB = r'C:/Windows/Fonts/arialbd.ttf'
GROUPS = {1:[(1,256),(2,128),(3,96),(4,72),(5,64),(6,48),(7,32),(8,24),(9,16)], 2:[(10,256),(11,128),(12,96),(13,72),(14,64),(15,48),(16,32),(17,24),(18,16)], 3:[(28,16),(29,32)], 4:[(30,16),(31,32)], 5:[(32,256),(33,128),(34,96),(35,72),(36,64),(37,48),(38,32),(39,24),(40,16)], 6:[(41,256),(42,128),(43,96),(44,72),(45,64),(46,48),(47,32),(48,24),(49,16)], 32512:[(19,256),(20,128),(21,96),(22,72),(23,64),(24,48),(25,32),(26,24),(27,16)]}
def mark(size, bg=(14, 7, 8, 255)):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([2, 2, size - 3, size - 3], radius=int(size * 0.035), fill=bg)
    txt = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    td = ImageDraw.Draw(txt)
    f = ImageFont.truetype(FONTB, int(size * 0.56))
    bb = td.textbbox((0, 0), 'S', font=f)
    td.text(((size - (bb[2]-bb[0])) // 2, (size - (bb[3]-bb[1])) // 2 - bb[1]), 'S', font=f, fill=(255, 30, 0, 255))
    glow = txt.filter(ImageFilter.GaussianBlur(max(1, size // 40)))
    return Image.alpha_composite(Image.alpha_composite(im, glow), txt)
def bmp_blob(size):
    im = mark(size).convert('RGBA')
    px = im.load()
    row = ((size * 32 + 31) // 32) * 4
    mrow = ((size + 31) // 32) * 4
    dib = bytearray(40 + row * size + mrow * size)
    struct.pack_into('<IiiHHIIiiII', dib, 0, 40, size, size * 2, 1, 32, 0, row * size, 0, 0, 0, 0)
    for y in range(size):
        sy = size - 1 - y
        for x in range(size):
            r, g, b, a = px[x, sy]
            struct.pack_into('<BBBB', dib, 40 + y * row + x * 4, b, g, r, a)
    return bytes(dib)
def main():
    k32 = ctypes.windll.kernel32
    k32.BeginUpdateResourceW.argtypes = [wintypes.LPCWSTR, wintypes.BOOL]
    k32.BeginUpdateResourceW.restype = wintypes.HANDLE
    k32.UpdateResourceW.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.LPVOID, wintypes.WORD, wintypes.LPVOID, wintypes.DWORD]
    k32.UpdateResourceW.restype = wintypes.BOOL
    k32.EndUpdateResourceW.argtypes = [wintypes.HANDLE, wintypes.BOOL]
    k32.EndUpdateResourceW.restype = wintypes.BOOL
    blobs = {s: bmp_blob(s) for s in [256, 128, 96, 72, 64, 48, 32, 24, 16]}
    MI = lambda v: ctypes.c_void_p(v)
    h = k32.BeginUpdateResourceW(EXE, False)
    if not h:
        raise SystemExit('BeginUpdateResource failed: %d' % ctypes.GetLastError())
    fails = 0
    for gid, items in GROUPS.items():
        for nid, sz in items:
            data = blobs[sz]
            buf = ctypes.create_string_buffer(data)
            if not k32.UpdateResourceW(h, MI(3), MI(nid), 1033, buf, len(data)):
                fails += 1
                print('  icon fail', nid, ctypes.GetLastError())
        grp = struct.pack('<HHH', 0, 1, len(items))
        for nid, sz in items:
            mrow = ((sz + 31) // 32) * 4
            pxbytes = len(blobs[sz]) - 40 - mrow * sz
            grp += struct.pack('<BBBBHHIH', sz if sz < 256 else 0, sz if sz < 256 else 0, 0, 0, 1, 32, 40 + pxbytes, nid)
        gbuf = ctypes.create_string_buffer(grp)
        if not k32.UpdateResourceW(h, MI(14), MI(gid), 1033, gbuf, len(grp)):
            fails += 1
            print('  group fail', gid, ctypes.GetLastError())
    print('update fails', fails)
    if not k32.EndUpdateResourceW(h, False):
        raise SystemExit('EndUpdateResource failed (browser running?): %d' % ctypes.GetLastError())
    print('Stratus exe icons written to', EXE)
    stamp_private_browsing(k32, MI)


def stamp_private_browsing(k32, MI):
    """Swap the 5 blue PNG frames (ids 1-5) of private_browsing.exe.

    PNG-ONLY swap: this binary rejects group (type 14) rewrites with
    error 110 at EndUpdateResource, so the group descriptor is left
    untouched (entry byte counts go stale but the loader reads the
    icon blobs, which is what the taskbar shows). DIB frames 6-9 are
    monochrome document glyphs, not brand art, and are kept."""
    import io
    pb = os.path.join(ROOT, '_dist', 'bin', 'floorp', 'private_browsing.exe')
    if not os.path.exists(pb):
        print('private_browsing.exe not staged, skipping')
        return
    h = k32.BeginUpdateResourceW(pb, False)
    if not h:
        print('private_browsing BeginUpdateResource failed (browser running?): %d' % ctypes.GetLastError())
        return
    fails = 0
    for nid, sz in [(1, 256), (2, 128), (3, 96), (4, 72), (5, 64)]:
        buf2 = io.BytesIO()
        mark(sz).save(buf2, format='PNG', optimize=True)
        data = buf2.getvalue()
        buf = ctypes.create_string_buffer(data)
        if not k32.UpdateResourceW(h, MI(3), MI(nid), 1033, buf, len(data)):
            fails += 1
            print('  pb icon fail', nid, ctypes.GetLastError())
    print('pb update fails', fails)
    if not k32.EndUpdateResourceW(h, False):
        print('private_browsing EndUpdateResource failed (browser running?): %d' % ctypes.GetLastError())
        return
    print('Stratus pb icons written to', pb)
if __name__ == '__main__':
    main()