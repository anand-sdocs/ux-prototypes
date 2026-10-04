#!/usr/bin/env python3
"""Build template.pdf — the uploaded PDF a PDF Upload template is made from.

Reads the page layout JSON from dump-layout.mjs on stdin and draws only the
printed content: headings, labels, rules, paragraphs. Field values are left
blank, exactly as in a real template; PDF Live Edit lays them over the page.

Positions in the layout are PDF points measured from the TOP of a US Letter
page (612 x 792), with y at the top of the text line, as CSS draws it. The
baseline maths below reproduces CSS line boxes for Arial so that HTML text
laid on top at the same coordinates sits on the same baselines.

    node tools/dump-layout.mjs | python3 tools/make_template_pdf.py template.pdf
"""
import json
import sys

from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FONTS = '/System/Library/Fonts/Supplemental/'
pdfmetrics.registerFont(TTFont('Arial', FONTS + 'Arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', FONTS + 'Arial Bold.ttf'))

INK = {'default': HexColor('#1d232b'), 'muted': HexColor('#5b6470'), 'accent': HexColor('#1f3a5f')}
RULE = HexColor('#c9ced6')
BAND = HexColor('#eef1f5')

# Arial's ascent and descent (hhea), as fractions of the font size. CSS centres
# that content area in the line box; the half-leading is what's left over.
ASCENT, DESCENT = 0.905, 0.212


def baseline(top, size, line_height):
    half_leading = (line_height - (ASCENT + DESCENT)) * size / 2
    return top + half_leading + ASCENT * size


def draw(c, x, y, text, font, size, spacing=0.0):
    """One run of text. Character spacing is set every time: PDF keeps it in the
    text state, so a heading's tracking would otherwise leak into what follows."""
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setCharSpace(spacing)
    t.textOut(text)
    c.drawText(t)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'template.pdf'
    layout = json.load(sys.stdin)
    W, H = layout['width'], layout['height']
    c = canvas.Canvas(out, pagesize=(W, H))
    c.setTitle('Enterprise Order Form — template')
    c.setAuthor('Lumen Systems (fictional) — S-Docs UX prototype')
    c.setSubject('PDF Upload template: printed content only, no field values')

    for page in layout['pages']:
        for b in page['bg']:
            if b['t'] == 'r':
                c.setFillColor(RULE)
                c.rect(b['x'], H - b['y'] - 0.75, b['w'], 0.75, stroke=0, fill=1)
            elif b['t'] == 'band':
                c.setFillColor(BAND)
                c.rect(b['x'], H - b['y'] - b['h'], b['w'], b['h'], stroke=0, fill=1)
            elif b['t'] == 't':
                font = 'Arial-Bold' if b.get('b') else 'Arial'
                size = b['s']
                c.setFillColor(INK[b.get('tone', 'default')])
                spacing = 0.04 * size if b.get('tone') == 'accent' else 0
                if b.get('w'):                       # a wrapping paragraph, line-height 1.45
                    lines = simpleSplit(b['text'], font, size, b['w'])
                    for i, line in enumerate(lines):
                        y = baseline(b['y'], size, 1.45) + i * 1.45 * size
                        draw(c, b['x'], H - y, line, font, size)
                    continue
                y = H - baseline(b['y'], size, 1.25)
                x = b['x']
                if b.get('align') == 'right':
                    x -= pdfmetrics.stringWidth(b['text'], font, size) + spacing * len(b['text'])
                draw(c, x, y, b['text'], font, size, spacing)
        c.showPage()
    c.save()
    print(f'wrote {out}: {len(layout["pages"])} pages, {W}x{H} pt', file=sys.stderr)


if __name__ == '__main__':
    main()
