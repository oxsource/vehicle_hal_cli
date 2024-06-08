import chalk from "chalk";
import Prompts from "./prompt.js";

(async () => {
  while (true) {
    if (!(await Prompts.polling())) continue;
    console.log(chalk.cyan("Bye"));
    break;
  }
})();