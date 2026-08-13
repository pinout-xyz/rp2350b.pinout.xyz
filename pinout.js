"use strict";

const table = document.getElementById("pinout");
const search_input = document.getElementById("find");
const hide_unmatched = document.getElementById("find_hide");
const confirm_conflicts = document.getElementById("mark_confirm");
const save_button = document.getElementById("save");
const load_button = document.getElementById("load");
const load_input = document.getElementById("load_file");
const rotate_button = document.getElementById("rotate");
const filename_input = document.getElementById("name");
const status_region = document.getElementById("status");

const minimap = document.getElementById("minimap");
const minimap_pins = Array.from(minimap.querySelectorAll("dt"));

const rows = Array.from(table.querySelectorAll("tbody tr"));
const cells = rows.flatMap((row) => Array.from(row.cells));

const SIO = "SIO";
const PIOS = ["PIO0", "PIO1", "PIO2"];
const ROTATIONS = ["rot0", "rot90", "rot180", "rot270"];

// Alt functions with these prefixes can only be routed to one pin at a time.
// Not strictly a hardware limit, but it is what you almost always want.
const MUTEX_PREFIXES = ["SPI", "UART", "I2C", "PWM", "CLOCK", "USB"];

function label_of(cell) {
    return cell.textContent.trim();
}

function row_of(cell) {
    return cell.parentElement;
}

function pin_number(row) {
    return parseInt(row.cells[0].textContent, 10);
}

function pin_name(row) {
    return label_of(row.cells[1]);
}

function is_mutex(alt_fn) {
    return MUTEX_PREFIXES.some((prefix) => alt_fn.startsWith(prefix));
}

function sio_cell(row) {
    return Array.from(row.cells).find((cell) => cell.tagName === "TD" && label_of(cell) === SIO);
}

function selected_cells() {
    return cells.filter((cell) => cell.classList.contains("selected"));
}

function announce(message) {
    status_region.textContent = message;
}

/* Minimap */

function minimap_entry(row) {
    const term = minimap_pins[pin_number(row) - 1];
    return term ? {term, definition: term.nextElementSibling} : null;
}

function highlight_minimap(row) {
    minimap_pins.forEach((term) => {
        term.classList.remove("hover");
        term.nextElementSibling.classList.remove("hover");
    });
    const entry = minimap_entry(row);
    if (!entry) return;
    entry.term.classList.add("hover");
    entry.definition.classList.add("hover");
}

// The minimap shows the assigned alt function in place of the pin name, keeping
// the name in the tooltip. SIO is plain GPIO, so the name is worth keeping.
function update_minimap(row, alt_fn) {
    const entry = minimap_entry(row);
    if (!entry) return;

    const {term, definition} = entry;
    if (definition.dataset.name === undefined) {
        definition.dataset.name = definition.textContent;
    }

    const assigned = alt_fn !== null;
    term.classList.toggle("selected", assigned);
    definition.classList.toggle("selected", assigned);

    if (assigned && alt_fn !== SIO) {
        definition.textContent = alt_fn;
        definition.title = definition.dataset.name;
    } else {
        definition.textContent = definition.dataset.name;
        definition.title = assigned ? alt_fn : "";
    }
}

/* PIO range validation */

function assigned_gpios(alt_fn) {
    return selected_cells()
        .filter((cell) => label_of(cell) === alt_fn)
        .map((cell) => parseInt(pin_name(row_of(cell)).split("_")[0].substring(4), 10))
        .filter((gpio) => !Number.isNaN(gpio));
}

// A single PIO addresses a 32-GPIO window, so on the 48-GPIO RP2350B every pin
// assigned to one PIO must fall within GPIO 0-31 or 16-47.
function pio_range_ok(pio) {
    const gpios = assigned_gpios(pio);
    if (!gpios.length) return true;
    return Math.max(...gpios) < 32 || Math.min(...gpios) > 15;
}

function mark_error(alt_fn, state) {
    cells.forEach((cell) => {
        if (label_of(cell) !== alt_fn) return;
        cell.classList.toggle("error", state && cell.classList.contains("selected"));
    });
}

