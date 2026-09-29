"""Deterministic synthetic OCR fixtures. No real product, customer, or agency data."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import textwrap, json
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/samples'
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
BOLD = FONT.with_name('DejaVuSans-Bold.ttf')
WARNING = '(1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.'
def label(name, brand='OLD TOM DISTILLERY', kind='Kentucky Straight Bourbon Whiskey', alcohol='45% Alc./Vol. (90 Proof)', business='Bottled by Old Tom Distillery, Frankfort, KY', origin='', warning=WARNING, heading='GOVERNMENT WARNING:', front=False, back=False, extra=''):
    im = Image.new('RGB', (1500, 1200), '#fffefa')
    d = ImageDraw.Draw(im)
    d.rectangle((25,25,1475,1175), outline='#263e52', width=4)
    def txt(x,y,t,size=32,bold=False,fill='#172c3d'):
        d.text((x,y),t,font=ImageFont.truetype(str(BOLD if bold else FONT),size),fill=fill)
    if not back:
        txt(85,90,brand,58,True)
        txt(85,200,kind,38)
        txt(85,305,alcohol,36)
        txt(85,385,'750 mL',36)
        if extra: txt(85,460,extra,32)
    if not front:
        y = 85 if back else 530
        txt(85,y,business,29)
        if origin: txt(85,y+65,'Product of '+origin,29)
        y += 175
        txt(85,y,heading,30,True)
        for i,line in enumerate(textwrap.wrap(warning,83)):
            txt(85,y+58+i*44,line,28)
    txt(85,1110,'SYNTHETIC TEST ARTWORK - NOT FOR SALE',22,fill='#526675')
    im.save(OUT/name)
    return im
base=label('old-tom.png')
label('mismatch.png',alcohol='40% Alc./Vol. (80 Proof)',warning=WARNING.replace('should not drink','should drink'))
label('warning-case.png',heading='Government Warning:')
label('stones-front.png',brand="STONE'S THROW",kind='London Dry Gin',alcohol='40% Alc./Vol.',front=True)
label('stones-back.png',business="Bottled by Stone's Throw Spirits, Baltimore, MD",back=True)
label('import.png',brand='MAISON DU VERGER',kind='Chardonnay',alcohol='13.5% Alc./Vol.',business='Imported by Harbor Imports, New York, NY',origin='France')
label('ambiguous.png',extra='40% Alc./Vol.')
base.resize((180,144)).resize(base.size).filter(ImageFilter.GaussianBlur(9)).save(OUT/'poor.png')
Image.new('RGB',(1500,1200),'white').save(OUT/'blank.png')
base.save(OUT/'old-tom.jpg',quality=92)
base.save(OUT/'old-tom.webp',quality=92)
base.rotate(90,expand=True).save(OUT/'rotated.png')
print('Created 12 deterministic synthetic image fixtures.')
