import Prompts from "./prompt.js";
import Command from "./command.js"

(async () => {
    Prompts.setup();
    const property = {
        id: '0x25200010',
        access: '0x03',
    };
    Command.makeProperty(property);
    //
    const area = area;
    Command.makeArea(property, area);
})();
