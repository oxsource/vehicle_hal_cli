import assert from "assert";
import enquirer from "enquirer";
import Types from "./types.js";
import Perms from "./perms.js";
import Format from "./format.js";
import Domain from "./domain.js";
import Command from "./command.js";
import internal from "stream";

const { prompt } = enquirer;

const createChoices = (object, length = 1) => {
  return Object.keys(object)
    .filter((key) => key != Format.KEY_MASK)
    .map((key) => {
      const value = Format.textHexInt(object[key], length);
      return { name: value, message: key, value };
    });
};

const propertyName = async (property) => {
  assert.ok(property != undefined);
  const questions = [
    {
      type: "input",
      name: "name",
      message: `VehiclePropertyName(${Format.PROPERTY_NAME_FORMAT_HINT})`,
      initial: property.name || "",
      validate: (e) => {
        return Format.PROPERTY_NAME_REGEX.test(e) || "bad property name";
      },
    },
  ];
  property.name = (await prompt(questions)).name.trim();
};

const propertyId = async (property) => {
  assert.ok(property != undefined);
  const questions = [
    {
      type: "select",
      name: "group",
      message: "VehiclePropertyGroup",
      choices: createChoices(Types.VehiclePropertyGroup, 8),
      initial: Format.textHexInt(
        property.group || Types.VehiclePropertyGroup.VENDOR,
        8
      ),
    },
    {
      type: "select",
      name: "type",
      message: "VehiclePropertyType",
      choices: createChoices(Types.VehiclePropertyType, 8),
      initial: Format.textHexInt(
        property.type || Types.VehiclePropertyType.INT32,
        8
      ),
    },
    {
      type: "select",
      name: "area",
      message: "VehicleArea",
      choices: createChoices(Types.VehicleArea, 8),
      initial: Format.textHexInt(property.area || Types.VehicleArea.GLOBAL, 8),
    },
    {
      type: "input",
      name: "index",
      message: "VehiclePropertyIndex(0x0001-0xFFFF)",
      initial: Format.textHexInt(
        property.index || Types.VehiclePropertyIndex.INIT,
        4
      ),
      validate: (e) => {
        console.log(`validate index: ${e}`)
        return Format.HEX_INT16_REGEX.test(e) || "bad property index";
      },
    },
  ];
  const answers = await prompt(questions);
  const value = Object.keys(answers).reduce((acc, cur) => {
    acc[cur] = Format.parseHexInt(answers[cur]) || 0;
    return acc;
  }, {});
  property.id = Types.createPropertyId(
    value.group,
    value.type,
    value.area,
    value.index
  );
};

const propertyAccess = async (property) => {
  assert.ok(property != undefined);
  const questions = [
    {
      type: "select",
      name: "write",
      message: "VehiclePropertyWritePermission",
      choices: createChoices(Perms, 2),
      initial: property.perms | [],
    },
    {
      type: "select",
      name: "read",
      message: "VehiclePropertyReadPermission",
      choices: createChoices(Perms, 2),
      initial: property.perms | [],
    },
    {
      type: "select",
      name: "mode",
      message: "VehiclePropertyChangeMode",
      choices: createChoices(Types.VehiclePropertyChangeMode, 2),
      initial: property.mode | Types.VehiclePropertyChangeMode.ON_CHANGE,
    },
  ];
  const answers = await prompt(questions);
  property.mode = parseInt(answers.mode, 16);
  const perms = [answers.write.trim(), answers.read.trim()].map(
    (key) => Perms[key]
  );
  if (perms[0].length > 0 && perms[0] === perms[1]) {
    perms[1] = "-";
  }
  property.perms = perms;
  //property.perms decide property.access
  property.access = [
    Types.VehiclePropertyAccess.WRITE,
    Types.VehiclePropertyAccess.READ,
  ]
    .map((e, index) => {
      return perms[index].length > 0 ? e : Types.VehiclePropertyAccess.NONE;
    })
    .reduce((acc, cur) => {
      return (acc |= cur);
    });
};

/**
 * @param {*} property area owner property
 * @param {*} access [Types.VehiclePropertyAccess.READ | Types.VehiclePropertyAccess.WRITE]
 */
