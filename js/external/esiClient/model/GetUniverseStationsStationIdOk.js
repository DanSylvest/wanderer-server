/*
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 *
 * OpenAPI spec version: 1.3.8
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.4.14
 *
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/GetUniverseStationsStationIdPosition'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./GetUniverseStationsStationIdPosition'));
  } else {
    // Browser globals (root is window)
    if (!root.EveSwaggerInterface) {
      root.EveSwaggerInterface = {};
    }
    root.EveSwaggerInterface.GetUniverseStationsStationIdOk = factory(root.EveSwaggerInterface.ApiClient, root.EveSwaggerInterface.GetUniverseStationsStationIdPosition);
  }
}(this, function(ApiClient, GetUniverseStationsStationIdPosition) {
  'use strict';

  /**
   * The GetUniverseStationsStationIdOk model module.
   * @module model/GetUniverseStationsStationIdOk
   * @version 1.3.8
   */

  /**
   * Constructs a new <code>GetUniverseStationsStationIdOk</code>.
   * 200 ok object
   * @alias module:model/GetUniverseStationsStationIdOk
   * @class
   * @param maxDockableShipVolume {Number} max_dockable_ship_volume number
   * @param name {String} name string
   * @param officeRentalCost {Number} office_rental_cost number
   * @param position {module:model/GetUniverseStationsStationIdPosition} 
   * @param reprocessingEfficiency {Number} reprocessing_efficiency number
   * @param reprocessingStationsTake {Number} reprocessing_stations_take number
   * @param services {Array.<module:model/GetUniverseStationsStationIdOk.ServicesEnum>} services array
   * @param stationId {Number} station_id integer
   * @param systemId {Number} The solar system this station is in
   * @param typeId {Number} type_id integer
   */
  var exports = function(maxDockableShipVolume, name, officeRentalCost, position, reprocessingEfficiency, reprocessingStationsTake, services, stationId, systemId, typeId) {
    this.maxDockableShipVolume = maxDockableShipVolume;
    this.name = name;
    this.officeRentalCost = officeRentalCost;
    this.position = position;
    this.reprocessingEfficiency = reprocessingEfficiency;
    this.reprocessingStationsTake = reprocessingStationsTake;
    this.services = services;
    this.stationId = stationId;
    this.systemId = systemId;
    this.typeId = typeId;
  };

  /**
   * Constructs a <code>GetUniverseStationsStationIdOk</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/GetUniverseStationsStationIdOk} obj Optional instance to populate.
   * @return {module:model/GetUniverseStationsStationIdOk} The populated <code>GetUniverseStationsStationIdOk</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      if (data.hasOwnProperty('max_dockable_ship_volume'))
        obj.maxDockableShipVolume = ApiClient.convertToType(data['max_dockable_ship_volume'], 'Number');
      if (data.hasOwnProperty('name'))
        obj.name = ApiClient.convertToType(data['name'], 'String');
      if (data.hasOwnProperty('office_rental_cost'))
        obj.officeRentalCost = ApiClient.convertToType(data['office_rental_cost'], 'Number');
      if (data.hasOwnProperty('owner'))
        obj.owner = ApiClient.convertToType(data['owner'], 'Number');
      if (data.hasOwnProperty('position'))
        obj.position = GetUniverseStationsStationIdPosition.constructFromObject(data['position']);
      if (data.hasOwnProperty('race_id'))
        obj.raceId = ApiClient.convertToType(data['race_id'], 'Number');
      if (data.hasOwnProperty('reprocessing_efficiency'))
        obj.reprocessingEfficiency = ApiClient.convertToType(data['reprocessing_efficiency'], 'Number');
      if (data.hasOwnProperty('reprocessing_stations_take'))
        obj.reprocessingStationsTake = ApiClient.convertToType(data['reprocessing_stations_take'], 'Number');
      if (data.hasOwnProperty('services'))
        obj.services = ApiClient.convertToType(data['services'], ['String']);
      if (data.hasOwnProperty('station_id'))
        obj.stationId = ApiClient.convertToType(data['station_id'], 'Number');
      if (data.hasOwnProperty('system_id'))
        obj.systemId = ApiClient.convertToType(data['system_id'], 'Number');
      if (data.hasOwnProperty('type_id'))
        obj.typeId = ApiClient.convertToType(data['type_id'], 'Number');
    }
    return obj;
  }

  /**
   * max_dockable_ship_volume number
   * @member {Number} maxDockableShipVolume
   */
  exports.prototype.maxDockableShipVolume = undefined;

  /**
   * name string
   * @member {String} name
   */
  exports.prototype.name = undefined;

  /**
   * office_rental_cost number
   * @member {Number} officeRentalCost
   */
  exports.prototype.officeRentalCost = undefined;

  /**
   * ID of the corporation that controls this station
   * @member {Number} owner
   */
  exports.prototype.owner = undefined;

  /**
   * @member {module:model/GetUniverseStationsStationIdPosition} position
   */
  exports.prototype.position = undefined;

  /**
   * race_id integer
   * @member {Number} raceId
   */
  exports.prototype.raceId = undefined;

  /**
   * reprocessing_efficiency number
   * @member {Number} reprocessingEfficiency
   */
  exports.prototype.reprocessingEfficiency = undefined;

  /**
   * reprocessing_stations_take number
   * @member {Number} reprocessingStationsTake
   */
  exports.prototype.reprocessingStationsTake = undefined;

  /**
   * services array
   * @member {Array.<module:model/GetUniverseStationsStationIdOk.ServicesEnum>} services
   */
  exports.prototype.services = undefined;

  /**
   * station_id integer
   * @member {Number} stationId
   */
  exports.prototype.stationId = undefined;

  /**
   * The solar system this station is in
   * @member {Number} systemId
   */
  exports.prototype.systemId = undefined;

  /**
   * type_id integer
   * @member {Number} typeId
   */
  exports.prototype.typeId = undefined;


  /**
   * Allowed values for the <code>services</code> property.
   * @enum {String}
   * @readonly
   */
  exports.ServicesEnum = {
    /**
     * value: "bounty-missions"
     * @const
     */
    bountyMissions: "bounty-missions",

    /**
     * value: "assasination-missions"
     * @const
     */
    assasinationMissions: "assasination-missions",

    /**
     * value: "courier-missions"
     * @const
     */
    courierMissions: "courier-missions",

    /**
     * value: "interbus"
     * @const
     */
    interbus: "interbus",

    /**
     * value: "reprocessing-plant"
     * @const
     */
    reprocessingPlant: "reprocessing-plant",

    /**
     * value: "refinery"
     * @const
     */
    refinery: "refinery",

    /**
     * value: "market"
     * @const
     */
    market: "market",

    /**
     * value: "black-market"
     * @const
     */
    blackMarket: "black-market",

    /**
     * value: "stock-exchange"
     * @const
     */
    stockExchange: "stock-exchange",

    /**
     * value: "cloning"
     * @const
     */
    cloning: "cloning",

    /**
     * value: "surgery"
     * @const
     */
    surgery: "surgery",

    /**
     * value: "dna-therapy"
     * @const
     */
    dnaTherapy: "dna-therapy",

    /**
     * value: "repair-facilities"
     * @const
     */
    repairFacilities: "repair-facilities",

    /**
     * value: "factory"
     * @const
     */
    factory: "factory",

    /**
     * value: "labratory"
     * @const
     */
    labratory: "labratory",

    /**
     * value: "gambling"
     * @const
     */
    gambling: "gambling",

    /**
     * value: "fitting"
     * @const
     */
    fitting: "fitting",

    /**
     * value: "paintshop"
     * @const
     */
    paintshop: "paintshop",

    /**
     * value: "news"
     * @const
     */
    news: "news",

    /**
     * value: "storage"
     * @const
     */
    storage: "storage",

    /**
     * value: "insurance"
     * @const
     */
    insurance: "insurance",

    /**
     * value: "docking"
     * @const
     */
    docking: "docking",

    /**
     * value: "office-rental"
     * @const
     */
    officeRental: "office-rental",

    /**
     * value: "jump-clone-facility"
     * @const
     */
    jumpCloneFacility: "jump-clone-facility",

    /**
     * value: "loyalty-point-store"
     * @const
     */
    loyaltyPointStore: "loyalty-point-store",

    /**
     * value: "navy-offices"
     * @const
     */
    navyOffices: "navy-offices",

    /**
     * value: "security-offices"
     * @const
     */
    securityOffices: "security-offices"
  };

  return exports;

}));
