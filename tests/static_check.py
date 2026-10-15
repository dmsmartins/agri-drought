from html.parser import HTMLParser
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
class Check(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.views=[];self.remote=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if 'id' in d:self.ids.append(d['id'])
  if 'view' in d.get('class','').split():self.views.append(d)
  if tag=='script' and 'src' in d:self.remote.append(d['src'])
s=(ROOT/'index.html').read_text();p=Check();p.feed(s)
assert len(p.ids)==len(set(p.ids)), 'Duplicate IDs'
js=(ROOT/'src/app.js').read_text()+(ROOT/'src/lab.js').read_text()
needed=set(re.findall(r"(?<!\$)\$\('([^']+)'\)",js))
assert not needed-set(p.ids), needed-set(p.ids)
assert len(p.views)==7
assert all('hidden' in x for x in p.views if x['id']!='view-overview')
assert not p.remote
assert '/*__' not in s
print(json.dumps({'html_ids':len(p.ids),'control_references':len(needed),'views':7,'external_scripts':0,'passed':True}))
