import assert from "assert";
import chalk from "chalk";
import Enquirer from "enquirer";
import Types from "./types.js";
import Perms from "./perms.js";
import Domain from "./domain.js";
import Format from "./format.js";
import Command from "./command.js";

const { AutoComplete } = Enquirer;
const enquirer = new Enquirer();

class AdviceInput extends AutoComplete {
  constructor(options) {
    super(options);
    this.input = options.initial || '';
    this.cursor = this.input.length;
  }

  // Override the submit method to handle custom input
  async submit() {
    if (this.state.submitted) return this.base.submit.call(this);
    const { input } = this.state;
    if (this.validate && this.validate(input) === true && !this.choices.find(choice => choice.message === input)) {
      // If the input is not in the choices, create a new choice
      // this.choices.push({ name: value, message: value });
      // this.select(this.choices.length - 1);
      this.choices.push({ name: input, message: input, value: input });
      this.index = this.choices.length - 1; // Set the index to the new choice
    }
    return super.submit();
  }

  async render() {
    try {
      await super.render();
      this.fallbackInput = this.input;
    } catch (error) {
      //ignore render regex issue(fallback or empty)
      this.input = this.fallbackInput || '';
      await super.render();
    }
  }

  async keypress(input, event) {
    if (event.name === 'tab') {
      const match = this.choices.find(choice => choice.message.startsWith(this.input));
      if (!match) return;
      this.input = match.message;
      this.cursor = this.input.length;
      this.render();
    } else {
      await super.keypress(input, event);
    }
  }

}

const setup = async () => {
  console.log('Prompts setup');
  enquirer.register('adviceinput', AdviceInput);
  await Command.setup();
}

const createChoices = (object, length = 1) => {
  return Object.keys(object)
    .filter((key) => key != Format.KEY_MASK)
    .map((key) => {
      const value = Format.textHexInt(object[key], length);
      return { name: value, message: key, value };
    });
};

const createValueChoices = (object, ...defaults) => {
  const values = Object.values(object);
  return (values.length > 0 ? values : [...defaults]).map(e => {
    return { name: e, message: e, value: e };
  });
};

const propertyId = async (property, recommand = undefined) => {
  assert.ok(property != undefined);
  const pid = Format.parseHexInt(property.id || recommand);
  const defaults = {};
  defaults.group = pid > 0 ? pid & Types.VehiclePropertyGroup.MASK : Types.VehiclePropertyGroup.VENDOR;
  defaults.type = pid > 0 ? pid & Types.VehiclePropertyType.MASK : Types.VehiclePropertyType.INT32;
  defaults.index = pid > 0 ? pid & Types.VehiclePropertyIndex.MASK : Types.VehiclePropertyIndex.INIT;
  defaults.area = pid > 0 ? pid & Types.VehicleArea.MASK : Types.VehicleArea.GLOBAL;
  const questions = [
    {
      type: "select",
      name: "group",
      message: "VehiclePropertyGroup",
      choices: createChoices(Types.VehiclePropertyGroup, 8),
      initial: Format.textHexInt(defaults.group, 8),
    },
    {
      type: "select",
      name: "type",
      message: "VehiclePropertyType",
      choices: createChoices(Types.VehiclePropertyType, 8),
      initial: Format.textHexInt(defaults.type, 8),
    },
    {
      type: "select",
      name: "area",
      message: "VehicleArea",
      choices: createChoices(Types.VehicleArea, 8),
      initial: Format.textHexInt(defaults.area, 8),
    },
    {
      type: "input",
      name: "index",
      message: "VehiclePropertyIndex(0x0001-0xFFFF)",
      initial: Format.textHexInt(defaults.index, 4),
      validate: (e) => {
        return Format.HEX_INT32_REGEX.test(e) || "bad property index";
      },
    },
  ];
  const answers = await enquirer.prompt(questions);
  const values = ['group', 'type', 'area', 'index'].map(key => {
    return Format.parseHexInt(answers[key]) || 0;
  });
  property.id = Format.textHexInt(Types.createPropertyId(...values), 8);
};

