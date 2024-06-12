const KEY_MASK = "MASK";

const textHexInt = (id, length = 1, defaults = "") => {
  if (id == undefined || !Number.isInteger(id)) return defaults;
  return `0x${id.toString(16).padStart(length, "0")}`;
};

const parseHexInt = (s) => {
  return parseInt(s, 16);
};

const trim = s => (s || '').trim();

const HEX_INT32_REGEX = /^0x[0-9a-fA-F]{0,4}$/i;
const HEX_INT64_REGEX = /^0x[0-9a-fA-F]{0,8}$/i;
const PROPERTY_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{5,23}$/;
const AREA_VALUE_MAPPING_REGEX =
  /^(?:[0-9a-fA-F]+-[0-9a-fA-F]+,)*[0-9a-fA-F]+-[0-9a-fA-F]+$/;
const CAN_DOMAIN_REGEX = /^0x[0-9a-fA-F]{0,4}$/i;
const FLOAT_NUMBER_REGEX = /^[+-]?(?=.*\d)\d*(?:\.\d+)?$/;

const PROPERTY_NAME_FORMAT_HINT =
  "6-24 character, number(non start with), _ combine";
const AREA_VALUE_MAPPING_FORMAT_HINT = "0 or more hex-hex, split via ,";
const REPEAT_SYMBOL = "-"

const CAN_SIGNAL_MAX_BIT = 64;

const nonNull = (value, defaults) => value != undefined ? value : defaults;

export default {
  KEY_MASK,
  textHexInt,
  parseHexInt,
  trim,
  nonNull,
  HEX_INT32_REGEX,
  HEX_INT64_REGEX,
  PROPERTY_NAME_REGEX,
  AREA_VALUE_MAPPING_REGEX,
  CAN_DOMAIN_REGEX,
  FLOAT_NUMBER_REGEX,
  PROPERTY_NAME_FORMAT_HINT,
  AREA_VALUE_MAPPING_FORMAT_HINT,
  REPEAT_SYMBOL,
  CAN_SIGNAL_MAX_BIT,
};
