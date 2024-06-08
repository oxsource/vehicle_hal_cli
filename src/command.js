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
    const text = fs.readFileSync(file, UTF8);
    globalContext.values = JSON.parse(text);
    console.log(`load ${file} ${globalContext.values.length} properties`);
  } catch (err) {
    console.error("load file error:", err);
  }
};

const save = async () => {
  try {
    const file = await Prompts.filePath();
    const text = JSON.stringify(globalContext.values);
    fs.writeFileSync(file, text, UTF8);
    console.log(`save ${file} success.`);
  } catch (err) {
    console.error("save to file error:", err);
  }
};

const list = async () => {
  if (globalContext.property) {
    console.log(chalk.cyan(`list ${globalContext.property.id} areas`));
    const values = Object.values(globalContext.property.areas).map(
      (e) => `area: ${e.id}, name: ${e.name}`
    );
    console.table(values);
  } else {
    console.log(chalk.cyan(`list all property`));
    const values = globalContext.values.map(
      (e) => `prop: ${e.id}, name: ${e.name}`
    );
    console.table(values);
  }
};

const pick = async (index) => {
  if (globalContext.property) {
    const property = globalContext.property;
    const values = Object.values(property.areas || {});
    const value = index >= 0 && index < values.length ? values[index] : null;
    globalContext.area = value || globalContext.area;
    console.log(chalk.cyan(`pick area ${index} ${value ? "ok" : "fail"}`));
  } else {
    const values = globalContext.values;
    const value = index >= 0 && index < values.length ? values[index] : null;
    globalContext.property = value || globalContext.property;
    globalContext.area = value ? undefined : globalContext.area;
    console.log(chalk.cyan(`pick property ${index} ${value ? "ok" : "fail"}`));
  }
};

const create = async () => {
  const property = {};
  console.log(chalk.cyan("create property"));
  await Prompts.propertyName(property);
  await Prompts.propertyId(property);
  //check property exist
  const exist = globalContext.values.find((e) => e.id == property.id);
  if (exist != undefined) {
    const msg = `create property id: ${property.id} has exist.`;
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
    if ((Format.parseHexInt(property.access) & e) != e) continue;
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
    console.table(packet.area);
  } else if (packet.property) {
    console.log(chalk.green("dump property"));
    const value = {
      id: packet.property.id,
      mode: packet.property.mode,
      perms: packet.property.perms.join(","),
      access: packet.property.access,
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
  const deleteAreaMath = (e) => {
    delete e.factor;
    delete e.max;
    delete e.min;
    delete e.offset;
  };
  if (!area) {
    console.log(
      chalk.cyan(`update property ${property.id}`)
    );
    await Prompts.propertyName(property);
    await Prompts.propertyId(property);
    await Prompts.propertyAccess(property);
    dump(property, undefined);
    for (const e of [
      Types.VehiclePropertyAccess.READ,
      Types.VehiclePropertyAccess.WRITE,
    ]) {
      if ((Format.parseHexInt(property.access) & e) != e) continue;
      console.log(
        chalk.cyan(`update area for access: ${Format.textHexInt(e, 2)}`)
      );
      await Prompts.areaId(property, e);
      const area = property.areas[e];
      await Prompts.areaConfig(area);
      if (!area.mapping || area.mapping.length <= 0) {
        await Prompts.areaMath(area);
      } else {
        deleteAreaMath(area);
      }
      dump(undefined, area);
    }
  } else {
    console.log(chalk.cyan(`update area ${area.id}`));
    const access = Object.keys(property.areas).find(key => property.areas[key].id == area.id);
    await Prompts.areaId(property, parseInt(access));
    await Prompts.areaConfig(area);
    if (!area.mapping || area.mapping.length <= 0) {
      await Prompts.areaMath(area);
    } else {
      deleteAreaMath(area);
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
    console.log(chalk.red(`property ${globalContext.property.id} removed.`));
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
  h: { action: help, text: "h, help message" },
  a: { action: create, text: "a, append new property" },
  p: { action: pick, text: "p index, pick property or area via index" },
  v: { action: dump, text: "v, view current property or area" },
  l: { action: list, text: "l, list property or area" },
  u: { action: update, text: "u, update current property or area" },
  d: { action: remove, text: "d, delete current property" },
  o: { action: load, text: "o, open and load from file" },
  w: { action: save, text: "w, write into file" },
  q: { action: quit, text: "q, quit" },
};

export default {
  Actions,
  broken,
};
