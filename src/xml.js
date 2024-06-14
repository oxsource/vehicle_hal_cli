import xmlbuilder2 from "xmlbuilder2";
import Format from "./format.js";
import Types from "./types.js";
import Perms from "./perms.js";
import Domain from "./domain.js";

const config = {
    meta: {
        version: '1.0',
        encoding: "UTF-8",
    },
    format: {
        prettyPrint: true
    }
}

const createHalProps = context => {
    const descAccess = value => {
        switch (Format.parseHexInt(value)) {
            case Types.VehiclePropertyAccess.READ:
                return "R";
            case Types.VehiclePropertyAccess.WRITE:
                return "W";
            case Types.VehiclePropertyAccess.READ_WRITE:
                return "WR";
            default:
                return "";
        }
    };
    const descMode = value => {
        switch (Format.parseHexInt(value)) {
            case Types.VehiclePropertyChangeMode.ON_CHANGE:
                return "CHANGE";
            case Types.VehiclePropertyChangeMode.CONTINUOUS:
                return "CONTINUOUS";
            case Types.VehiclePropertyChangeMode.STATIC:
                return "STATIC";
            default:
                return "";
        }
    };
    const doc = xmlbuilder2.create(config.meta);
    const root = doc.ele('configs');
    root.att('version', context.version);
    context.values.forEach(prop => {
        // <config prop="0x21401001" access="WR" change="CHANGE" perms="android.car.permission.CAR_AUDIO,-"/>
        const nConfig = root.ele('config')
        nConfig.att('prop', prop.id)
            .att('access', descAccess(prop.access))
            .att('change', descMode(prop.mode))
            .att('perms', Perms.line(prop.perms));
        //property areas
        prop.areas.forEach(area => {
            //eg. <area id="0x07" limits="0,3"/>
            const limits = ['min', 'max'].map(key => area[key]).filter(e => e != undefined);
            const nArea = nConfig.ele('area');
            nArea.att('id', area.id);
            if (limits.length == 2) nArea.att('limits', limits.join(','));
            nArea.up();
        });
        nConfig.up();
    });
    return root.end(config.format);
};

const createCanProps = context => {
    const doc = xmlbuilder2.create(config.meta);
    const root = doc.ele('CONFIG');
    //build CAN_PARAMS
    root.ele('CAN_PARAMS')
        .att('platform', context.platform)
        .att('version', context.version)
        .ele('SET')
        .att('header', 'AA0C30')
        .att('retry', 5)
        .att('debounce', 10).up()
        .up();
    //build CAN_DOMAN
    const domain = root.ele('CAN_DOMAIN');
    const domains = new Set();
    context.values.forEach(prop => {
        prop.areas.forEach(area => {
            Types.WRVehiclePropertyAccess.map(key => area[key]).forEach(action => {
                action && domains.add(action.domain);
            });
        })
    });
    domains.forEach(value => {
        const source = Domain.values().find(e => e.name == value) || {};
        const nDomain = domain.ele('domain')
            .att('name', value.replaceAll('0x', ''));
        const initial = (source.initial || '').trim();
        initial.length > 0 && nDomain.att('initial', initial);
        nDomain.up();
    });
    domain.up();
    //build CAN_PROPS
    const nProps = root.ele('CAN_PROPS');
    context.values.forEach(prop => {
        prop.areas.forEach(area => {
            const nProp = nProps.ele('PROP').att('id', prop.id);
            nProp.att('area', area.id).att('name', area.name);
            Types.WRVehiclePropertyAccess.forEach(access => {
                const action = area[access];
                if (!action) return;
                const nAction = nProp.ele(Types.descVehiclePropertyAccess(access));
                nAction.att('domain', action.domain.replaceAll('0x', ''))
                    .att('name', action.name)
                    .att('pos', action.pos)
                    .att('size', action.size);
                //action options
                if (action.mapping != undefined) {
                    nAction.att('mapping', action.mapping);
                } else {
                    ['factor', 'max', 'min', 'offset'].forEach(key => {
                        action[key] != undefined && nAction.att(key, action[key]);
                    });
                }
                if (action.invalid) {
                    nAction.att('invalid', action.invalid);
                }
                nAction.up();
            });
            nProp.up();
        });
    });
    nProps.up();
    return root.end(config.format);
};

export default {
    createHalProps,
    createCanProps,
}