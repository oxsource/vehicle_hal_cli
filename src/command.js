import chalk from "chalk";
import fs from "fs";
import path from "path";
import Prompts from "./prompt.js";
import Format from "./format.js";
import Types from "./types.js";
import Perms from "./perms.js";
import Domain from "./domain.js";
import Xml from "./xml.js";

const UTF8 = "utf8";
const DEFAULT_CONFIG_CACHE = './config/cache.json';
const DEFAULT_CONFIG_DOMAIN = './config/domain.json';
const DEFAULT_CONFIG_PERMS = './config/perms.json';

const ACTION_CLEAR = "clear";

const gContext = {
  values: [],
  property: undefined,
  area: undefined,
  quit: false,
  suggest: 'load',
};

const help = () => {
  const value = Object.keys(Actions)
    .map((key) => Actions[key].text)
    .join("\n");
  console.log(chalk.blackBright(value) + "\n");
};

const setup = async () => {
  console.log('Command setup');
  try {
    console.log(`load ${DEFAULT_CONFIG_DOMAIN}`);
    const dText = fs.readFileSync(DEFAULT_CONFIG_DOMAIN, UTF8);
    Domain.setup(Array.from(JSON.parse(dText)));
    //
    console.log(`load ${DEFAULT_CONFIG_PERMS}`);
    const pText = fs.readFileSync(DEFAULT_CONFIG_PERMS, UTF8);
    Perms.setup(Array.from(JSON.parse(pText)));

    await select(ACTION_CLEAR);
    console.log(`setup success: ${Domain.values().length} domain, ${Perms.values().length} perms`);
    gContext.suggest = 'load';
  } catch (err) {
    console.error("setup error:", err);
    await quit();
  }
}

const load = async () => {
  try {
    console.log(`load ${DEFAULT_CONFIG_CACHE}`);
    if (fs.existsSync(DEFAULT_CONFIG_CACHE)) {
      const text = fs.readFileSync(DEFAULT_CONFIG_CACHE, UTF8);
      gContext.values = JSON.parse(text);
    } else {
      console.log(chalk.red(`${DEFAULT_CONFIG_CACHE} not exist`));
      gContext.values = [];
    }
    await select(ACTION_CLEAR);
    console.log(`load success: ${gContext.values.length} properties`);
    gContext.suggest = 'list';
  } catch (err) {
    console.error("load file error:", err);
  }
};

const save = async () => {
  try {
    const dir = path.dirname(DEFAULT_CONFIG_CACHE);
    !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
    const text = JSON.stringify(gContext.values);
    fs.writeFileSync(DEFAULT_CONFIG_CACHE, text, UTF8);
    console.log(`save ${DEFAULT_CONFIG_CACHE} success.`);
    gContext.suggest = 'size';
  } catch (err) {
    console.error("save to file error:", err);
  }
};

const list = async (offset = undefined, size = undefined) => {
  const values = [];
  const message = [];
  if (gContext.property) {
    const property = gContext.property;
    values.push(...(property.areas || []));
    message.push(`list ${property.id} areas`);
  } else {
    values.push(...gContext.values);
    message.push(`list all property`);
  }
  offset = parseInt(offset) || 0, size = parseInt(size) || values.length;
  if (offset < 0 || size < 0) {
    console.log(chalk.red(`list bad offset ${offset} size ${size}`));
    return;
  }
  const sIndex = Math.min(offset, values.length);
  const eIndex = Math.min(sIndex + size, values.length);
  console.log(chalk.cyan(message.join()));
  const line = obj => {
    return ['id', 'name'].map(key => obj[key] && `${key}: ${obj[key]}`)
      .filter(v => v != undefined)
      .join(', ');
  };
  console.table(values.slice(sIndex, eIndex).map(line));
  gContext.suggest = values.length > 0 ? 'select' : 'create';
};

const size = async () => {
  const property = gContext.property;
  const values = property ? property.areas : gContext.values;
  const desc = property ? `property ${property.id} area` : 'all property';
  console.log(chalk.cyan(`${desc} size: ${values.length}`));
  gContext.suggest = 'list';
};