function check_pios(activated) {
    PIOS.forEach((pio) => {
        const ok = pio_range_ok(pio);
        mark_error(pio, !ok);
        if (ok || pio !== activated) return;
        announce(`${pio} pin assignments are out of range`);
        if (confirm_conflicts.checked) {
            window.alert(`Pin assignments for ${pio} do not fall within a valid range.
Valid ranges are GPIO 0-31 or 16-47 inclusive.

Selected pins: ${assigned_gpios(pio).join(", ")}`);
        }
    });
}

/* Pin assignment */

function clear_row(row) {
    Array.from(row.cells).forEach((cell) => cell.classList.remove("selected", "error"));
    row.classList.remove("selected");
    update_minimap(row, null);
}

function select_cell(cell) {
    const row = row_of(cell);
    Array.from(row.cells).forEach((other) => other.classList.remove("selected", "error"));
    cell.classList.add("selected");
    row.classList.add("selected");
    update_minimap(row, label_of(cell));
}

function assign(cell) {
    const alt_fn = label_of(cell);
    if (!alt_fn) return;

    const row = row_of(cell);
    const adding = !cell.classList.contains("selected");

    if (adding && is_mutex(alt_fn)) {
        const clash = selected_cells().find((other) => other !== cell && label_of(other) === alt_fn);
        if (clash) {
            const message = `${alt_fn} on ${pin_name(row)} conflicts with assignment on `
                + `${pin_name(row_of(clash))}. Replace?`;
            if (confirm_conflicts.checked && !window.confirm(message)) return;
            clear_row(row_of(clash));
        }
    }

    if (adding) select_cell(cell); else clear_row(row);

    announce(adding ? `${alt_fn} assigned to ${pin_name(row)}` : `${alt_fn} cleared from ${pin_name(row)}`);
    check_pios(alt_fn);
}

// Activating either header cell assigns SIO, the plain-GPIO function. Pins with
// no alt functions have no SIO cell and are inert.
function activate(cell) {
    if (cell.tagName !== "TH") {
        assign(cell);
        return;
    }
    const sio = sio_cell(row_of(cell));
    if (sio) assign(sio);
}

/* Search */

function apply_search() {
    const term = search_input.value.trim().toLowerCase();
    const searching = term !== "";

    table.classList.toggle("search", searching);
    table.classList.toggle("hide", searching && hide_unmatched.checked);

    rows.forEach((row) => row.classList.remove("result"));
    cells.forEach((cell) => {
        const match = searching && label_of(cell).toLowerCase().includes(term);
        cell.classList.toggle("result", match);
        if (match) row_of(cell).classList.add("result");
    });
}

/* Keyboard navigation, one tab stop for the whole table */

// Cells keep their true position in the row, including blanks, so moving
// vertically stays in the same alt-function column. Every pin is reachable,
// including supply pins that have nothing to assign.
const grid = rows.map((row) => Array.from(row.cells));
const full_width = Math.max(...grid.map((row) => row.length));

// Remembered so that passing through a short row (a supply pin spanning the
// whole width) does not lose the column you were travelling down.
let desired_column = 0;
let moving_focus = false;

function locate(cell) {
    for (let row = 0; row < grid.length; row++) {
        const column = grid[row].indexOf(cell);
        if (column !== -1) return {row, column};
    }
    return null;
}

function is_reachable(row) {
    return rows[row].offsetParent !== null;
}

function set_tab_stop(cell) {
    grid.flat().forEach((other) => {
        other.tabIndex = other === cell ? 0 : -1;
    });
}

function focus_cell(row, column) {
    const cell = grid[row][Math.min(column, grid[row].length - 1)];
    set_tab_stop(cell);
    moving_focus = true;
    cell.focus();
    moving_focus = false;
}

function move_row(from, delta) {
    let next = from.row + delta;
    while (next >= 0 && next < grid.length && !is_reachable(next)) next += delta;
    if (next < 0 || next >= grid.length) return;
    focus_cell(next, desired_column);
}

function move_column(from, delta) {
    desired_column = Math.max(0, Math.min(grid[from.row].length - 1, from.column + delta));
    focus_cell(from.row, desired_column);
}

