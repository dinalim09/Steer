#!/usr/bin/env python3
"""Logic L0의 Megascope 글자 데이터(MEGA) 생성기.

폰트 파일은 저장소에 올리지 않는다. 로컬에 설치된 MegascopeV2Plus-Medium.otf에서
필요한 글자의 외곽선(1000 upm, SVG path)·advance·커닝 쌍만 뽑아 JSON으로 출력한다.
출력된 JSON을 index.html의 `const MEGA = ...;` 자리에 붙여 넣는다.

사용: pip install fonttools uharfbuzz
      python3 tools/megascope-glyphs.py ~/Library/Fonts/MegascopeV2Plus-Medium.otf "추가할 문구" > mega.json
"""
import sys, json, itertools
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

path = sys.argv[1]
extra = sys.argv[2] if len(sys.argv) > 2 else ''
base = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?!.,'’ " + "Logic What should I do?"
f = TTFont(path); cmap = f.getBestCmap(); gs = f.getGlyphSet(); hm = f['hmtx']
chars = sorted(c for c in set(base + extra) if ord(c) in cmap)
num = lambda v: str(round(v)) if abs(v - round(v)) < 1e-6 else ('%.1f' % v).rstrip('0').rstrip('.')
G = {}
for c in chars:
    g = cmap[ord(c)]; p = SVGPathPen(gs, ntos=num); gs[g].draw(p)
    G[c] = {'d': p.getCommands(), 'a': hm[g][0]}
font = hb.Font(hb.Face(hb.Blob.from_file_path(path)))
def first_adv(s):
    b = hb.Buffer(); b.add_str(s); b.guess_segment_properties(); hb.shape(font, b, {'kern': True})
    return b.glyph_positions[0].x_advance
K = {}
for a, b in itertools.product(chars, chars):
    v = first_adv(a + b) - G[a]['a']
    if v: K[a + b] = v
json.dump({'G': G, 'K': K}, sys.stdout, ensure_ascii=False, separators=(',', ':'))
