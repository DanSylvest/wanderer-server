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
    define(['ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.EveSwaggerInterface) {
      root.EveSwaggerInterface = {};
    }
    root.EveSwaggerInterface.GetUniverseBloodlines200Ok = factory(root.EveSwaggerInterface.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The GetUniverseBloodlines200Ok model module.
   * @module model/GetUniverseBloodlines200Ok
   * @version 1.3.8
   */

  /**
   * Constructs a new <code>GetUniverseBloodlines200Ok</code>.
   * 200 ok object
   * @alias module:model/GetUniverseBloodlines200Ok
   * @class
   * @param bloodlineId {Number} bloodline_id integer
   * @param charisma {Number} charisma integer
   * @param corporationId {Number} corporation_id integer
   * @param description {String} description string
   * @param intelligence {Number} intelligence integer
   * @param memory {Number} memory integer
   * @param name {String} name string
   * @param perception {Number} perception integer
   * @param raceId {Number} race_id integer
   * @param shipTypeId {Number} ship_type_id integer
   * @param willpower {Number} willpower integer
   */
  var exports = function(bloodlineId, charisma, corporationId, description, intelligence, memory, name, perception, raceId, shipTypeId, willpower) {
    this.bloodlineId = bloodlineId;
    this.charisma = charisma;
    this.corporationId = corporationId;
    this.description = description;
    this.intelligence = intelligence;
    this.memory = memory;
    this.name = name;
    this.perception = perception;
    this.raceId = raceId;
    this.shipTypeId = shipTypeId;
    this.willpower = willpower;
  };

  /**
   * Constructs a <code>GetUniverseBloodlines200Ok</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/GetUniverseBloodlines200Ok} obj Optional instance to populate.
   * @return {module:model/GetUniverseBloodlines200Ok} The populated <code>GetUniverseBloodlines200Ok</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      if (data.hasOwnProperty('bloodline_id'))
        obj.bloodlineId = ApiClient.convertToType(data['bloodline_id'], 'Number');
      if (data.hasOwnProperty('charisma'))
        obj.charisma = ApiClient.convertToType(data['charisma'], 'Number');
      if (data.hasOwnProperty('corporation_id'))
        obj.corporationId = ApiClient.convertToType(data['corporation_id'], 'Number');
      if (data.hasOwnProperty('description'))
        obj.description = ApiClient.convertToType(data['description'], 'String');
      if (data.hasOwnProperty('intelligence'))
        obj.intelligence = ApiClient.convertToType(data['intelligence'], 'Number');
      if (data.hasOwnProperty('memory'))
        obj.memory = ApiClient.convertToType(data['memory'], 'Number');
      if (data.hasOwnProperty('name'))
        obj.name = ApiClient.convertToType(data['name'], 'String');
      if (data.hasOwnProperty('perception'))
        obj.perception = ApiClient.convertToType(data['perception'], 'Number');
      if (data.hasOwnProperty('race_id'))
        obj.raceId = ApiClient.convertToType(data['race_id'], 'Number');
      if (data.hasOwnProperty('ship_type_id'))
        obj.shipTypeId = ApiClient.convertToType(data['ship_type_id'], 'Number');
      if (data.hasOwnProperty('willpower'))
        obj.willpower = ApiClient.convertToType(data['willpower'], 'Number');
    }
    return obj;
  }

  /**
   * bloodline_id integer
   * @member {Number} bloodlineId
   */
  exports.prototype.bloodlineId = undefined;

  /**
   * charisma integer
   * @member {Number} charisma
   */
  exports.prototype.charisma = undefined;

  /**
   * corporation_id integer
   * @member {Number} corporationId
   */
  exports.prototype.corporationId = undefined;

  /**
   * description string
   * @member {String} description
   */
  exports.prototype.description = undefined;

  /**
   * intelligence integer
   * @member {Number} intelligence
   */
  exports.prototype.intelligence = undefined;

  /**
   * memory integer
   * @member {Number} memory
   */
  exports.prototype.memory = undefined;

  /**
   * name string
   * @member {String} name
   */
  exports.prototype.name = undefined;

  /**
   * perception integer
   * @member {Number} perception
   */
  exports.prototype.perception = undefined;

  /**
   * race_id integer
   * @member {Number} raceId
   */
  exports.prototype.raceId = undefined;

  /**
   * ship_type_id integer
   * @member {Number} shipTypeId
   */
  exports.prototype.shipTypeId = undefined;

  /**
   * willpower integer
   * @member {Number} willpower
   */
  exports.prototype.willpower = undefined;

  return exports;

}));