const propertyAccess = async (property) => {
  assert.ok(property != undefined);
  const perms = {}
  perms.defaults = Perms.split(property);
  perms.choices = createValueChoices(Perms.values());
  const questions = [
    {
      type: "adviceinput",
      name: "read",
      limit: 3,
      message: `VehiclePropertyReadPermission(${Perms.TEMPLATE}, option)`,
      choices: perms.choices,
      initial: Format.nonNull(perms.defaults[0], Format.OPTION_INPUT),
      validate: (e) => {
        return e.trim().length == 0 || Perms.values().includes(e) || 'bad read permission';
      },
    },
    {
      type: "adviceinput",
      name: "write",
      limit: 3,
      message: `VehiclePropertyWritePermission(${Perms.TEMPLATE}, option)`,
      choices: perms.choices,
      initial: Format.nonNull(perms.defaults[0], Format.OPTION_INPUT),
      validate: (e) => {
        return e.trim().length == 0 || Perms.values().includes(e) || 'bad write permission';
      },
    },
    {
      type: "select",
      name: "mode",
      message: "VehiclePropertyChangeMode",
      choices: createChoices(Types.VehiclePropertyChangeMode, 2),
      initial: property.mode | Types.VehiclePropertyChangeMode.ON_CHANGE,
    },
    {
      type: "input",
      name: "configArray",
      message: "VehiclePropertyConfig(eg.0x01,0x02)",
      initial: property.configArray || '',
    },
  ];
  const answers = await enquirer.prompt(questions);
  if (answers.write.trim().length == 0 && answers.read.trim().length == 0) {
    console.log(chalk.red("read and write permission can't be both empty.\n"));
    return await propertyAccess(property);
  }
  property.mode = answers.mode;
  property.perms = Perms.group(answers.write, answers.read);
  //property.perms decide property.access
  const access = Types.WRVehiclePropertyAccess.map((e, index) => {
    return property.perms[index].length > 0 ? e : Types.VehiclePropertyAccess.NONE;
  }).reduce((acc, cur) => {
    return (acc |= cur);
  });
  property.access = Format.textHexInt(access, 2);
  //configArray
  property.configArray = answers.configArray;
};

const areaName = async (area) => {
  assert.ok(area != undefined);
  const questions = [
    {
      type: "input",
      name: "name",
      message: `AreaName(${Format.PROPERTY_NAME_FORMAT_HINT})`,
      initial: area.name || "",
      validate: (e) => {
        return Format.PROPERTY_NAME_REGEX.test(e) || "bad area name";
      },
    },
  ];
  area.name = (await enquirer.prompt(questions)).name.trim();
};

const areaId = async (property, area) => {
  assert.ok(property != undefined && property.id != undefined, "bad property id");
  const type = Format.parseHexInt(property.id) & Types.VehicleArea.MASK;
  const areaTypes = Types.VehicleAreaMap[type] || {};
  const factors = [];
  if (Object.keys(areaTypes).length == 0) {
    //via global index
    const questions = [
      {
        type: "input",
        name: "id",
        message: "VehicleAreaGlobalIndex(0x0001-0xFFFF)",
        initial: area.id || Format.textHexInt(Types.VehicleAreaGlobal.INIT, 4),
        validate: (e) => {
          return Format.HEX_INT32_REGEX.test(e) || "bad global area";
        },
      },
    ];
    const answers = await enquirer.prompt(questions);
    factors.push(Format.parseHexInt(answers.id));
  } else {
    //via area type
    const group = Object.keys(Types.VehicleArea).find(
      (key) => Types.VehicleArea[key] == type
    );
    const selects = Object.keys(areaTypes)
      .filter((key) => (areaTypes[key] & area.id) == areaTypes[key])
      .map((key) => Format.textHexInt(areaTypes[key], 8));
    const questions = [
      {
        type: "multiselect",
        name: "value",
        message: `VehicleArea for ${group}(space select, enter done)`,
        choices: createChoices(areaTypes, 8),
        initial: selects,
      },
    ];
    const answers = await enquirer.prompt(questions);
    factors.push(...answers.value.map((e) => Format.parseHexInt(e)));
  }
  area.id = Format.textHexInt(Types.createAreaId(...factors), 2);
};

