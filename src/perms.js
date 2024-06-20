import Format from "./format.js";

/** Permission necessary to access car's mileage information.*/
const PERMISSION_MILEAGE = "android.car.permission.CAR_MILEAGE";

/** Permission necessary to access car's energy information. */
const PERMISSION_ENERGY = "android.car.permission.CAR_ENERGY";

/** Permission necessary to access car's VIN information */
const PERMISSION_IDENTIFICATION = "android.car.permission.CAR_IDENTIFICATION";

/** Permission necessary to access car's speed. */
const PERMISSION_SPEED = "android.car.permission.CAR_SPEED";

/** Permission necessary to access car's dynamics state*/
const PERMISSION_CAR_DYNAMICS_STATE = "android.car.permission.CAR_DYNAMICS_STATE";

/** Permission necessary to access car's fuel door and ev charge port. */
const PERMISSION_ENERGY_PORTS = "android.car.permission.CAR_ENERGY_PORTS";

/** Permission necessary to read car's exterior lights information*/
const PERMISSION_EXTERIOR_LIGHTS = "android.car.permission.CAR_EXTERIOR_LIGHTS";

/** Permission necessary to read car's interior lights information.*/
const PERMISSION_READ_INTERIOR_LIGHTS = "android.car.permission.READ_CAR_INTERIOR_LIGHTS";

/** Permission necessary to control car's exterior lights.*/
const PERMISSION_CONTROL_EXTERIOR_LIGHTS = "android.car.permission.CONTROL_CAR_EXTERIOR_LIGHTS";

/** Permission necessary to control car's interior lights.*/
const PERMISSION_CONTROL_INTERIOR_LIGHTS = "android.car.permission.CONTROL_CAR_INTERIOR_LIGHTS";

/** Permission necessary to access car's powertrain information.*/
const PERMISSION_POWERTRAIN = "android.car.permission.CAR_POWERTRAIN";

/** Permission necessary to change car audio volume through. */
const PERMISSION_CAR_CONTROL_AUDIO_VOLUME = "android.car.permission.CAR_CONTROL_AUDIO_VOLUME";

/** Permission necessary to change car audio settings through.*/
const PERMISSION_CAR_CONTROL_AUDIO_SETTINGS = "android.car.permission.CAR_CONTROL_AUDIO_SETTINGS";

/** Permission necessary to start activities in the instrument cluster through */
const PERMISSION_CAR_INSTRUMENT_CLUSTER_CONTROL = "android.car.permission.CAR_INSTRUMENT_CLUSTER_CONTROL";

/** Application must have this permission in order to be launched in the instrument cluster */
const PERMISSION_CAR_DISPLAY_IN_CLUSTER = "android.car.permission.CAR_DISPLAY_IN_CLUSTER";

/** Permission necessary to use. */
const PERMISSION_CAR_INFO = "android.car.permission.CAR_INFO";

/** Permission necessary to read temperature of car's exterior environment. */
const PERMISSION_EXTERIOR_ENVIRONMENT = "android.car.permission.CAR_EXTERIOR_ENVIRONMENT";

/** Permission necessary to access car specific communication channel. */
const PERMISSION_VENDOR_EXTENSION = "android.car.permission.CAR_VENDOR_EXTENSION";

/** Permission necessary to access car's engine information. */
const PERMISSION_CAR_ENGINE_DETAILED = "android.car.permission.CAR_ENGINE_DETAILED";

/** Permission necessary to access car's tire pressure information. */
const PERMISSION_TIRES = "android.car.permission.CAR_TIRES";

/** Permission necessary to access car's steering angle information. */
const PERMISSION_READ_STEERING_STATE = "android.car.permission.READ_CAR_STEERING";

/** Permission necessary to read and write display units for distance, fuel volume, tire pressure and ev battery. */
const PERMISSION_READ_DISPLAY_UNITS = "android.car.permission.READ_CAR_DISPLAY_UNITS";

/** Permission necessary to control display units for distance, fuel volume, tire pressure */
const PERMISSION_CONTROL_DISPLAY_UNITS = "android.car.permission.CONTROL_CAR_DISPLAY_UNITS";

/** Permission necessary to control car's door. */
const PERMISSION_CONTROL_CAR_DOORS = "android.car.permission.CONTROL_CAR_DOORS";

