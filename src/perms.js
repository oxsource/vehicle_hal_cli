import Format from "./format.js";

const sets = new Set();
const _values = [];

const split = property => {
  const values = (property && property.perms) || ['', ''];
  values[1] = values[values[1] == Format.REPEAT_SYMBOL ? 0 : 1];
  return values;
}

const group = (w, r) => {
  // const values = [w.trim(), r.trim()];
  const values = [w, r];
  if (values[0].length > 0 && values[0] === values[1]) {
    values[1] = Format.REPEAT_SYMBOL;
  }
  return values;
}

const append = e => {
  const value = e && e.trim();
  if (!value || value.length == 0) return;
  sets.add(value);
}

const setup = values => {
  sets.clear();
  values && values.forEach(e => append(e));
  _values.splice(0, _values.length, ...Array.from(sets));
}

const values = () => _values;

const line = (values) => values.join(',');

const TEMPLATE = "android.car.permission.CAR_xxx";

export default {
  split,
  group,
  setup,
  values,
  line,
  TEMPLATE,
};