const areaConfig = async (area) => {
  assert.ok(area != undefined, "bad area");
  const validate = (e) => {
    return e && e.trim().length == 0 || Format.FLOAT_NUMBER_REGEX.test(e) || 'bad number format.';
  };
  const questions = [
    {
      type: "input",
      name: "max",
      message: "area hal value max(option)",
      initial: Format.nonNull(area.max, Format.OPTION_INPUT),
      validate,
    },
    {
      type: "input",
      name: "min",
      message: "area hal value min(option)",
      initial: Format.nonNull(area.min, Format.OPTION_INPUT),
      validate,
    },
  ];
  const answers = await enquirer.prompt(questions);
  ['max', 'min'].forEach(key => {
    const text = (answers[key] || '').trim();
    if (text.length == 0) return;
    area[key] = parseFloat(text);
  });
};

const actionConfig = async (action, access) => {
  assert.ok(action != undefined, "config bad action");
  const questions = [
    {
      type: "adviceinput",
      name: "domain",
      limit: 3,
      message: "action domain",
      choices: createValueChoices(Domain.names()),
      initial: Format.nonNull(action.domain, Domain.TEMPLATE),
      validate: (e) => {
        return Domain.names().includes(e) || "bad domain format";
      },
    },
    {
      type: "input",
      name: "name",
      message: `action signal name(${Format.PROPERTY_NAME_FORMAT_HINT})`,
      initial: action.name || "action_signal",
      validate: (e) => {
        return Format.PROPERTY_NAME_REGEX.test(e) || "bad signal name";
      },
    },
    {
      type: "number",
      name: "pos",
      message: "action signal start pos(0,63)",
      initial: Format.nonNull(action.pos, 0),
      validate: (e) => {
        return (e >= 0 && e < Format.CAN_SIGNAL_MAX_BIT) || "bad action pos value";
      },
    },
    {
      type: "number",
      name: "size",
      message: "action signal data size(1,63)",
      initial: Format.nonNull(action.size, 1),
      validate: (e) => {
        return (e > 0 && e < Format.CAN_SIGNAL_MAX_BIT) || "bad action size value";
      },
    },
  ];
  if (access == Types.VehiclePropertyAccess.WRITE) {
    //config invalid value for CAN event type(diff reset)
    questions.push({
      type: "input",
      name: "invalid",
      message: "action signal invalid value(option: 0x00000000-0xFFFFFFFF)",
      initial: Format.nonNull(action.invalid, Format.OPTION_INPUT),
      validate: (e) => {
        return e.trim().length == 0 || Format.HEX_INT64_REGEX.test(e) || "bad action invalid value";
      },
    });
  }
  const answers = await enquirer.prompt(questions);
  action.domain = Format.trim(answers.domain);

  const domain = Domain.values().find(e => e.name == answers.domain);
  const u64Pos = (domain.little === true) ? answers.pos : (7 - (answers.pos / 8)) * 8 + (answers.pos % 8);
  assert(u64Pos + answers.size <= Format.CAN_SIGNAL_MAX_BIT, "bad action data size");

  action.name = Format.trim(answers.name);
  action.pos = answers.pos;
  action.size = answers.size;
  if (access == Types.VehiclePropertyAccess.WRITE) {
    const invalid = answers.invalid.trim();
    if (invalid.length > 0) action.invalid = answers.invalid;
  }
};

