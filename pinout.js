"use strict";

var table = document.getElementById("pinout");
var input = document.getElementById("find");
var checkbox_hide = document.getElementById("find_hide");
var checkbox_confirm = document.getElementById("mark_confirm");
var cells = document.querySelectorAll("tbody td,tbody th");
var alt_functions = document.querySelectorAll("tbody td");
var headings = document.querySelectorAll("tbody th");
var rows = document.querySelectorAll("tbody tr");
var btn_save = document.getElementById("save");
var input_filename = document.getElementById("name");

var minimap = document.getElementById("minimap");
var minimap_pins = document.querySelectorAll("#minimap dt");

checkbox_hide.onchange = function() {
    find = input.value.toLowerCase();
    table.classList.toggle("hide", find !== "" && this.checked);
}

rows.forEach((row) => {
    row.onmouseover = (ev) => {
        var minipin = parseInt(row.querySelector("th").textContent) - 1;
        minimap_pins.forEach(pin => {
            pin.classList.remove("hover");
            pin.nextSibling.classList.remove("hover")
        });
        minimap_pins[minipin].classList.add("hover");
        minimap_pins[minipin].nextSibling.classList.add("hover");
    };
});

input.onkeyup = function(){
    find = this.value.toLowerCase();

    rows.forEach(row=>row.classList.toggle("result", false));

    table.classList.toggle("search", find !== "");
    table.classList.toggle("hide", find !== "" && checkbox_hide.checked);

    cells.forEach(cell=>{
        var found = find !== "" && cell.textContent.toLowerCase().match(find);
        cell.classList.toggle("result", found);
        if(found) {
            cell.parentElement.classList.toggle("result", true);
        }
    });
}

// Alt functions starting with these values are "mutually exclusive" and can
// only be configured on *one* pin. This isn't strictly true from the hardware
// perspective, but is generally what you'll want.
function is_mutex(alt_fn) {
    return ["SPI", "UART", "I2C", "PWM", "CLOCK", "USB"].some(iface => alt_fn.startsWith(iface));
}

// The SIO function is effectively GPIO, so detect it and avoid replacing text
// labels (in the minimap) on select.
function is_sio(alt_fn) {
    return ["SIO"].some(iface => alt_fn.startsWith(iface));
}

// Some gymnastics to swap the title/textContent so the minimap shows the
// configured alt function in place of GPIOn, but also swaps back nicely.
function update_minimap(minipin, add, alt_fn) {
    minimap_pins[minipin].classList.toggle("selected", add);
    minimap_pins[minipin].nextSibling.classList.toggle("selected", add);

    if (is_sio(alt_fn)) {
        minimap_pins[minipin].nextSibling.title = add ? alt_fn : "";
    } else {
        var text = add ? alt_fn : minimap_pins[minipin].nextSibling.title;
        minimap_pins[minipin].nextSibling.title = add ? minimap_pins[minipin].nextSibling.textContent : "";
        minimap_pins[minipin].nextSibling.textContent = text;
    }
}

function mark_pin(){
    _mark_pin(this);
}

function mark_pin_sio() {
    _mark_pin(this.parentElement.getElementsByTagName("td")[5]);
}

function _mark_pin(pin) {
    var alt_fn = pin.textContent;
    if (alt_fn === "") return;

    var add = !pin.classList.contains("selected");

    if(add && is_mutex(alt_fn)) {
        var conflicts = Array.from(document.querySelectorAll("tbody td.selected,tbody th.selected")).filter(cell=>cell.textContent === alt_fn && cell !== pin);
        if(conflicts.length) {
            var conflict = conflicts[0];
            var conflicting_pin = conflict.parentElement.querySelector("th:nth-child(2)").textContent;
            var this_pin = pin.parentElement.querySelector("th:nth-child(2)").textContent;
            var replace = !checkbox_confirm.checked || confirm(`${alt_fn} on ${this_pin} conflicts with assignment on ${conflicting_pin}. Replace?`);
            if(replace) {
                conflict.classList.remove("selected");
                conflict.parentElement.classList.remove("selected");

                var minipin = parseInt(conflict.parentElement.querySelector("th").textContent) - 1;
                update_minimap(minipin, false, "");
            
            } else {
                return;
            }
        }
    }

    pin.classList.toggle("selected", add);

    pin.parentElement.querySelectorAll("tbody td,tbody th").forEach(cell=>{
        if(cell === pin) return;
        cell.classList.remove("selected");
    });

    pin.parentElement.classList.toggle("selected", add);

    var minipin = parseInt(pin.parentElement.querySelector("th").textContent) - 1;
    update_minimap(minipin, add, alt_fn);

}

function JSON_download() {
    var pins = [];
    rows.forEach((row) => {
        var headers = row.getElementsByTagName("th");
        var alt_fn = row.querySelector("td.selected");
        var pin = parseInt(headers[0].textContent);
        var name = headers[1].textContent;
        alt_fn = alt_fn ? `, "alt": "${alt_fn.textContent}"` : "";
        pins.push(`{"pin": "${pin}", "name": "${name}"${alt_fn}}`);
    });
    pins = pins.join(",\n");
    var content = `[${pins}]`;
    const a = document.createElement("a");
    const blob = new Blob([content], {type: "text/json"});
    a.setAttribute('href', URL.createObjectURL(blob));
    var filename = input_filename.value ? input_filename.value + ".json" : "rp2350a.pinout.xyz.json"
    a.setAttribute('download', filename);
    a.click();
}

btn_save.onclick = JSON_download;

alt_functions.forEach(cell=>cell.onclick = mark_pin);
headings.forEach(cell=>cell.onclick = mark_pin_sio);

var rotate = 0;
minimap.onclick = () => {
    rotate += 1;
    rotate %= 4;
    minimap.classList.toggle("rot0", rotate === 0);
    minimap.classList.toggle("rot90", rotate === 1);
    minimap.classList.toggle("rot180", rotate === 2);
    minimap.classList.toggle("rot270", rotate === 3);
};
