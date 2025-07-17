import json
import hashlib
from datetime import datetime

data = json.loads(open("pinout.json").read())
types = data["types"]
functions = data.get("functions", {})

PIN_COUNT = len(data["pins"])
PINS_PER_SIDE = int(PIN_COUNT / 4)


class Pin:
    def __init__(self, pin, name, type, desc=None, alt=[], bank=0):
        self.pin = int(pin)
        self.name = name
        self.type = type or "generic"
        self.desc = desc or types.get(type, "")
        self.alt = alt
        self.bank = bank

    def __repr__(self):
        return f"{self.name}: {self.desc}"

    def function_desc(self, alt):
        for k, v in functions.items():
            if alt.startswith(k):
                return v
        return ""

    def table_row(self):
        bank = f" (Bank {self.bank})" if self.bank else ""
        tbl = f"<tr class=\"{self.type} bank{self.bank}\"><th title=\"Pin {self.pin}{bank}\">{self.pin}</th><th title=\"{self.name}: {self.desc}\">{self.name}</th>"
        if len(self.alt):
            for alt in self.alt:
                fn_desc = self.function_desc(alt)
                if fn_desc and alt:
                    tbl += f"<td title=\"{alt}: {fn_desc}\">{alt}</td>"
                else:
                    tbl += f"<td>{alt}</td>"
        else:
            tbl += f"<td colspan=\"12\"></td>"
        return tbl + "\n"

    def minimap_row(self):
        return f"<dt>{self.pin}</dt><dd class=\"{self.type}\">{self.name}</dd>"


def pins(start=1):
    for i in range(start, start + PINS_PER_SIDE):
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

for offset in range(1, PIN_COUNT, PINS_PER_SIDE):
    for pin in pins(offset):
        html += pin.table_row()
        minimap += pin.minimap_row()

    if offset < (PINS_PER_SIDE * 3) + 1:
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


