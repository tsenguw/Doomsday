"""把 template.html、engine.js、art.js 合併成根目錄的 index.html：python3 src/build.py"""
import pathlib
d = pathlib.Path(__file__).parent
t = (d / 'template.html').read_text(encoding='utf8')
e = (d / 'engine.js').read_text(encoding='utf8').replace("if (typeof module !== 'undefined') module.exports = G;", '')
a = (d / 'art.js').read_text(encoding='utf8')
(d.parent / 'index.html').write_text(t.replace('/*ENGINE*/', e).replace('/*ART*/', a), encoding='utf8')