const actionTransform = async (action) => {
  const keys = ['eval', 'mapping','factor', 'max', 'min', 'offset'];
  const clean = (match) => {
    keys.forEach(key => match(key) && (delete action[key]));
  };
  //eval
  action.eval = (await enquirer.prompt([{
    type: "input",
    name: "eval",
    message: "action signal eval script(option)",
    initial: Format.nonNull(action.eval, Format.OPTION_INPUT),
    validate: (e) => {
      return (e.trim().length == 0 || true);
    },
  }])).eval;
  action.eval = Format.trim(action.eval);
  if (action.eval.length > 0) {
    clean((e) => e !== 'eval');
    return;
  }
  //mapping
  action.mapping = (await enquirer.prompt([{
    type: "input",
    name: "mapping",
    message: `action signal mapping(option, ${Format.AREA_VALUE_MAPPING_FORMAT_HINT})`,
    initial: Format.nonNull(action.mapping, Format.OPTION_INPUT),
    validate: (e) => {
      return (
        e.trim().length == 0 ||
        Format.AREA_VALUE_MAPPING_REGEX.test(e) ||
        "bad action mapping value"
      );
    },
  }])).mapping;
  action.mapping = Format.trim(action.mapping);
  if (action.mapping.length > 0) {
    clean((e) => e !== 'mapping');
    return;
  }
  //math
  const validate = (e) => {
    return e && e.trim().length == 0 || Format.FLOAT_NUMBER_REGEX.test(e) || 'bad number format.';
  };
  const questions = [
    {
      type: "input",
      name: "factor",
      message: "action signal factor(option)",
      initial: Format.nonNull(action.factor, Format.OPTION_INPUT),
      validate,
    },
    {
      type: "input",
      name: "max",
      message: "action signal max(option)",
      initial: Format.nonNull(action.max, Format.OPTION_INPUT),
      validate,
    },
    {
      type: "input",
      name: "min",
      message: "action signal min(option)",
      initial: Format.nonNull(action.min, Format.OPTION_INPUT),
      validate,
    },
    {
      type: "input",
      name: "offset",
      message: "action signal offset(option)",
      initial: Format.nonNull(action.offset, Format.OPTION_INPUT),
      validate,
    },
  ];
  const answers = await enquirer.prompt(questions);
  clean((e) => e == 'mapping' || e == 'eval');
  ['factor', 'max', 'min', 'offset'].forEach(key => {
    const text = (answers[key] || '').trim();
    if (text.length == 0) return;
    action[key] = parseFloat(text);
  });
};

const polling = async () => {
  if (Command.broken()) return false;
  const questions = [
    {
      type: "input",
      name: "value",
      message: `input command`,
      initial: Command.suggest(),
    },
  ];
  const value = (await enquirer.prompt(questions)).value.trim();
  const [key, ...args] = value.trim().split(/\s+/);
  try {
    if (Object.keys(Command.Actions).includes(key)) {
      await Command.Actions[key].action(...args);
    }
  } catch (err) {
    console.error("command polling err:", err);
  }
  return !Command.broken();
};

const input = async (hints, recommand = '') => {
  const questions = [
    {
      type: "input",
      name: "value",
      message: hints || 'input args',
      initial: recommand,
    },
  ];
  return (await enquirer.prompt(questions)).value.trim();
};

const positive = async (hint) => {
  const YES = "YES";
  const choices = [YES, "NO"].map(key => {
    return {name: key, message: key, value: key};
  });
  const questions = [
    {
      type: "select",
      name: "value",
      message: hint || 'choose Y/N',
      choices,
      initial: YES,
    },
  ];
  const answers = await enquirer.prompt(questions);
  return answers.value == YES;
};

export default {
  setup,
  propertyId,
  propertyAccess,
  areaName,
  areaId,
  areaConfig,
  actionConfig,
  actionTransform,
  polling,
  input,
  positive,
};