const areaId = async (property, access = Types.VehiclePropertyAccess.READ) => {
  assert.ok(property != undefined && access != undefined);
  assert.ok(property.id != undefined && property.id > 0, "bad property id");
  assert.ok(
    access == Types.VehiclePropertyAccess.READ ||
      access ||
      Types.VehiclePropertyAccess.WRITE,
    "not support area access type"
  );
  property.areas = property.areas || {};

  const type = property.id & Types.VehicleArea.MASK;
  const area = property.areas[access] || {};
  area.id = area.id || 0;
  const areas = Types.VehicleAreaMap[type] || {};
  if (Object.keys(areas).length == 0) {
    const questions = [
      {
        type: "input",
        name: "id",
        message: "VehicleAreaGlobal(0x0001-0xFFFF)",
        initial: Format.textHexInt(area.id || Types.VehicleAreaGlobal.INIT, 4),
        validate: (e) => {
          return Format.HEX_INT16_REGEX.test(e) || "bad global area";
        },
      },
    ];
    const answers = await prompt(questions);
    area.id = Types.createAreaId(Format.parseHexInt(answers.id));
  } else {
    const group = Object.keys(Types.VehicleArea).find(
      (key) => Types.VehicleArea[key] == type
    );
    const selects = Object.keys(areas)
      .filter((key) => (areas[key] & area.id) == areas[key])
      .map((key) => Format.textHexInt(areas[key], 8));
    const questions = [
      {
        type: "multiselect",
        name: "value",
        message: `VehicleArea for ${group}(space select, enter done)`,
        choices: createChoices(areas, 8),
        initial: selects,
      },
    ];
    const answers = await prompt(questions);
    const values = answers.value.map((e) => Format.parseHexInt(e));
    area.id = Types.createAreaId(...values);
  }
  property.areas[access] = Object.assign(area);
};

const areaConfig = async (area) => {
  assert.ok(area != undefined, "config bad area");
  const questions = [
    {
      type: "select",
      name: "domain",
      message: "CAN domain",
      choices: createChoices(Domain, 2),
      initial: Format.textHexInt(area.domain || "", 2),
    },
    {
      type: "input",
      name: "name",
      message: `CAN signal name(${Format.PROPERTY_NAME_FORMAT_HINT})`,
      initial: area.name || "",
      validate: (e) => {
        return Format.PROPERTY_NAME_REGEX.test(e) || "bad signal name";
      },
    },
    {
      type: "number",
      name: "pos",
      message: "CAN signal start pos(0,63)",
      initial: area.pos || 0,
      validate: (e) => {
        return (e >= 0 && e < 64) || "bad area pos value";
      },
    },
    {
      type: "number",
      name: "size",
      message: "CAN signal data size(1,63)",
      initial: area.size || 1,
      validate: (e) => {
        return (e > 0 && e < 64) || "bad area size value";
      },
    },
    {
      type: "input",
      name: "mapping",
      message: `CAN signal mapping(option, ${Format.AREA_VALUE_MAPPING_FORMAT_HINT})`,
      initial: area.mapping || "",
      validate: (e) => {
        return (
          e.length == 0 || Format.AREA_VALUE_MAPPING_REGEX.test(e) || "bad area mapping value"
        );
      },
    },
  ];
  const answers = await prompt(questions);
  assert(answers.pos + answers.size <= 64, "bad CAN data size");
  area.domain = answers.domain;
  area.name = answers.name;
  area.pos = answers.pos;
  area.size = answers.size;
  area.mapping = answers.mapping;
};

const areaMath = async (area) => {
  const questions = [
    {
      type: "input",
      name: "factor",
      message: "CAN signal factor(option)",
      initial: area.factor || "",
    },
    {
      type: "input",
      name: "max",
      message: "CAN signal max(option)",
      initial: area.max || "",
    },
    {
      type: "input",
      name: "min",
      message: "CAN signal min(option)",
      initial: area.min || "",
    },
    {
      type: "input",
      name: "offset",
      message: "CAN signal offset(option)",
      initial: area.offset || "",
    },
  ];
  const answers = await prompt(questions);
  const values = Object.keys(answers).reduce((acc, cur) => {
    const text = answers[cur];
    if (text == undefined || text.length <= 0) return acc;
    const number = parseFloat(text);
    if (number == NaN || number == undefined) return acc;
    acc[cur] = number;
    return acc;
  }, {});
  Object.keys(values).forEach((key) => {
    area[key] = values[key];
  });
};

const polling = async () => {
  const questions = [
    {
      type: "input",
      name: "value",
      message: `input command`,
      initial: 'help',
      choices: Object.keys(Command.Actions).map((key) => {
        return { name: key };
      }),
    },
  ];
  const value = (await prompt(questions)).value.trim();
  const [key, ...args] = value.trim().split(/\s+/);
  try {
    await Command.Actions[key].action(...args);
  } catch (err) {
    console.error("command polling err:", err);
  }
  return Command.broken();
};

const filePath = async () => {
  const questions = [
    {
      type: "input",
      name: "value",
      message: `choose file path`,
    },
  ];
  return (await prompt(questions)).value.trim();
};

export default {
  propertyName,
  propertyId,
  propertyAccess,
  areaId,
  areaConfig,
  areaMath,
  polling,
  filePath,
};
