"use strict";
var input = document.getElementById("find");
var hide = document.getElementById("find_hide");
var cells = document.querySelectorAll("tbody td,tbody th");
var rows = document.querySelectorAll("tr");
var table = document.getElementById("pinout");

hide.onchange = function() {
    find = this.value.toLowerCase();
    table.classList.toggle("hide", find !== "" && hide.checked);
}

input.onkeyup = function(){
    find = this.value.toLowerCase();

    rows.forEach(row=>row.classList.toggle("result", false));

    table.classList.toggle("search", find !== "");
    table.classList.toggle("hide", find !== "" && hide.checked);

    cells.forEach(cell=>{
        var found = find !== "" && cell.textContent.toLowerCase().match(find);
        cell.classList.toggle("result", found);
        if(found) {
            cell.parentElement.classList.toggle("result", true);
        }
    });
}