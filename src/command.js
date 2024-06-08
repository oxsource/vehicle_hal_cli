import chalk from "chalk";
import fs from "fs";
import Prompts from "./prompt.js";
import Format from "./format.js";
import Types from "./types.js";

const UTF8 = "utf8";

const globalContext = {
  values: [],
  property: undefined,
  area: undefined,
  quit: false,
};

const help = () => {
  const value = Object.keys(Actions)
    .map((key) => Actions[key].text)
    .join("\n");
  console.log(chalk.blackBright(value) + "\n");
};

const load = async () => {
  try {
    const file = await Prompts.filePath();
    console.log(`load file ${file}`);
    const text = fs.readFileSync(file, UTF8);
    globalContext.values = JSON.parse(text);
    console.log(`load success size: ${globalContext.values.length}`);
  } catch (err) {
    console.error("load file error:", err);
  }
};

const save = async () => {
  try {
    const file = await Prompts.filePath();
    console.log(`save file ${file}`);
    const text = JSON.stringify(globalContext.values);
    fs.writeFileSync(file, text, UTF8);
    console.log("save success.");
  } catch (err) {
    console.error("save to file error:", err);
  }
};

const list = async () => {
  if (globalContext.property) {
    const hexId = Format.textHexInt(globalContext.property.id);
    console.log(chalk.cyan(`list ${hexId} areas`));
    const values = Object.values(globalContext.property.areas).map(
      (e) => `area: ${e.id}, name: ${e.name}`
    );
    console.table(values);
  } else {
    console.log(chalk.cyan(`list all property`));
    const values = globalContext.values.map(
      (e) => `prop: ${Format.textHexInt(e.id)}, name: ${e.name}`
    );
    console.table(values);
  }
};

const property = async (hex) => {
  const id = Format.parseHexInt(hex);
  const property = globalContext.values.find((e) => e.id == id);
  if (property) {
    globalContext.property = property;
    globalContext.area = undefined;
  }
  const text = property ? "ok" : "fail";
  console.log(`switch to property ${hex} ${text}`);
};

const area = async (hex) => {
  const property = globalContext.property || {};
  const areas = property.areas || {};
  const area = Object.values(areas).find((e) => e.id == hex);
  if (area) {
    globalContext.area = area;
  }
  const text = area ? "ok" : "fail";
  console.log(`switch to area ${hex} ${text}`);
};

const create = async () => {
  const property = {};
  console.log(chalk.cyan("create property"));
  await Prompts.propertyName(property);
  await Prompts.propertyId(property);
  //check property exist
  const exist = globalContext.values.find((e) => e.id == property.id);
  if (exist != undefined) {
    const hexId = Format.textHexInt(property.id);
    const msg = `create property id: ${hexId} has exist.`;
    console.log(chalk.red(msg));
    return;
  }
  await Prompts.propertyAccess(property);
  dump(property, undefined);
  //create areas
  for (const e of [
    Types.VehiclePropertyAccess.READ,
    Types.VehiclePropertyAccess.WRITE,
  ]) {
    if ((property.access & e) != e) continue;
    console.log(
      chalk.cyan(`create area for access: ${Format.textHexInt(e, 2)}`)
    );
    await Prompts.areaId(property, e);
    const area = property.areas[e];
    await Prompts.areaConfig(area);
    if (!area.mapping || area.mapping.length <= 0) {
      await Prompts.areaMath(area);
    }
    dump(undefined, area);
  }
  globalContext.values.push(property);
};

const dump = async (property = undefined, area = undefined) => {
  const packet = {
    property: property || globalContext.property,
    area: area || globalContext.area,
  };
  if (packet.area) {
    console.log(chalk.green("dump area"));
    const value = Object.assign(packet.area);
    value.id = Format.textHexInt(value.id, 2);
    console.table(value);
  } else if (packet.property) {
    console.log(chalk.green("dump property"));
    const value = {
      id: Format.textHexInt(packet.property.id, 8),
      mode: Format.textHexInt(packet.property.mode, 2),
      perms: packet.property.perms.join(","),
      access: Format.textHexInt(packet.property.access, 2),
    };
    console.table(value);
  } else {
    console.log(chalk.red("dump nothing."));
  }
};

const update = async () => {
  const property = globalContext.property;
  const area = globalContext.area;
  if (!property) {
    console.log(chalk.red("update no target"));
    return;
  }
  const cleanAreaMath = (e) => {
    e.factor = undefined;
    e.max = undefined;
    e.min = undefined;
    e.offset = undefined;
  };
  if (!area) {
    console.log(
      chalk.cyan(`update property ${Format.textHexInt(property.id)}`)
    );
    await Prompts.propertyName(property);
    await Prompts.propertyId(property);
    await Prompts.propertyAccess(property);
    dump(property, undefined);
    for (const e of [
      Types.VehiclePropertyAccess.READ,
      Types.VehiclePropertyAccess.WRITE,
    ]) {
      if ((property.access & e) != e) continue;
      console.log(
        chalk.cyan(`update area for access: ${Format.textHexInt(e, 2)}`)
      );
      await Prompts.areaId(property, e);
      const area = property.areas[e];
      await Prompts.areaConfig(area);
      if (!area.mapping || area.mapping.length <= 0) {
        await Prompts.areaMath(area);
      } else {
        cleanAreaMath(area);
      }
      dump(undefined, area);
    }
  } else {
    console.log(chalk.cyan(`update area ${Format.textHexInt(area.id)}`));
    const access = Object.keys(property.areas).find(
      (key) => property.areas[key].id == area.id
    );
    await Prompts.areaId(property, access);
    await Prompts.areaConfig(area);
    if (!area.mapping || area.mapping.length <= 0) {
      await Prompts.areaMath(area);
    } else {
      cleanAreaMath(area);
    }
    dump(undefined, area);
  }
};

const remove = async () => {
  const index = globalContext.values.indexOf(globalContext.property);
  if (index < 0) {
    console.log(chalk.red("no property removed."));
  } else {
    globalContext.values.splice(index, 1);
    const id = Format.textHexInt(globalContext.property.id);
    console.log(chalk.red(`property ${id} removed.`));
    globalContext.property = undefined;
    globalContext.area = undefined;
  }
};

const quit = () => {
  globalContext.quit = true;
  globalContext.values = [];
  globalContext.property = undefined;
  globalContext.area = undefined;
};

const broken = () => globalContext.quit;

const Actions = {
  help: { action: help, text: "help, help message" },
  create: { action: create, text: "create, create property" },
  prop: { action: property, text: "prop hex id, switch to special property" },
  area: { action: area, text: "area hex id, switch to special area" },
  dump: { action: dump, text: "dump, dump current property or area" },
  list: { action: list, text: "list, list all property or area" },
  update: { action: update, text: "update, update current property or area" },
  remove: { action: remove, text: "remove, delete current property" },
  load: { action: load, text: "load, load from file" },
  save: { action: save, text: "save, save into file" },
  quit: { action: quit, text: "quit, exit" },
};

export default {
  Actions,
  broken,
};
