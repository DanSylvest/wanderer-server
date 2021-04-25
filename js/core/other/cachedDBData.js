class CachedDBData {
    constructor() {

    }

    async init() {
        await Promise.all([
            this.loadTrig(),
            this.loadWHClassA(),
        ])
    }

    async loadTrig() {
        let result = await core.dbController.solarSystemsTable.getByCondition([
            {name: "triglavianInvasionStatus", operator: "!=", value: "Normal"}
        ], ["triglavianInvasionStatus", "solarSystemId"]);

        this.pochvenSolarSystems = [];
        this.triglavianSolarSystems = [];
        this.edencomSolarSystems = [];
        result.map(x => {
            switch (x.triglavianInvasionStatus) {
                case "Edencom":
                    this.edencomSolarSystems.push(x.solarSystemId);
                    break;
                case "Triglavian":
                    this.triglavianSolarSystems.push(x.solarSystemId);
                    break;
                case "Final":
                    this.pochvenSolarSystems.push(x.solarSystemId);
                    break;
            }
        })
    }

    async loadWHClassA() {
        let result = await core.dbController.solarSystemsTable.getByCondition([
            {name: "systemClass", operator: "=", value: 1}
        ], ["solarSystemId"]);

        this.wormholeClassAIndexed = Object.create(null);
        this.wormholeClassA = result.map(x => {
            this.wormholeClassAIndexed[x.solarSystemId] = true;
            return x.solarSystemId
        });

    }
}

module.exports = CachedDBData;