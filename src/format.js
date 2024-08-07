import Types from "./types.js"

const KEY_MASK = "MASK";
const CAN_PROP_INDEX_LIMIT = 0x1000

const textHexInt = (id, length = 1, defaults = "") => {
  if (id == undefined || !Number.isInteger(id)) return defaults;
  return `0x${id.toString(16).padStart(length, "0")}`;
};

const hexUpperCase = text => {
  if (typeof(text) != 'string') return text;
  const value = text.startsWith('0x') ? text.substring(2) : text;
  return `0x${value.toUpperCase()}`;
};

const parseHexInt = (s) => {
  return parseInt(s, 16);
};

const trim = s => (s || '').trim();

const isCANProperty = (id) => {
  const iid = typeof (id) == 'string' ? parseHexInt(id) : id;
  return (iid & Types.VehiclePropertyIndex.MASK) < CAN_PROP_INDEX_LIMIT;
};

const HEX_INT32_REGEX = /^0x[0-9a-fA-F]{1,4}$/i;
const HEX_INT64_REGEX = /^0x[0-9a-fA-F]{1,8}$/i;
const PROPERTY_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{5,59}$/;
const AREA_VALUE_MAPPING_REGEX = /^(?:[0-9a-fA-F]+-[0-9a-fA-F]+,)*[0-9a-fA-F]+-[0-9a-fA-F]+$/;
const FLOAT_NUMBER_REGEX = /^[+-]?(?=.*\d)\d*(?:\.\d+)?$/;
const CAN_DOMAIN_REGEX = /^0x[0-9a-fA-F]{1,4}$/i;

const PROPERTY_NAME_FORMAT_HINT = "6-60 character, number(non start with), _ combine";
const AREA_VALUE_MAPPING_FORMAT_HINT = "0 or more hex-hex, split via ,";
const REPEAT_SYMBOL = "-"

const CAN_SIGNAL_MAX_BIT = 64;

const nonNull = (value, defaults) => value != undefined ? value : defaults;

const OPTION_INPUT = ' ';

export default {
  KEY_MASK,
  textHexInt,
  parseHexInt,
  trim,
  nonNull,
  isCANProperty,
  hexUpperCase,
  HEX_INT32_REGEX,
  HEX_INT64_REGEX,
  PROPERTY_NAME_REGEX,
  AREA_VALUE_MAPPING_REGEX,
  FLOAT_NUMBER_REGEX,
  CAN_DOMAIN_REGEX,
  PROPERTY_NAME_FORMAT_HINT,
  AREA_VALUE_MAPPING_FORMAT_HINT,
  REPEAT_SYMBOL,
  CAN_SIGNAL_MAX_BIT,
  OPTION_INPUT,
};