const select = async (intent) => {
  if (ACTION_CLEAR == intent) {
    gContext.property = undefined;
    gContext.area = undefined;
    console.log(chalk.cyan('select clear.'));
  } else if (gContext.property) {
    //intent as area id
    const values = gContext.property.areas || [];
    const value = values.find(e => e.id == intent);
    gContext.area = value || gContext.area;
    console.log(chalk.cyan(`select area index ${intent} ${value ? "ok" : "fail"}`));
  } else {
    //intent as property id
    const value = gContext.values.find(e => e.id == intent);
    gContext.property = value || gContext.property;
    gContext.area = value ? undefined : gContext.area;
    console.log(chalk.cyan(`select property id ${intent} ${value ? "ok" : "fail"}`));
  }
  gContext.suggest = 'view';
};

const makeProperty = async (property) => {
  const title = property.id ? 'update' : 'create';
  console.log(chalk.cyan(`${title} property`));
  //caculate recommand property id(last element)
  const values = gContext.values;
  const pid = values.length > 0 ? values[values.length - 1].id : undefined;
  await Prompts.propertyId(property, pid);
  //check property exist
  const exist = values.find((e) => e.id == property.id);
  if (exist && exist != property) {
    const msg = `${title} property id ${property.id} has exist.`;
    console.log(chalk.red(msg));
    return false;
  }
  await Prompts.propertyAccess(property);
  console.log(chalk.cyan(`${title} property success.`));
  dump(property, undefined);
  return true;
};

const makeArea = async (property, area) => {
  const title = area.id ? 'update' : 'create';
  console.log(chalk.cyan(`${title} area for property ${property.id}`));
  //check area exist
  property.areas = property.areas || [];
  await Prompts.areaName(area);
  await Prompts.areaId(property, area);
  await Prompts.areaConfig(area);
  const exist = property.areas.find(el => el.id == area.id);
  if (exist && exist != area) {
    const msg = `${title} area ${area.id} has exist.`;
    console.log(chalk.red(msg));
    return false;
  }
  if (Format.isCANProperty(property.id)) {
    const cleanAreaMath = (e) => {
      delete e.factor;
      delete e.max;
      delete e.min;
      delete e.offset;
    };
    //area actions(SET or GET)
    for (const access of [Types.VehiclePropertyAccess.READ, Types.VehiclePropertyAccess.WRITE]) {
      if ((Format.parseHexInt(property.access) & access) != access) continue;
      const name = Types.descVehiclePropertyAccess(access);
      console.log(chalk.cyan(`${title} ${name} action for area`));
      const action = area[access] || {};
      action.label = name;
      await Prompts.actionConfig(action, access);
      if (!action.mapping || action.mapping.length <= 0) {
        await Prompts.actionMath(action);
      } else {
        cleanAreaMath(action);
      }
      area[access] = action;
    }
  }
  console.log(chalk.cyan(`${title} area finish.`));
  dump(undefined, area);
  return true;
};

const create = async () => {
  if (!gContext.property) {
    const property = {};
    if (!await makeProperty(property)) return;
    gContext.values.push(property);
    gContext.suggest = 'select';
  } else {
    const area = {};
    if (!await makeArea(gContext.property, area)) return;
    gContext.property.areas.push(area);
    gContext.suggest = 'save';
  }
};

const dump = async (property = undefined, area = undefined) => {
  const packet = {
    property: property || gContext.property,
    area: area || gContext.area,
  };
  if (packet.area) {
    console.log(chalk.green("dump area"));
    const values = Types.WRVehiclePropertyAccess.map(access => packet.area[access]).filter(e => e != undefined);
    const dumpy = values.length == 0 ? packet.area : values;
    console.table(dumpy);
  } else if (packet.property) {
    console.log(chalk.green("dump property"));
    const value = {
      id: packet.property.id,
      mode: packet.property.mode,
      perms: Perms.line(packet.property.perms),
      access: packet.property.access,
    };
    console.table(value);
  } else {
    console.log(chalk.red("dump nothing."));
  }
  gContext.suggest = !property && !area ? 'save' : gContext.suggest;
};

const update = async () => {
  if (!gContext.property) {
    console.log(chalk.red("update no target"));
    gContext.suggest = 'select';
    return;
  }
  const values = [];
  if (!gContext.area) {
    if (!await makeProperty(gContext.property)) return;
    values.push(...(gContext.property.areas || []));
  } else {
    values.push(gContext.area);
  }
  for (const value of values) {
    await makeArea(gContext.property, value);
  }
  gContext.suggest = 'save';
};

