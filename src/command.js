import chalk from "chalk";
import fs from "fs";
import Prompts from "./prompt.js";
import Format from "./format.js";
import Types from "./types.js";
import Perms from "./perms.js";
import Domain from "./domain.js";

const UTF8 = "utf8";
const DEFAULT_CONFIG_FILE = './config/cache.json';

const gContext = {
  values: [],
  property: undefined,
  area: undefined,
  quit: false,
  file: undefined,
  suggest: 'load',
};

const help = () => {
  const value = Object.keys(Actions)
    .map((key) => Actions[key].text)
    .join("\n");
  console.log(chalk.blackBright(value) + "\n");
};

const load = async () => {
  try {
    gContext.file = await Prompts.inputFile(gContext.file || DEFAULT_CONFIG_FILE);
    const text = fs.readFileSync(gContext.file, UTF8);
    const context = JSON.parse(text);
    gContext.values = context.values;
    Array.from(context.domains).forEach(e => Domain.append(e));
    Array.from(context.permissions).forEach(e => Perms.append(e));
    console.log(`load ${gContext.file} ${gContext.values.length} properties`);
    gContext.suggest = 'list';
  } catch (err) {
    console.error("load file error:", err);
  }
};

const save = async () => {
  try {
    gContext.file = await Prompts.inputFile(gContext.file);
    const context = {
      values: gContext.values,
      file: gContext.file,
      domains: Domain.values(),
      permissions: Perms.values(),
    };
    const text = JSON.stringify(context);
    fs.writeFileSync(gContext.file, text, UTF8);
    console.log(`save ${gContext.file} success.`);
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
  offset = offset || 0, size = size || values.length;
  if (offset < 0 || size < 0) {
    console.log(chalk.red(`list bad offset ${offset} size ${size}`));
    return;
  }
  const sIndex = Math.min(offset, values.length);
  const eIndex = Math.min(sIndex + size, values.length);
  console.log(chalk.cyan(message.join()));
  console.table(values.slice(sIndex, eIndex).map(e => `id: ${e.id}, name: ${e.name}`));
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
  if ('clear' == intent) {
    gContext.property = undefined;
    gContext.area = undefined;
    console.log(chalk.cyan('select clear.'));
  } else if (gContext.property) {
    //intent as area index
    const index = parseInt(intent) || 0;
    const values = gContext.property.areas || [];
    const value = index >= 0 && index < values.length && values[index];
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
  await Prompts.propertyName(property);
  //caculate recommand property id(last element)
  const values = gContext.values;
  const pid = values.length > 0 ? values[values.length - 1].id : undefined;
  await Prompts.propertyId(property, pid);
  //check property exist
  if (values.find((e) => e.id == property.id)) {
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
  if (property.areas.find(el => (el[access] || {}).id == area.id)) {
    const msg = `${title} area ${area.id} has exist.`;
    console.log(chalk.red(msg));
    return false;
  }
  const cleanAreaMath = (e) => {
    delete e.factor;
    delete e.max;
    delete e.min;
    delete e.offset;
  };
  //area actions(SET or GET)
  for (const access of [Types.VehiclePropertyAccess.READ, Types.VehiclePropertyAccess.WRITE]) {
    if ((Format.parseHexInt(property.access) & access) != access) return null;
    const name = Types.descVehiclePropertyAccess(access);
    console.log(chalk.cyan(`${title} ${name} action for area`));
    const action = area[access] || {};
    await Prompts.actionConfig(action);
    if (!action.mapping || action.mapping.length <= 0) {
      await Prompts.actionMath(action);
    } else {
      cleanAreaMath(action);
    }
    area[access] = action;
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
  } else {
    const area = {};
    if (!await makeArea(gContext.property, area)) return;
    gContext.property.areas.push(area);
    console.log(`gContext.property.areas size: ${gContext.property.areas.length}`);
  }
  gContext.suggest = 'save';
};

const dump = async (property = undefined, area = undefined) => {
  const packet = {
    property: property || gContext.property,
    area: area || gContext.area,
  };
  if (packet.area) {
    console.log(chalk.green("dump area"));
    const values = [
      Types.VehiclePropertyAccess.READ,
      Types.VehiclePropertyAccess.WRITE,
    ].map(access => packet.area[access]).filter(e => e != undefined);
    console.table(values);
  } else if (packet.property) {
    console.log(chalk.green("dump property"));
    const value = {
      id: packet.property.id,
      name: packet.property.name,
      mode: packet.property.mode,
      perms: packet.property.perms.join(","),
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

const quit = () => {
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
  select: { action: select, text: "select, select property(id) or area(index) or clear;" },
  view: { action: dump, text: "view, view select property or area;" },
  list: { action: list, text: "list [offset] [size], list property or area;" },
  size: { action: size, text: "size, size of property or areas;" },
  update: { action: update, text: "update, update select property or area;" },
  remove: { action: remove, text: "remove, remove select property or area;" },
  load: { action: load, text: "load, load data from file;" },
  save: { action: save, text: "save, save data into file;" },
  quit: { action: quit, text: "quit, exit;" },
};

export default {
  Actions,
  broken,
  suggest,
  makeProperty,
  makeArea,
};