/** Permission necessary to control car's windows. */
const PERMISSION_CONTROL_CAR_WINDOWS = "android.car.permission.CONTROL_CAR_WINDOWS";

/** Permission necessary to control car's seats. */
const PERMISSION_CONTROL_CAR_SEATS = "android.car.permission.CONTROL_CAR_SEATS";

/** Permission necessary to control car's mirrors. */
const PERMISSION_CONTROL_CAR_MIRRORS = "android.car.permission.CONTROL_CAR_MIRRORS";

/** Permission necessary to access Car HVAC APIs. */
const PERMISSION_CONTROL_CAR_CLIMATE = "android.car.permission.CONTROL_CAR_CLIMATE";

/** Permission necessary to access Car POWER APIs. */
const PERMISSION_CAR_POWER = "android.car.permission.CAR_POWER";

/** Permission necessary to access Car PROJECTION system APIs. */
const PERMISSION_CAR_PROJECTION = "android.car.permission.CAR_PROJECTION";

/** Permission necessary to access projection status. */
const PERMISSION_CAR_PROJECTION_STATUS = "android.car.permission.ACCESS_CAR_PROJECTION_STATUS";

/** Permission necessary to access CarDrivingStateService to get a Car's driving state. */
const PERMISSION_CAR_DRIVING_STATE = "android.car.permission.CAR_DRIVING_STATE";

/** Permissions necessary to read diagnostic information, including vendor-specific bits. */
const PERMISSION_CAR_DIAGNOSTIC_READ_ALL = "android.car.permission.CAR_DIAGNOSTICS";

/** Permissions necessary to clear diagnostic information. */
const PERMISSION_CAR_DIAGNOSTIC_CLEAR = "android.car.permission.CLEAR_CAR_DIAGNOSTICS";

const prebuilts = [
  PERMISSION_MILEAGE,
  PERMISSION_ENERGY,
  PERMISSION_IDENTIFICATION,
  PERMISSION_SPEED,
  PERMISSION_CAR_DYNAMICS_STATE,
  PERMISSION_ENERGY_PORTS,
  PERMISSION_EXTERIOR_LIGHTS,
  PERMISSION_READ_INTERIOR_LIGHTS,
  PERMISSION_CONTROL_EXTERIOR_LIGHTS,
  PERMISSION_CONTROL_INTERIOR_LIGHTS,
  PERMISSION_POWERTRAIN,
  PERMISSION_CAR_CONTROL_AUDIO_VOLUME,
  PERMISSION_CAR_CONTROL_AUDIO_SETTINGS,
  PERMISSION_CAR_INSTRUMENT_CLUSTER_CONTROL,
  PERMISSION_CAR_DISPLAY_IN_CLUSTER,
  PERMISSION_CAR_INFO,
  PERMISSION_EXTERIOR_ENVIRONMENT,
  PERMISSION_VENDOR_EXTENSION,
  PERMISSION_CAR_ENGINE_DETAILED,
  PERMISSION_TIRES,
  PERMISSION_READ_STEERING_STATE,
  PERMISSION_READ_DISPLAY_UNITS,
  PERMISSION_CONTROL_DISPLAY_UNITS,
  PERMISSION_CONTROL_CAR_DOORS,
  PERMISSION_CONTROL_CAR_WINDOWS,
  PERMISSION_CONTROL_CAR_SEATS,
  PERMISSION_CONTROL_CAR_MIRRORS,
  PERMISSION_CONTROL_CAR_CLIMATE,
  PERMISSION_CAR_POWER,
  PERMISSION_CAR_PROJECTION,
  PERMISSION_CAR_PROJECTION_STATUS,
  PERMISSION_CAR_DRIVING_STATE,
  PERMISSION_CAR_DIAGNOSTIC_READ_ALL,
  PERMISSION_CAR_DIAGNOSTIC_CLEAR,
];

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
  prebuilts.forEach(e => append(e));
  _values.splice(0, _values.length, ...Array.from(sets));
}

const values = () => _values;

const line = (values) => values.join(',');

const TEMPLATE = PERMISSION_VENDOR_EXTENSION;

export default {
  split,
  group,
  setup,
  values,
  line,
  TEMPLATE,
};
