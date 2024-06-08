const VehiclePropertyType = {
    STRING          : 0x00100000,
    BOOLEAN         : 0x00200000,
    INT32           : 0x00400000,
    INT32_VEC       : 0x00410000,
    INT64           : 0x00500000,
    INT64_VEC       : 0x00510000,
    FLOAT           : 0x00600000,
    FLOAT_VEC       : 0x00610000,
    BYTES           : 0x00700000,

    /**
     * Any combination of scalar or vector types. The exact format must be
     * provided in the description of the property.
     *
     * For vendor MIXED type properties, configArray needs to be formatted in this
     * structure.
     * configArray[0], 1 indicates the property has a String value
     * configArray[1], 1 indicates the property has a Boolean value .
     * configArray[2], 1 indicates the property has an Integer value.
     * configArray[3], the number indicates the size of Integer[] in the property.
     * configArray[4], 1 indicates the property has a Long value.
     * configArray[5], the number indicates the size of Long[] in the property.
     * configArray[6], 1 indicates the property has a Float value.
     * configArray[7], the number indicates the size of Float[] in the property.
     * configArray[8], the number indicates the size of byte[] in the property.
     * For example:
     * {@code configArray = {1, 1, 1, 3, 0, 0, 0, 0, 0}} indicates the property has
     * a String value, a Boolean value, an Integer value and an array with 3 integers.
     */
    MIXED           : 0x00e00000,

    MASK            : 0x00ff0000
}

/**
 * List of different supported area types for vehicle properties.
 * Used to construct property IDs in the VehicleProperty enum.
 *
 * Some properties may be associated with particular areas in the vehicle. For example,
 * VehicleProperty#DOOR_LOCK property must be associated with a particular door, thus this property
 * must be of the VehicleArea#DOOR area type.
 *
 * Other properties may not be associated with a particular area in the vehicle. These kinds of
 * properties must be of the VehicleArea#GLOBAL area type.
 *
 * Note: This is not the same as areaId used in VehicleAreaConfig. E.g. for a global property, the
 * property ID is of the VehicleArea#GLOBAL area type, however, the area ID must be 0.
 */
// A better name would be VehicleAreaType
const VehicleArea = {
    /**
     * A global property is a property that applies to the entire vehicle and is not associated with
     * a specific area. For example, FUEL_LEVEL, HVAC_STEERING_WHEEL_HEAT are global properties.
     */
    GLOBAL      : 0x01000000,
    /** WINDOW maps to enum VehicleAreaWindow */
    WINDOW      : 0x03000000,
    /** MIRROR maps to enum VehicleAreaMirror */
    MIRROR      : 0x04000000,
    /** SEAT maps to enum VehicleAreaSeat */
    SEAT        : 0x05000000,
    /** DOOR maps to enum VehicleAreaDoor */
    DOOR        : 0x06000000,
    /** WHEEL maps to enum VehicleAreaWheel */
    WHEEL       : 0x07000000,

    MASK        : 0x0f000000,
}

/**
 * Enumerates property groups.
 *
 * Used to create property ID in VehicleProperty enum.
 */
const VehiclePropertyGroup = {
    /**
     * Properties declared in AOSP must use this flag.
     */
    SYSTEM      : 0x10000000,

    /**
     * Properties declared by vendors must use this flag.
     */
    VENDOR      : 0x20000000,

    MASK        : 0xf0000000,
}

const VehiclePropertyIndex = {
    INIT        : 0x0001,
    MASK        : 0xffff,
}

const VehicleAreaGlobal = {
    INIT        : 0x0001,
    MASK        : 0xffff,
}

/**
 * Various Seats in the car.
 */
const VehicleAreaSeat = {
    ROW_1_LEFT   : 0x0001,
    ROW_1_CENTER : 0x0002,
    ROW_1_RIGHT  : 0x0004,
    ROW_2_LEFT   : 0x0010,
    ROW_2_CENTER : 0x0020,
    ROW_2_RIGHT  : 0x0040,
    ROW_3_LEFT   : 0x0100,
    ROW_3_CENTER : 0x0200,
    ROW_3_RIGHT  : 0x0400
}


