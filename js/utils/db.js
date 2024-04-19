/* eslint-disable */

const fs = require('fs');
const Emitter = require('../env/tools/emitter');
const classCreator = require('../env/tools/class');
const extend = require('../env/tools/extend');
const exist = require('../env/tools/exist');
const print_f = require('../env/tools/print_f');
const log = require('./log');
const counterLog = require('./counterLog');
const CustomPromise = require('../env/promise');

const DB = classCreator('DB', Emitter, {
  constructor: function DB(_options) {
    const base = extend({
      client: null,
      isTruncatable: true,
      // name: "default",
      // user: "default",
      // properties: []
    }, _options);

    Emitter.prototype.constructor.call(this);

    this._client = base.client;
    this._isTruncatable = base.isTruncatable;
    // this._name = base.name;
    // this._user = base.user;
  },
  destructor() {
    Emitter.prototype.destructor.call(this);
  },
  async init() {
    const pr = new CustomPromise();

    this._client.connect();
    await this._client.query('SELECT NOW()');

    if (this._isTruncatable) {
      await this._truncateSequence();
    }

    pr.resolve();

    return pr.native;
  },
  async _truncateSequence() {
    // TRUNCATE
    const truncatePath = `${projectPath}/../truncate`;
    if (fs.existsSync(truncatePath)) {
      const text = fs.readFileSync(truncatePath, 'utf8');
      const arr = text.split('\n');
      const index = arr.indexOf(this._client.database);
      if (index !== -1) {
        const tablesResult = await this._client.query('SELECT * FROM pg_catalog.pg_tables WHERE schemaname != \'pg_catalog\' AND schemaname != \'information_schema\';');
        const truncateQueryArr = tablesResult.rows.map((_table) => `TRUNCATE TABLE ${_table.tablename};`);
        await this.transaction(truncateQueryArr);

        arr.splice(index, 1);
        if (arr.length === 0) {
          fs.unlinkSync(truncatePath);
        }
      }
    }
  },

  // _checkDatabaseExists: function () {
  //     var pr = new CustomPromise();
  //
  //     var query = print_f('select exists(\n SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower(\'%s\')\n)', this._name);
  //
  //     log(log.DEBUG, query);
  //
  //     this._client.query(query).then(function(_result) {
  //         if(_result.rows[0].exists){
  //             pr.resolve();
  //             return;
  //         }
  //
  //         return this._createDatabase();
  //     }.bind(this),function(_err) {
  //         pr.reject(_err);
  //     }.bind(this)).then(function() {
  //         pr.resolve();
  //     }.bind(this),function(_err) {
  //         pr.reject(_err);
  //     }.bind(this));
  //
  //     return pr.native;
  // },
  // _createDatabase: function () {
  //     var pr = new CustomPromise();
  //
  //     var query = print_f(`CREATE DATABASE %s
  //     WITH
  //     OWNER = %s
  //     ENCODING = 'UTF8'
  //     LC_COLLATE = 'C'
  //     LC_CTYPE = 'C'
  //     TABLESPACE = pg_default
  //     CONNECTION LIMIT = -1;`, this._name, this._user);
  //
  //     log(log.DEBUG, query);
  //
  //     this._client.query(query).then(function() {
  //         pr.resolve();
  //     }.bind(this),function(_err) {
  //         pr.reject(_err);
  //     }.bind(this));
  //
  //     return pr.native;
  // },
  createTable(_options) {
    return new Table(extend({
      client: this._client,
      name: '',
      properties: [],
    }, _options));
  },
  transaction(_arr) {
    const pr = new CustomPromise();

    const query = print_f('BEGIN;\n%s\nCOMMIT;', _arr.join('\n'));

    counterLog('SQL', query);

    this._client.query(query).then(() => {
      pr.resolve();
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },
  custom(_query, params) {
    const pr = new CustomPromise();

    counterLog('SQL', `CUSTOM QUERY: ${_query}`);

    this._client.query(_query, params).then((_result) => {
      pr.resolve(_result);
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },
});

var Table = classCreator('Table', Emitter, {
  constructor: function Table(_options) {
    const base = extend({
      client: null,
      name: null,
      properties: [],
      idField: 'id',
      enableLog: false,
    }, _options);

    Emitter.prototype.constructor.call(this);

    this._name = base.name;
    this._properties = base.properties;
    this._propsMap = Object.create(null);
    this._client = base.client;
    this._idField = base.idField;
    this._enableLog = base.enableLog;
  },
  init() {
    this._properties.map((x, i) => this._propsMap[x.name] = i);

    const pr = new CustomPromise();

    log(log.DEBUG, print_f('Table [%s] loading...', this._name));

    this._exists().then(async (_exists) => {
      if (!_exists) {
        this._create().then(() => {
          log(log.DEBUG, print_f('Table [%s] loaded.', this._name));
          pr.resolve();
        }, (_err) => {
          pr.reject({
            sub: _err,
            message: print_f('Error on create in Table [%s] on init', this._name),
          });
        });
      } else {
        await this.checkAndUpgradeColumns();
        log(log.DEBUG, print_f('Table [%s] loaded.', this._name));
        pr.resolve();
      }
    }, (_err) => {
      pr.reject({
        sub: _err,
        message: 'Error on exists in Table init',
      });
    });

    return pr.native;
  },
  async checkAndUpgradeColumns() {
    const cols = await this.getColumns();

    try {
      // first check what was added
      for (let a = 0; a < this._properties.length; a++) {
        const prop = this._properties[a];

        // если проп отсутствует - то добавим
        if (!cols.exists(prop.name)) {
          const query = `ALTER TABLE ${this._name} ADD COLUMN "${prop.name}" ${getDBTypeByJsType(prop.type)} ${getOptionsForType(prop.type)} DEFAULT ('${this.getDefaultValue(prop.name)}');`;
          this._enableLog && log(log.INFO, query);
          await this._client.query(query);
          this._enableLog && counterLog('SQL', query);
        }
      }

      // then check what was deleted
      for (let a = 0; a < cols.length; a++) {
        const propName = cols[a];

        if (!exist(this._properties.searchByObjectKey('name', propName))) {
          const query = `ALTER TABLE ${this._name} DROP COLUMN IF EXISTS "${propName}";`;
          this._enableLog && log(log.INFO, query);
          await this._client.query(query);
          this._enableLog && counterLog('SQL', query);
        }
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  },
  getPropertyInfo(_name) {
    return this._properties[this._propsMap[_name]];
  },
  attributes() {
    return this._properties.map((_prop) => _prop.name);
  },
  _create() {
    const pr = new CustomPromise();

    let propsQuery = '';

    for (let a = 0; a < this._properties.length; a++) {
      const prop = this._properties[a];

      if (a !== 0) propsQuery += ' ';

      propsQuery += print_f('"%s" %s %s', prop.name, getDBTypeByJsType(prop.type), getOptionsForType(prop.type));

      if (a !== this._properties.length - 1) propsQuery += ',\n';
    }

    const createQuery = print_f('CREATE TABLE public.%s(\n%s\n)', this._name, propsQuery);

    this._client.query(createQuery).then((_result) => {
      pr.resolve();
    }, (_err) => {
      pr.reject();
    });

    return pr.native;
  },
  _exists() {
    const pr = new CustomPromise();

    const query = print_f("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '%s');", this._name);
    this._enableLog && counterLog('SQL', query);

    this._client.query(query).then((_result) => {
      pr.resolve(_result.rows[0].exists);
    }, () => {
      pr.reject();
    });

    return pr.native;
  },

  _innerGet(_condition, _requestFields) {
    const pr = new CustomPromise();
    const cond = extractCondition(_condition);
    const fields = updateFields(_requestFields);
    const query = print_f('SELECT %s FROM public.%s WHERE %s;', fields, this._name, cond);
    this._enableLog && counterLog('SQL', query);

    this._client.query(query).then((_result) => {
      let out = [];
      if (_result.rowCount === 0) {
        log(log.DEBUG, print_f('Rows count 0 for query - <%s>', query));
      } else {
        out = [];
        for (let a = 0; a < _result.rows.length; a++) {
          const row = _result.rows[a];
          const newRow = Object.create(null);
          for (const attr in row) {
            newRow[attr] = this._processGetAttr(attr, row[attr]);
          }
          out.push(newRow);
        }
      }
      pr.resolve(out);
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },

  _processGetAttr(attr, value) {
    let out = value;
    const propInfo = this.getPropertyInfo(attr);

    if (exist(value)) {
      out = extractFromDbType(propInfo.type, value);

      if (propInfo.willEscaped) {
        out = unescape(out);
      }
    } else {
      out = this.getDefaultValue(attr);
    }

    return out;
  },

  _processSetAttr(attr, value) {
    const propInfo = this.getPropertyInfo(attr);
    let out = value;

    if (propInfo.willEscaped) out = escape(value);

    out = convertToDBType(propInfo.type, out);

    return out;
  },

  getDefaultValue(attr) {
    let out = null;

    const propInfo = this.getPropertyInfo(attr);
    if (exist(propInfo.defaultValue) && typeof propInfo.defaultValue === 'function') {
      out = propInfo.defaultValue();
    } else if (exist(propInfo.defaultValue)) {
      out = propInfo.defaultValue;
    } else {
      out = getDefaultValueByType(propInfo.type);
    }

    return out;
  },

  _innerSet(_condition, _data, _isTransaction) {
    const cond = extractCondition(_condition);

    const arr = [];
    for (const attr in _data) {
      arr.push(print_f(`"${attr}"='${this._processSetAttr(attr, _data[attr])}'`));
    }
    const props = arr.join(',');

    const query = print_f('UPDATE public.%s SET %s WHERE %s', this._name, props, cond);

    if (_isTransaction) return query;

    const pr = new CustomPromise();

    this._enableLog && counterLog('SQL', query);

    this._client.query(query).then(() => {
      pr.resolve();
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },

  _innerExists(_condition) {
    const cond = extractCondition(_condition);

    const query = print_f('SELECT 1 FROM %s WHERE %s LIMIT 1;', this._name, cond);

    const pr = new CustomPromise();

    this._enableLog && counterLog('SQL', query);

    this._client.query(query).then((_result) => {
      pr.resolve(_result.rowCount > 0);
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },
  _innerRemove(_condition, _isTransaction) {
    const cond = extractCondition(_condition);

    const query = print_f('DELETE FROM public.%s WHERE %s;', this._name, cond);

    if (_isTransaction) return query;

    const pr = new CustomPromise();

    this._enableLog && counterLog('SQL', query);

    this._client.query(query).then((_result) => {
      pr.resolve();
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },

  get(_id, _field) {
    const pr = new CustomPromise();

    // field can be array, and we will load all attributes in this array
    let arr = [];
    let isSingle = false;
    if (typeof _field === 'string') {
      arr = [_field];
      isSingle = true;
    } else {
      arr = _field;
    }

    // TODO we need check props - if it not exist we must throw exception
    const condition = [{
      name: this._idField,
      operator: '=',
      value: _id,
    }];

    this._innerGet(condition, arr).then((_result) => {
      if (_result.length === 0) {
        pr.resolve(null);
        return;
      }

      if (isSingle) {
        pr.resolve(_result[0][_field]);
      } else {
        pr.resolve(_result[0]);
      }
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },
  add(_props, _isTransaction) {
    const obj = {};
    for (let a = 0; a < this._properties.length; a++) {
      const prop = this._properties[a];

      // Here we pass props and fill by default values
      // may be it not good way, but why not?
      let value = null;
      const inputProp = _props[prop.name];

      // if input value is not: NaN, null or undefined
      // Case: 1 - we set input prop
      // Case: 2 - we set from defaultValue if it function
      // Case: 3 - we set from defaultValue
      // Case: 4 - we find default value by type
      if (exist(inputProp)) {
        value = inputProp;
      } else if (exist(prop.defaultValue) && typeof prop.defaultValue === 'function') {
        value = prop.defaultValue();
      } else if (exist(prop.defaultValue)) {
        value = prop.defaultValue;
      } else {
        value = getDefaultValueByType(prop.type);
      }

      value = convertToDBType(prop.type, value);

      // next we add it promise all, for check when all props will filled in db
      if (exist(value)) obj[prop.name] = value;
    }

    // we need convert object to string query
    const arrKeys = [];
    const arrVals = [];
    for (const k in obj) {
      arrKeys.push(`"${k}"`);
      arrVals.push(`'${obj[k]}'`);
    }

    const query = print_f('INSERT INTO public.%s(%s) VALUES (%s);', this._name, arrKeys.join(','), arrVals.join(','));

    if (_isTransaction) return query;

    const pr = new CustomPromise();

    this._enableLog && counterLog('SQL', query);

    this._client.query(query).then((_result) => {
      pr.resolve();
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },
  set(_id, _key, _value, _isTransaction) {
    // _key may be object - key: value
    if (typeof _key === 'string') {
      var obj = {};
      obj[_key] = _value;
    } else if (_key instanceof Object) {
      obj = _key;
      if (exist(_value)) _isTransaction = _value;
    }

    const condition = [{
      name: this._idField,
      operator: '=',
      value: _id,
    }];

    if (_isTransaction) {
      return this._innerSet(condition, obj, _isTransaction);
    }

    const pr = new CustomPromise();
    this._innerSet(condition, obj).then(() => {
      pr.resolve();
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },
  getByCondition(_cond, _attributes) {
    return this._innerGet(_cond, _attributes);
  },
  setByCondition(_condition, _data, _isTransaction) {
    return this._innerSet(_condition, _data, _isTransaction);
  },
  existsByCondition(_condition, _isTransaction) {
    return this._innerExists(_condition, _isTransaction);
  },
  removeByCondition(_condition, _isTransaction) {
    return this._innerRemove(_condition, _isTransaction);
  },
  remove(_id, _isTransaction) {
    const condition = [{
      name: this._idField,
      operator: '=',
      value: _id,
    }];

    return this._innerRemove(condition, _isTransaction);
  },
  all() {
    const props = this._properties.map((prop) => `"${prop.name}"`).join(', ');

    const query = print_f('SELECT %s FROM public.%s;', props, this._name);

    const pr = new CustomPromise();

    this._enableLog && counterLog('SQL', query);

    this._client.query(query).then((_result) => {
      pr.resolve(_result.rows);
    }, (_err) => {
      pr.reject(_err);
    });

    return pr.native;
  },
  name() {
    return this._name;
  },
  async getColumns() {
    const columnsQuery = `SELECT column_name
                FROM information_schema.columns 
                WHERE table_name='${this._name}'`;
    const result = await this._client.query(columnsQuery);

    return result.rowCount > 0 ? result.rows.map((x) => x.column_name) : [];
  },
});

var getDBTypeByJsType = function (_jsType) {
  let creatingType = '';
  switch (_jsType) {
    case String:
      creatingType += 'text';
      break;
    case Number:
      creatingType += 'double precision';
      break;
    case Boolean:
      creatingType += 'boolean';
      break;
    default:
      creatingType += 'text';
      break;
  }
  return creatingType;
};

var getOptionsForType = function (_jsType) {
  let opts = '';
  switch (_jsType) {
    case String:
      opts += 'COLLATE pg_catalog."default"';
      break;
    default:
      opts += '';
      break;
  }
  return opts;
};

var getDefaultValueByType = function (_type) {
  switch (_type) {
    case Array:
      return [];
    case Object:
      return Object.create(null);
    case String:
      return '';
    case Boolean:
      return false;
    case Number:
      return 0;
    case Date:
      return new Date();
  }
};

var convertToDBType = function (_type, _value) {
  switch (_type) {
    case String:
      return _value.toString().replace("'", "''");
    case Number:
    case Boolean:
    case Date:
      return _value;
    default:
      return Buffer.from(JSON.stringify(_value)).toString('base64');
  }
};

var extractFromDbType = function (_type, _value) {
  switch (_type) {
    case String:
      return _value.replace("''", "'");
    case Number:
    case Boolean:
    case Date:
      return _value;
    default:
      // console.log(_value);
      return JSON.parse(Buffer.from(_value, 'base64').toString('utf8'));
  }
};

const extractCondition = function (condition, operator) {
  if (typeof condition === 'string') {
    return condition;
  }

  if (condition.constructor === Object) {
    // three ways:
    //  - operator and condition
    //  - operator and left and right
    //  - operator and name and value
    if (exist(condition.condition)) {
      return `(${extractCondition(condition.condition, condition.operator)})`;
    }

    if (exist(condition.left)) {
      const left = extractCondition(condition.left);
      const right = extractCondition(condition.right);
      return `(${left} ${condition.operator} ${right})`;
    }

    if (exist(condition.name)) {
      let val = condition.value;
      if (typeof val === 'string') val = val.replace("'", "''");

      return `"${condition.name}" ${condition.operator} '${val}'`;
    }
  }

  if (condition.constructor === Array) {
    operator = !exist(operator) ? 'AND' : operator;
    const arr = condition.map((x) => extractCondition(x));
    return arr.join(` ${operator} `);
  }
};

// var test1 = [
//     {name: "groupId", operator: "=", value: "groupKEK"},
//     {
//         operator: "OR",
//         condition: [
//             {name: "charId", operator: "=", value: "1"},
//             {name: "charId", operator: "=", value: "12"},
//             {name: "charId", operator: "=", value: "13"},
//             {name: "charId", operator: "=", value: "14"},
//             {name: "charId", operator: "=", value: "15"}
//         ]
//     }
// ]
// let test1result = extractCondition(test1)
//
// var test2 = {
//     operator: "AND",
//     left: {name: "groupId", operator: "=", value: "groupKEK"},
//     right: {
//         operator: "OR",
//         condition: [
//             {name: "charId", operator: "=", value: "1"},
//             {name: "charId", operator: "=", value: "12"},
//             {name: "charId", operator: "=", value: "13"},
//             {name: "charId", operator: "=", value: "14"},
//             {name: "charId", operator: "=", value: "15"}
//         ]
//     }
// }
// let test2result = extractCondition(test2)
// debugger;

var updateFields = function (_fields) {
  const arr = [];
  for (let a = 0; a < _fields.length; a++) {
    arr.push(`"${_fields[a]}"`);
  }
  return arr.join(',');
};

module.exports = DB;
