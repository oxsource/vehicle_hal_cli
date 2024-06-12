import Format from "./format.js";

const sets = new Set();
const _values = [];
const _names = [];

const append = e => {
    const name = e && e.name || '';
    if (!Format.CAN_DOMAIN_REGEX.test(name)) {
        console.warn(`domain.js append skip illegal domain name: ${name}`);
        return;
    }
    sets.add(e);
}

const setup = values => {
    sets.clear();
    values && values.forEach(e => append(e));
    _values.splice(0, _values.length, ...Array.from(sets));
    _names.splice(0, _names.length, ..._values.map(e => e.name));
}

const values = () => _values;

const names = () => _names;

const TEMPLATE = "0x0000";

export default {
    setup,
    names,
    values,
    TEMPLATE,
};