/**
 * Various windshields/windows in the car.
 */
const VehicleAreaWindow = {
    FRONT_WINDSHIELD  : 0x00000001,
    REAR_WINDSHIELD   : 0x00000002,
    ROW_1_LEFT        : 0x00000010,
    ROW_1_RIGHT       : 0x00000040,
    ROW_2_LEFT        : 0x00000100,
    ROW_2_RIGHT       : 0x00000400,
    ROW_3_LEFT        : 0x00001000,
    ROW_3_RIGHT       : 0x00004000,

    ROOF_TOP_1        : 0x00010000,
    ROOF_TOP_2        : 0x00020000,
}

const VehicleAreaDoor = {
    ROW_1_LEFT : 0x00000001,
    ROW_1_RIGHT : 0x00000004,
    ROW_2_LEFT : 0x00000010,
    ROW_2_RIGHT : 0x00000040,
    ROW_3_LEFT : 0x00000100,
    ROW_3_RIGHT : 0x00000400,
    HOOD : 0x10000000,
    REAR : 0x20000000,
}

const VehicleAreaMirror = {
    DRIVER_LEFT : 0x00000001,
    DRIVER_RIGHT : 0x00000002,
    DRIVER_CENTER : 0x00000004,
}

const VehicleAreaWheel = {
    UNKNOWN : 0x0,
    LEFT_FRONT : 0x1,
    RIGHT_FRONT : 0x2,
    LEFT_REAR : 0x4,
    RIGHT_REAR : 0x8,
}

const VehicleAreaMap = [
    [VehicleArea.WINDOW, VehicleAreaWindow],
    [VehicleArea.MIRROR, VehicleAreaMirror],
    [VehicleArea.SEAT, VehicleAreaSeat],
    [VehicleArea.DOOR, VehicleAreaDoor],
    [VehicleArea.WHEEL, VehicleAreaWheel],
].reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
}, {})

/**
 * This describes how value of property can change.
 */
const VehiclePropertyChangeMode = {
    /**
     * Property of this type must never be changed. Subscription is not supported
     * for these properties.
     */
    STATIC : 0x00,

    /**
     * Properties of this type must report when there is a change.
     * IVehicle#get call must return the current value.
     * Set operation for this property is assumed to be asynchronous. When the
     * property is read (using IVehicle#get) after IVehicle#set, it may still
     * return old value until underlying H/W backing this property has actually
     * changed the state. Once state is changed, the property must dispatch
     * changed value as event.
     */
    ON_CHANGE : 0x01,

    /**
     * Properties of this type change continuously and require a fixed rate of
     * sampling to retrieve the data.  Implementers may choose to send extra
     * notifications on significant value changes.
     */
    CONTINUOUS : 0x02,
}

const VehiclePropertyAccess = {
    NONE : 0x00,
    READ : 0x01,
    WRITE : 0x02,
    READ_WRITE : 0x03,
}

/**
 * 1. Group: [SYSTEM | VENDOR]
 * 2. Type: [STRING | BOOLEAN | ... | BYTES]
 * 3. Area: [GLOBAL | WINDOW | MIRROR | SEAT | DOOR | WHEEL]
 * 4. index: (0x0, 0xFFFF)
 * eg. 0x0100 | VehiclePropertyGroup.SYSTEM | VehiclePropertyType.STRING | VehicleArea.GLOBAL
 */
const createPropertyId =  (group, type, area, index) => {
    return (index & VehiclePropertyIndex.MASK) | group | type | area
}

const createAreaId = (...areas) => {
    return areas.reduce((acc, cur) => acc | cur, 0)
}

export default {
    VehiclePropertyType,
    VehicleArea,
    VehiclePropertyGroup,
    VehiclePropertyIndex,
    VehicleAreaGlobal,
    VehicleAreaMap,
    VehiclePropertyChangeMode,
    VehiclePropertyAccess,
    createPropertyId,
    createAreaId,
}