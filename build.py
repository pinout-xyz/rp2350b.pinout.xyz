import json
import hashlib
from datetime import datetime

data = json.loads(open("pinout.json").read())
types = data["types"]


class Pin:
    def __init__(self, pin, name, type, desc=None, alt=[]):
        self.pin = int(pin)
        self.name = name
        self.type = type or "generic"
        self.desc = desc or types.get(type, "")
        self.alt = alt

    def __repr__(self):
        return f"{self.name}: {self.desc}"
    
    def table_row(self):
        tbl = f"<tr class=\"{self.type}\"><th>{self.pin}</th><th title=\"{self.desc}\">{self.name}</th>"
        if len(self.alt):
            for alt in self.alt:
                tbl += f"<td>{alt}</td>"
        else:
            tbl += f"<td></td>" * 12
        return tbl + "\n"

    def minimap_row(self):
        return f"<dt>{self.pin}</dt><dd class=\"{self.type}\">{self.name}</dd>"


def pins(start=1, count=20):
    for i in range(start, start + count):
        yield Pin(i, **data["pins"][str(i)])


html = ""

def thead():
    html = """<table id="pinout">
    <thead><tr><th>Pin</th><th>Name</th>"""
    for i in range(12):
        html += f"<th>alt{i}</th>"
    html += """</tr></thead>
    <tbody>"""
    return html

def tfoot():
    return """    </tbody>
</table>"""

def tbody():
    return """    </tbody>
    <tbody>"""


html += thead()
minimap = "<dl>"

for offset in (1, 21, 41, 61):
    for pin in pins(offset):
        html += pin.table_row()
        minimap += pin.minimap_row()

    if offset < 61:
        html += tbody()
        minimap += "</dl><dl>"

html += tfoot()
minimap += "</dl>"

template = open("template.html", "r").read()
template = template.replace("<table>", html)
template = template.replace("<minimap>", minimap)
template = template.replace("{cache_buster.css}", hashlib.sha256(open("pinout.css", "rb").read()).hexdigest()[:7])
template = template.replace("{cache_buster.js}", hashlib.sha256(open("pinout.js", "rb").read()).hexdigest()[:7])

open("index.html", "w").write(template)


