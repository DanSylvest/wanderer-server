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
    define(['ApiClient', 'model/GetCharactersCharacterIdPlanetsPlanetIdContent', 'model/GetCharactersCharacterIdPlanetsPlanetIdExtractorDetails', 'model/GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./GetCharactersCharacterIdPlanetsPlanetIdContent'), require('./GetCharactersCharacterIdPlanetsPlanetIdExtractorDetails'), require('./GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails'));
  } else {
    // Browser globals (root is window)
    if (!root.EveSwaggerInterface) {
      root.EveSwaggerInterface = {};
    }
    root.EveSwaggerInterface.GetCharactersCharacterIdPlanetsPlanetIdPin = factory(root.EveSwaggerInterface.ApiClient, root.EveSwaggerInterface.GetCharactersCharacterIdPlanetsPlanetIdContent, root.EveSwaggerInterface.GetCharactersCharacterIdPlanetsPlanetIdExtractorDetails, root.EveSwaggerInterface.GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails);
  }
}(this, function(ApiClient, GetCharactersCharacterIdPlanetsPlanetIdContent, GetCharactersCharacterIdPlanetsPlanetIdExtractorDetails, GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails) {
  'use strict';

  /**
   * The GetCharactersCharacterIdPlanetsPlanetIdPin model module.
   * @module model/GetCharactersCharacterIdPlanetsPlanetIdPin
   * @version 1.3.8
   */

  /**
   * Constructs a new <code>GetCharactersCharacterIdPlanetsPlanetIdPin</code>.
   * pin object
   * @alias module:model/GetCharactersCharacterIdPlanetsPlanetIdPin
   * @class
   * @param latitude {Number} latitude number
   * @param longitude {Number} longitude number
   * @param pinId {Number} pin_id integer
   * @param typeId {Number} type_id integer
   */
  var exports = function(latitude, longitude, pinId, typeId) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.pinId = pinId;
    this.typeId = typeId;
  };

  /**
   * Constructs a <code>GetCharactersCharacterIdPlanetsPlanetIdPin</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/GetCharactersCharacterIdPlanetsPlanetIdPin} obj Optional instance to populate.
   * @return {module:model/GetCharactersCharacterIdPlanetsPlanetIdPin} The populated <code>GetCharactersCharacterIdPlanetsPlanetIdPin</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      if (data.hasOwnProperty('contents'))
        obj.contents = ApiClient.convertToType(data['contents'], [GetCharactersCharacterIdPlanetsPlanetIdContent]);
      if (data.hasOwnProperty('expiry_time'))
        obj.expiryTime = ApiClient.convertToType(data['expiry_time'], 'Date');
      if (data.hasOwnProperty('extractor_details'))
        obj.extractorDetails = GetCharactersCharacterIdPlanetsPlanetIdExtractorDetails.constructFromObject(data['extractor_details']);
      if (data.hasOwnProperty('factory_details'))
        obj.factoryDetails = GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails.constructFromObject(data['factory_details']);
      if (data.hasOwnProperty('install_time'))
        obj.installTime = ApiClient.convertToType(data['install_time'], 'Date');
      if (data.hasOwnProperty('last_cycle_start'))
        obj.lastCycleStart = ApiClient.convertToType(data['last_cycle_start'], 'Date');
      if (data.hasOwnProperty('latitude'))
        obj.latitude = ApiClient.convertToType(data['latitude'], 'Number');
      if (data.hasOwnProperty('longitude'))
        obj.longitude = ApiClient.convertToType(data['longitude'], 'Number');
      if (data.hasOwnProperty('pin_id'))
        obj.pinId = ApiClient.convertToType(data['pin_id'], 'Number');
      if (data.hasOwnProperty('schematic_id'))
        obj.schematicId = ApiClient.convertToType(data['schematic_id'], 'Number');
      if (data.hasOwnProperty('type_id'))
        obj.typeId = ApiClient.convertToType(data['type_id'], 'Number');
    }
    return obj;
  }

  /**
   * contents array
   * @member {Array.<module:model/GetCharactersCharacterIdPlanetsPlanetIdContent>} contents
   */
  exports.prototype.contents = undefined;

  /**
   * expiry_time string
   * @member {Date} expiryTime
   */
  exports.prototype.expiryTime = undefined;

  /**
   * @member {module:model/GetCharactersCharacterIdPlanetsPlanetIdExtractorDetails} extractorDetails
   */
  exports.prototype.extractorDetails = undefined;

  /**
   * @member {module:model/GetCharactersCharacterIdPlanetsPlanetIdFactoryDetails} factoryDetails
   */
  exports.prototype.factoryDetails = undefined;

  /**
   * install_time string
   * @member {Date} installTime
   */
  exports.prototype.installTime = undefined;

  /**
   * last_cycle_start string
   * @member {Date} lastCycleStart
   */
  exports.prototype.lastCycleStart = undefined;

  /**
   * latitude number
   * @member {Number} latitude
   */
  exports.prototype.latitude = undefined;

  /**
   * longitude number
   * @member {Number} longitude
   */
  exports.prototype.longitude = undefined;

  /**
   * pin_id integer
   * @member {Number} pinId
   */
  exports.prototype.pinId = undefined;

  /**
   * schematic_id integer
   * @member {Number} schematicId
   */
  exports.prototype.schematicId = undefined;

  /**
   * type_id integer
   * @member {Number} typeId
   */
  exports.prototype.typeId = undefined;

  return exports;

}));
