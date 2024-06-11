import chalk from "chalk";
import Prompts from "./prompt.js";

const main = async () => {
    Prompts.setup();
    while (true) {
        if (!(await Prompts.polling())) continue;
        console.log(chalk.cyan("Bye"));
        break;
    };
};

export default {
    main,
}
