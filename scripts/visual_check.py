"""Offline browser rendering: no network or account bypass. HTTP/CSP checks remain separate."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import base64,json
root=Path(__file__).resolve().parents[1];dist=root/'dist/web';out=root/'test-results/visual';out.mkdir(parents=True,exist_ok=True)
paths={'home':'index.html','issues':'issues/index.html','kirk-evers':'issues/kirk-evers/index.html','garden':'issues/garden/index.html','cornerstone':'issues/cornerstone/index.html','volunteer':'volunteer/index.html','donate':'donate/index.html','notices':'notices/index.html'}
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1,reduced_motion='reduce')
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000 if width>700 else 844})
  for name,path in paths.items():
   s=BeautifulSoup((dist/path).read_text(),'html.parser')
   for tag in s.select('meta[http-equiv],script'):tag.decompose()
   for tag in s.select('link[rel=stylesheet]'):
    style=s.new_tag('style');style.string=(dist/tag['href'].lstrip('/')).read_text();tag.replace_with(style)
   for tag in s.select('img[src]'):
    asset=dist/tag['src'].lstrip('/');kind='image/svg+xml' if asset.suffix=='.svg' else 'image/webp';tag['src']='data:'+kind+';base64,'+base64.b64encode(asset.read_bytes()).decode()
   page.set_content(str(s));page.evaluate((dist/'assets/public.js').read_text())
   if name=='home':page.evaluate((dist/'assets/motion.js').read_text())
   page.wait_for_timeout(40)
   overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth')
   results.append({'page':name,'width':width,'overflow':overflow,'h1':page.locator('h1').count(),'videoPanels':page.locator('.issue-video').count()})
   if width in [390,1440]:page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
 browser.close()
(root/'test-results/visual-results.json').write_text(json.dumps({'mode':'offline in-memory render; no HTTP/CSP claim','checks':results},indent=2))
print(json.dumps(results,indent=2))
assert all(not r['overflow'] and r['h1']==1 for r in results)
