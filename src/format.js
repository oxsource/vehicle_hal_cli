const KEY_MASK = 'MASK'

const textHexInt = (id, length = 1, defaults = '') => {
    if (id == undefined || !Number.isInteger(id)) return defaults
    return `0x${id.toString(16).padStart(length, '0')}`
}

const parseHexInt = (s) => {
    return parseInt(s, 16)
}

const HEX_INT16_REGEX = /^0x[1-9a-fA-F][0-9a-fA-F]{0,3}$/i

export default {
    KEY_MASK,
    textHexInt,
    parseHexInt,
    HEX_INT16_REGEX,
}