"use strict";

var table = document.getElementById("pinout");
var input = document.getElementById("find");
var checkbox_hide = document.getElementById("find_hide");
var checkbox_confirm = document.getElementById("mark_confirm");
var cells = document.querySelectorAll("tbody td,tbody th");
var alt_functions = document.querySelectorAll("tbody td");
var rows = document.querySelectorAll("tr");

var minimap = document.querySelectorAll("#minimap dt");

checkbox_hide.onchange = function() {
    find = input.value.toLowerCase();
    table.classList.toggle("hide", find !== "" && this.checked);
}

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

function is_mutex(alt_fn) {
    return ["SPI", "UART", "I2C", "PWM"].some(iface => alt_fn.startsWith(iface));
}

function mark_pin(){
    var pin = this;
    var alt_fn = this.textContent;
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
                minimap[minipin].classList.remove("selected");
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
    minimap[minipin].classList.toggle("selected", add);
}

alt_functions.forEach(cell=>cell.onclick = mark_pin);