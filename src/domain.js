const sets = new Set();

const append = e => {
    const value = e && e.trim();
    if (!value || value.length == 0) return;
    sets.add(value);
}

const values = () => Array.from(sets);

const TEMPLATE = "0x0000";

export default {
    append,
    values,
    TEMPLATE,
};