table.addEventListener("keydown", (event) => {
    const cell = event.target.closest("th, td");
    const position = cell && locate(cell);
    if (!position) return;

    // A full-width row always shows the true column; only short rows need the
    // remembered one, so this stays correct however focus arrived here.
    if (grid[position.row].length === full_width) desired_column = position.column;

    switch (event.key) {
        case "ArrowRight": move_column(position, 1); break;
        case "ArrowLeft": move_column(position, -1); break;
        case "ArrowDown": move_row(position, 1); break;
        case "ArrowUp": move_row(position, -1); break;
        case "Home": move_column(position, -grid[position.row].length); break;
        case "End": move_column(position, grid[position.row].length); break;
        case "Enter":
        case " ": activate(cell); break;
        default: return;
    }
    event.preventDefault();
});

/* Save and load */

function row_for_pin(pin) {
    return rows.find((row) => pin_number(row) === pin);
}

function apply_config(config) {
    if (!config || !Array.isArray(config.pins)) {
        throw new Error("expected an object with a \"pins\" array");
    }

    rows.forEach(clear_row);

    let applied = 0;
    const skipped = [];
    config.pins.forEach((entry) => {
        if (!entry || !entry.alt) return;
        const row = row_for_pin(parseInt(entry.pin, 10));
        const cell = row && Array.from(row.cells)
            .find((candidate) => candidate.tagName === "TD" && label_of(candidate) === entry.alt);
        if (!cell) {
            skipped.push(`pin ${entry.pin} ${entry.alt}`);
            return;
        }
        select_cell(cell);
        applied++;
    });

    if (typeof config.name === "string" && config.name) filename_input.value = config.name;
    check_pios(null);

    return {applied, skipped};
}

async function load_json(file) {
    let result;
    try {
        result = apply_config(JSON.parse(await file.text()));
    } catch (error) {
        announce(`Could not load ${file.name}`);
        window.alert(`Could not load ${file.name}:\n\n${error.message}`);
        return;
    }

    const {applied, skipped} = result;
    let message = `Loaded ${applied} pin assignment${applied === 1 ? "" : "s"} from ${file.name}`;
    if (skipped.length) message += `, skipped ${skipped.length} not available on this package`;
    announce(message);
    if (skipped.length) {
        window.alert(`${message}:\n\n${skipped.join("\n")}`);
    }
}

function save_json() {
    const filename = filename_input.value.trim() || document.location.hostname;
    const config = {
        name: filename,
        pins: rows.map((row) => {
            const assigned = row.querySelector("td.selected");
            const pin = {pin: String(pin_number(row)), name: pin_name(row)};
            if (assigned) pin.alt = label_of(assigned);
            return pin;
        })
    };

    const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], {type: "application/json"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    // Revoke once the download has had a chance to start.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* Wiring */

let rotation = 0;

function rotate_minimap() {
    rotation = (rotation + 1) % ROTATIONS.length;
    ROTATIONS.forEach((name, index) => minimap.classList.toggle(name, index === rotation));
}

table.addEventListener("click", (event) => {
    const cell = event.target.closest("tbody th, tbody td");
    if (cell) activate(cell);
});

table.addEventListener("mouseover", (event) => {
    const row = event.target.closest("tbody tr");
    if (row) highlight_minimap(row);
});

table.addEventListener("focusin", (event) => {
    const cell = event.target.closest("tbody th, tbody td");
    if (!cell) return;

    highlight_minimap(row_of(cell));
    if (moving_focus) return;

    const position = locate(cell);
    if (!position) return;
    desired_column = position.column;
    set_tab_stop(cell);
});

search_input.addEventListener("input", apply_search);
hide_unmatched.addEventListener("change", apply_search);
search_input.form.addEventListener("submit", (event) => event.preventDefault());

save_button.addEventListener("click", save_json);
rotate_button.addEventListener("click", rotate_minimap);
minimap.addEventListener("click", rotate_minimap);

load_button.addEventListener("click", () => load_input.click());
load_input.addEventListener("change", () => {
    if (load_input.files.length) load_json(load_input.files[0]);
    load_input.value = "";
});

if (grid.length) set_tab_stop(grid[0][0]);
