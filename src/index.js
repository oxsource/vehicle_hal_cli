import chalk from 'chalk'
import Prompts from './prompt.js'
import Format from './format.js'
import Types  from './types.js'

const dumpProperty = (property) => {
    const value = {
        id: Format.textHexInt(property.id, 8),
        mode: Format.textHexInt(property.mode, 2),
        perms: property.perms.join(','),
        access: Format.textHexInt(property.access, 2),
    }
    console.table(value)
}

const dumpPropertyArea = (area) => {
    const value = Object.assign(area)
    value.id = Format.textHexInt(value.id, 2)
    console.table(value)
}

const main = async () => {
    const property = {}
    console.log(chalk.cyan('Create Property Info'))
    await Prompts.propertyName(property)
    await Prompts.propertyId(property)
    await Prompts.propertyAccess(property)
    dumpProperty(property)
    for (const e of [Types.VehiclePropertyAccess.READ, Types.VehiclePropertyAccess.WRITE]) {
        if ((property.access & e) != e) continue
        console.log(chalk.cyan(`Create Area Info for Access: ${Format.textHexInt(e, 2)}`))
        await Prompts.areaId(property, e)
        const area = property.areas[e]
        await Prompts.areaConfig(area)
        if (!area.mapping || area.mapping.length <= 0) {
            await Prompts.areaMath(area)
        }
        dumpPropertyArea(area)
    }
}

main()