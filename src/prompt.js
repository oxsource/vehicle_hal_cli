import assert from "assert";
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
    if (this.validate && this.validate(input) && !this.choices.find(choice => choice.message === input)) {
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

const setup = () => {
  enquirer.register('adviceinput', AdviceInput);
  console.log('Prompts setup');
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
      initial: Format.textHexInt(property.area || Types.VehicleArea.GLOBAL, 8),
    },
    {
      type: "input",
      name: "index",
      message: "VehiclePropertyIndex(0x0001-0xFFFF)",
      initial: Format.textHexInt(defaults.index, 4),
      validate: (e) => {
        console.log(`validate index: ${e}`);
        return Format.HEX_INT16_REGEX.test(e) || "bad property index";
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
  perms.defaults.forEach(e => Perms.append(e));
  perms.choices = createValueChoices(Perms.values(), Perms.PERM_CAR_INFO);
  const questions = [
    {
      type: "adviceinput",
      name: "write",
      limit: 3,
      message: "VehiclePropertyWritePermission",
      choices: perms.choices,
      initial: perms.defaults[0] || Perms.PERM_CAR_INFO,
    },
    {
      type: "adviceinput",
      name: "read",
      limit: 3,
      message: "VehiclePropertyReadPermission",
      choices: perms.choices,
      initial: perms.defaults[1] || Perms.PERM_CAR_INFO,
    },
    {
      type: "select",
      name: "mode",
      message: "VehiclePropertyChangeMode",
      choices: createChoices(Types.VehiclePropertyChangeMode, 2),
      initial: property.mode | Types.VehiclePropertyChangeMode.ON_CHANGE,
    },
  ];
  const answers = await enquirer.prompt(questions);
  console.log(answers);
  property.mode = answers.mode;
  property.perms = Perms.group(answers.write, answers.read);
  //update permissions suggestions
  [answers.write, answers.read].map(e => e.trim()).forEach(e => Perms.append(e));
  //property.perms decide property.access
  const access = [
    Types.VehiclePropertyAccess.WRITE,
    Types.VehiclePropertyAccess.READ,
  ].map((e, index) => {
    return property.perms[index].length > 0 ? e : Types.VehiclePropertyAccess.NONE;
  }).reduce((acc, cur) => {
    return (acc |= cur);
  });
  property.access = Format.textHexInt(access, 2);
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
          return Format.HEX_INT16_REGEX.test(e) || "bad global area";
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
      .filter((key) => (areaTypes[key] & areaId) == areaTypes[key])
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

const actionConfig = async (action) => {
  assert.ok(action != undefined, "config bad action");
  Domain.append(action.domain);
  const questions = [
    {
      type: "adviceinput",
      name: "domain",
      limit: 3,
      message: "action domain",
      choices: createValueChoices(Domain.values(), Domain.TEMPLATE),
      initial: action.domain || Domain.TEMPLATE,
      validate: (e) => {
        return e.length == 0 || Format.CAN_DOMAIN_REGEX.test(e) || "bad domain format";
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
      initial: action.pos || 0,
      validate: (e) => {
        return (e >= 0 && e < Format.CAN_SIGNAL_MAX_BIT) || "bad action pos value";
      },
    },
    {
      type: "number",
      name: "size",
      message: "action signal data size(1,63)",
      initial: action.size || 1,
      validate: (e) => {
        return (e > 0 && e < Format.CAN_SIGNAL_MAX_BIT) || "bad action size value";
      },
    },
    {
      type: "input",
      name: "mapping",
      message: `action signal mapping(option, ${Format.AREA_VALUE_MAPPING_FORMAT_HINT})`,
      initial: action.mapping || "",
      validate: (e) => {
        return (
          e.trim().length == 0 ||
          Format.AREA_VALUE_MAPPING_REGEX.test(e) ||
          "bad action mapping value"
        );
      },
    },
  ];
  const answers = await enquirer.prompt(questions);
  assert(answers.pos + answers.size <= Format.CAN_SIGNAL_MAX_BIT, "bad action data size");
  action.domain = Format.trim(answers.domain);
  action.name = Format.trim(answers.name);
  action.pos = answers.pos;
  action.size = answers.size;
  action.mapping = Format.trim(answers.mapping);
  // //update domains suggestions
  Domain.append(action.domain);
};

const actionMath = async (action) => {
  const validate = (e) => {
    return e && e.trim().length == 0 || Format.FLOAT_NUMBER_REGEX.test(e) || 'bad number format.';
  };
  const questions = [
    {
      type: "input",
      name: "factor",
      message: "action signal factor(option)",
      initial: action.factor || ' ',
      validate,
    },
    {
      type: "input",
      name: "max",
      message: "action signal max(option)",
      initial: action.max || ' ',
      validate,
    },
    {
      type: "input",
      name: "min",
      message: "action signal min(option)",
      initial: action.min || ' ',
      validate,
    },
    {
      type: "input",
      name: "offset",
      message: "action signal offset(option)",
      initial: action.offset || ' ',
      validate,
    },
  ];
  delete action.mapping;
  const answers = await enquirer.prompt(questions);
  ['factor', 'max', 'min', 'offset'].forEach(key => {
    const text = (answers[key] || '').trim();
    if (text.length == 0) return;
    action[key] = parseFloat(text);
  })
};

const polling = async () => {
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
  return Command.broken();
};

const inputFile = async (recommand = '') => {
  const questions = [
    {
      type: "input",
      name: "value",
      message: `input file path`,
      initial: recommand,
    },
  ];
  return (await enquirer.prompt(questions)).value.trim();
};

export default {
  setup,
  propertyId,
  propertyAccess,
  areaName,
  areaId,
  actionConfig,
  actionMath,
  polling,
  inputFile,
};