const remove = async () => {
  if (!gContext.property) {
    console.log("there is no select property");
    gContext.suggest = 'select';
    return;
  }
  const property = gContext.property;
  if (gContext.area) {
    const index = property.areas.indexOf(gContext.area);
    if (index >= 0) property.areas.splice(index, 1);
    console.log(`area ${gContext.area.id} removed.`);
    gContext.area = undefined;
  } else {
    const index = gContext.values.indexOf(gContext.property);
    if (index >= 0) gContext.values.splice(index, 1);
    console.log(chalk.red(`property ${gContext.property.id} removed.`));
    gContext.property = undefined;
    gContext.area = undefined;
  }
  gContext.suggest = 'size';
};

const shrink = async () => {
  const values = gContext.values || [];
  const domains = Domain.names();
  const shrinks = [];
  gContext.values = values.filter((e) => {
    if (!Format.isCANProperty(e.id) || e.areas == undefined) return true;
    return Array.from(e.areas).filter(area => {
      const flags = Types.WRVehiclePropertyAccess.map(access => {
        const action = area[access];
        if (!action || action.domain == undefined) return undefined;
        if (domains.includes(action.domain)) return true;
        delete area[access];
        shrinks.push(`${action.name}@${action.domain}`);
        return false;
      }).filter(e => e != undefined);
      return flags.length <= 0 || flags.reduce((acc, cur) => acc || cur);
    }).length > 0;
  });
  const total = values.length, count = gContext.values.length;
  console.log(`shrink property ${count}/${total}, actions: ${shrinks.length}`);
  if (shrinks.length <= 0) return;
  //save shrinks
  try {
    const dir = await Prompts.input('save shrinks files dir', "./outputs");
    if (!dir || dir.length <= 0) return console.log(chalk.red('bad shrinks save dir.'));
    !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
    const file = `${dir}/shrinks.json`
    const text = JSON.stringify(shrinks);
    fs.writeFileSync(file, text, UTF8);
    console.log(`save ${file} success.`);
  } catch (err) {
    console.error("save to shrink file error:", err);
  }
};

const xml = async () => {
  //save dir
  const dir = await Prompts.input('save xml files dir', "./outputs");
  if (!dir || dir.length <= 0) return console.log(chalk.red('bad xml config save dir.'));
  !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
  //version
  const version = await Prompts.input('xml config version name', '1.0.0');
  if (!version || version.length <= 0) return console.log(chalk.red('bad xml config version.'));
  //platform
  const platform = await Prompts.input('xml config platform name', 'qcom');
  if (!platform || platform.length <= 0) return console.log(chalk.red('bad xml config platform.'));
  //context
  const stamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  const context = {
    version,
    platform,
    values: gContext.values,
    author: "IT'S AUTO GENERAGTE BY VEHICLE_HAL_CLI",
    stamp: stamp(),
  };
  const hal = Xml.createHalProps(context);
  const can = Xml.createCanProps(context);
  try {
    fs.writeFileSync(`${dir}/automotive_vehicle_hal_props.xml`, hal);
    fs.writeFileSync(`${dir}/automotive_vehicle_can_props.xml`, can);
    console.log(chalk.cyan(`export to xml success.`));
  } catch (err) {
    console.error("save xml to file error:", err);
  }
};

const quit = async () => {
  gContext.quit = true;
  gContext.values = [];
  gContext.property = undefined;
  gContext.area = undefined;
  gContext.suggest = 'help';
};

const broken = () => gContext.quit;

const suggest = () => gContext.suggest;

const Actions = {
  help: { action: help, text: "help, help info;" },
  create: { action: create, text: "create, create a property or area;" },
  select: { action: select, text: "select, select property(id) or area(id) or clear;" },
  view: { action: dump, text: "view, view select property or area;" },
  list: { action: list, text: "list [offset] [size], list property or area;" },
  size: { action: size, text: "size, size of property or areas;" },
  update: { action: update, text: "update, update select property or area;" },
  remove: { action: remove, text: "remove, remove select property or area;" },
  load: { action: load, text: "load, load cache, domain, perms from config dir;" },
  save: { action: save, text: "save, save data into file;" },
  shrink: { action: shrink, text: "shrink, shrink data if domain not exist;" },
  xml: { action: xml, text: "xml, export as hal and can props xml;" },
  quit: { action: quit, text: "quit, exit;" },
};

export default {
  Actions,
  setup,
  broken,
  suggest,
  makeProperty,
  makeArea,
};
