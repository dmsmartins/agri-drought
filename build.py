"""Build one self-contained GitHub Pages HTML. Python standard library only."""
from pathlib import Path
import csv,json
ROOT=Path(__file__).resolve().parent
source=ROOT.parent/'agri-seca-kcb-mensal'
# The generated data JSON is tracked, so future builds don't require the Python package.
payload=ROOT/'src/demo-data.json'
if not payload.exists():
 with (source/'data/synthetic_weather.csv').open() as f:
  weather=[[r['date'],float(r['P_mm']),float(r['ET0_mm']),float(r['u2_m_s']),float(r['RHmin_pct'])] for r in csv.DictReader(f)]
 with (source/'config/kcb_monthly_example.csv').open() as f:kcb=[float(r['kcb']) for r in csv.DictReader(f)]
 payload.write_text(json.dumps({'weather':weather,'kcb':kcb,'config':json.loads((source/'config/example.json').read_text()),'parity':json.loads((ROOT/'tests/parity-results.json').read_text())},separators=(',',':'),ensure_ascii=False))
data=json.loads(payload.read_text());data['parity']=json.loads((ROOT/'tests/parity-results.json').read_text())
data['parity'].pop('seconds', None)  # Runtime timings must not change the shipped HTML.
html=(ROOT/'src/template.html').read_text().replace('<!--__LAB_HTML__-->', (ROOT/'src/lab.html').read_text())
parts={'CSS':(ROOT/'src/styles.css').read_text(),'DATA':json.dumps(data,separators=(',',':'),ensure_ascii=False).replace('<','\\u003c'),'ENGINE':(ROOT/'src/engine.cjs').read_text(),'INDICES':(ROOT/'src/indices.cjs').read_text(),'APP':(ROOT/'src/app.js').read_text().replace('/*__LAB__*/',(ROOT/'src/lab.js').read_text())}
for key,text in parts.items():
 if key in ('ENGINE','APP','INDICES') and '</script' in text.lower():raise RuntimeError('Unexpected script terminator')
 html=html.replace('/*__'+key+'__*/',text)
assert '/*__' not in html
(ROOT/'index.html').write_text(html)
(ROOT/'.nojekyll').touch()
print(f'Built {ROOT / "index.html"}: {len(html.encode()):,} bytes')
