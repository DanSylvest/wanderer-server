var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var extend        = require("./../env/tools/extend");
var exist         = require("./../env/tools/exist");
var print_f       = require("./../env/tools/print_f");
var log           = require("./../utils/log");
var CustomPromise = require("./../env/promise");
var fs            = require("fs");

var DB = classCreator("DB", Emitter, {
    constructor: function DB(_options) {
        var base = extend({
            client: null,
            // name: "default",
            // user: "default",
            // properties: []
        }, _options);

        Emitter.prototype.constructor.call(this);

        this._client = base.client;
        // this._name = base.name;
        // this._user = base.user;
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    init: async function ( ){
        var pr = new CustomPromise();

        this._client.connect();
        await this._client.query('SELECT NOW()')
        await this._truncateSequence();

        pr.resolve();

        return pr.native;
    },
    _truncateSequence: async function () {
        // TRUNCATE
        var truncatePath = projectPath + "/../truncate";
        if(fs.existsSync(truncatePath)) {
            var text = fs.readFileSync(truncatePath, "utf8");
            var arr = text.split("\n");
            var index = arr.indexOf(this._client.database);
            if(index !== -1) {

                var tablesResult = await this._client.query(`SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';`);
                var truncateQueryArr = tablesResult.rows.map(_table => "TRUNCATE TABLE " + _table.tablename + ";");
                await this.transaction(truncateQueryArr);

                arr.splice(index, 1);
                if(arr.length === 0) {
                    fs.unlinkSync(truncatePath)
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
    createTable: function (_options) {
        return new Table(extend({
            client: this._client,
            name: "",
            properties: []
        }, _options));
    },
    transaction: function (_arr) {
        var pr = new CustomPromise();

        var query = print_f("BEGIN;\n%s\nCOMMIT;", _arr.join("\n"));

        log(log.DEBUG, query);

        this._client.query(query).then(function () {
            pr.resolve();
        }.bind(this), function (_err) {
            pr.reject(_err)
        }.bind(this))

        return pr.native;
    },
    custom: function (_query) {
        var pr = new CustomPromise();

        log(log.DEBUG, "CUSTOM QUERY: ", _query);

        this._client.query(_query).then(function (_result) {
            pr.resolve(_result);
        }.bind(this), function (_err) {
            pr.reject(_err)
        }.bind(this))

        return pr.native;
    }
});

var Table = classCreator("Table", Emitter, {
    constructor: function Table(_options) {
        var base = extend({
            client: null,
            name: null,
            properties: [],
            idField: "id"
        }, _options);

        Emitter.prototype.constructor.call(this);

        this._name = base.name;
        this._properties = base.properties;
        this._propsMap = Object.create(null);
        this._client = base.client;
        this._idField = base.idField;
    },
    init: function () {
        this._properties.map((x,i) => this._propsMap[x.name] = i);

        var pr = new CustomPromise();

        log(log.DEBUG, print_f("Table [%s] loading...", this._name));

        this._exists().then(function(_exists){
            if(!_exists) {
                this._create().then(function(){
                    log(log.DEBUG, print_f("Table [%s] loaded.", this._name));
                    pr.resolve();
                }.bind(this), function(_err){
                    pr.reject({
                        sub: _err,
                        message: print_f("Error on create in Table [%s] on init", this._name)
                    })
                }.bind(this))
            } else {
                log(log.DEBUG, print_f("Table [%s] loaded.", this._name));
                pr.resolve();
            }
        }.bind(this), function(_err){
            pr.reject({
                sub: _err,
                message: "Error on exists in Table init"
            });
        }.bind(this));

        return pr.native;
    },
    getPropertyInfo: function (_name) {
        var index = this._propsMap[_name];
        return this._properties[index];
    },
    attributes: function () {
        return this._properties.map(_prop => _prop.name)
    },
    _create: function () {
        var pr = new CustomPromise();

        var propsQuery = '';

        for (var a = 0; a < this._properties.length; a++) {
            var prop = this._properties[a];

            if(a !== 0)
                propsQuery += " ";

            propsQuery += print_f('"%s" %s %s', prop.name, getDBTypeByJsType(prop.type), getOptionsForType(prop.type));

            if(a !== this._properties.length - 1)
                propsQuery += ",\n";
        }

        var createQuery = print_f('CREATE TABLE public.%s(\n%s\n)', this._name, propsQuery);

        this._client.query(createQuery).then(function(_result){
            pr.resolve();
        }.bind(this), function(_err){
            pr.reject();
        }.bind(this));

        return pr.native;
    },
    _exists: function () {
        var pr = new CustomPromise();

        var query = print_f("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '%s');", this._name);
        this._client.query(query).then(function(_result){
            pr.resolve(_result.rows[0].exists);
        }.bind(this), function(){
            pr.reject();
        }.bind(this));

        return pr.native;
    },

    _innerGet: function (_condition, _requestFields) {
        var pr = new CustomPromise();

        var cond = extractCondition(_condition);
        var fields = updateFields(_requestFields);

        var query = print_f('SELECT %s FROM public.%s WHERE %s;', fields, this._name, cond);

        log(log.DEBUG, query);

        this._client.query(query).then(function(_result){
            var out = [];
            if(_result.rowCount === 0){
                log(log.DEBUG, print_f("Rows count 0 for query - <%s>", query));
            } else {
                // if we response multiple - we need resolve object key: value
                // for (var a = 0; a < _requestFields.length; a++) {
                //     out[_requestFields[a]] = _result.rows[0][_requestFields[a]];
                // }
                // out = _result.rows;
                out = [];
                for (var a = 0; a < _result.rows.length; a++) {
                    var row = _result.rows[a];
                    var newRow = Object.create(null);
                    for(var attr in row) {
                        newRow[attr] = extractFromDbType(this.getPropertyInfo(attr).type, row[attr]);
                    }
                    out.push(newRow);
                }
            }
            pr.resolve(out);

        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    _innerSet: function (_condition, _data, _isTransaction) {
        var cond = extractCondition(_condition);

        var arr = [];
        for(var k in _data) {
            var prop = this._properties.searchByObjectKey("name", k);
            arr.push(print_f('"%s"=\'%s\'', k, convertToDBType(prop.type, _data[k])));
        }
        var props = arr.join(",");

        var query = print_f('UPDATE public.%s SET %s WHERE %s', this._name, props, cond);

        if(_isTransaction)
            return query;

        var pr = new CustomPromise();

        log(log.DEBUG, query);

        this._client.query(query).then(function(){
            pr.resolve();
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    _innerExists: function (_condition) {
        var cond = extractCondition(_condition);

        var query = print_f('SELECT 1 FROM %s WHERE %s LIMIT 1;', this._name, cond);

        var pr = new CustomPromise();

        log(log.DEBUG, query);

        this._client.query(query).then(function(_result){
            pr.resolve(_result.rowCount > 0);
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    _innerRemove: function (_condition, _isTransaction) {
        var cond = extractCondition(_condition);

        var query = print_f('DELETE FROM public.%s WHERE %s;', this._name, cond);

        if(_isTransaction)
            return query;

        var pr = new CustomPromise();

        log(log.DEBUG, query);

        this._client.query(query).then(function(_result){
            pr.resolve();
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    get: function (_id, _field) {
        var pr = new CustomPromise();

        // field can be array, and we will load all attributes in this array
        var arr = [];
        var isSingle = false;
        if(typeof _field === "string") {
            arr = [_field];
            isSingle = true;
        } else {
            arr = _field;
        }

        // TODO we need check props - if it not exist we must throw exception
        var condition = [{
            name: this._idField,
            operator: "=",
            value: _id
        }];

        this._innerGet(condition, arr).then(function(_result){
            if(_result.length === 0) {
                pr.reject();
                return;
            }

            if(isSingle) {
                pr.resolve(_result[0][_field]);
            } else {
                pr.resolve(_result[0]);
            }

        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    add: function (_props, _isTransaction) {

        var obj = {};
        for (var a = 0; a < this._properties.length; a++) {
            var prop = this._properties[a];

            // Here we pass props and fill by default values
            // may be it not good way, but why not?
            var value = null;
            var inputProp = _props[prop.name];

            // if input value is not: NaN, null or undefined
            // Case: 1 - we set input prop
            // Case: 2 - we set from defaultValue if it function
            // Case: 3 - we set from defaultValue
            // Case: 4 - we find default value by type
            if(exist(inputProp)) {
                value = inputProp;
            } else if(exist(prop.defaultValue) && typeof prop.defaultValue === "function"){
                value = prop.defaultValue();
            } else if(exist(prop.defaultValue)) {
                value = prop.defaultValue;
            } else {
                value = getDefaultValueByType(prop.type);
            }

            value = convertToDBType(prop.type, value);

            // next we add it promise all, for check when all props will filled in db
            if(exist(value))
                obj[prop.name] = value;
        }

        // we need convert object to string query
        var arrKeys = [];
        var arrVals = [];
        for(var k in obj) {
            arrKeys.push('"' + k + '"');
            arrVals.push('\'' + obj[k] + '\'');
        }

        var query = print_f('INSERT INTO public.%s(%s) VALUES (%s);', this._name, arrKeys.join(","), arrVals.join(","));

        if(_isTransaction)
            return query;

        var pr = new CustomPromise();

        log(log.DEBUG, query);

        this._client.query(query).then(function(_result){
            pr.resolve();
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    set: function (_id, _key, _value, _isTransaction) {
        // _key may be object - key: value
        if (typeof _key === "string") {
            var obj = {};
            obj[_key] = _value;
        } else if (_key instanceof Object) {
            obj = _key;
            if (exist(_value))
                _isTransaction = _value
        }

        var condition = [{
            name: this._idField,
            operator: "=",
            value: _id
        }];

        if (_isTransaction) {
            return this._innerSet(condition, obj, _isTransaction);
        }

        var pr = new CustomPromise();
        this._innerSet(condition, obj).then(function () {
            pr.resolve();
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getByCondition: function (_cond, _attributes) {
        return this._innerGet(_cond, _attributes);
    },
    setByCondition: function (_condition, _data, _isTransaction) {
        return this._innerSet(_condition, _data, _isTransaction);
    },
    existsByCondition: function (_condition, _isTransaction) {
        return this._innerExists(_condition, _isTransaction);
    },
    removeByCondition: function (_condition, _isTransaction) {
        return this._innerRemove(_condition, _isTransaction);
    },
    remove: function (_id, _isTransaction) {
        var condition = [{
            name: this._idField,
            operator: "=",
            value: _id
        }];

        return this._innerRemove(condition, _isTransaction);
    },
    all: function () {
        var props = this._properties.map(prop => '"' + prop.name + '"').join(", ");

        var query = print_f(`SELECT %s FROM public.%s;`, props, this._name);

        var pr = new CustomPromise();

        log(log.DEBUG, query);

        this._client.query(query).then(function (_result) {
            pr.resolve(_result.rows);
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    name: function () {
        return this._name;
    }
});

var getDBTypeByJsType = function (_jsType) {
    var creatingType = "";
    switch (_jsType) {
        case String:
            creatingType += "text";
            break;
        case Number:
            creatingType += "double precision";
            break;
        case Boolean:
            creatingType += "boolean";
            break;
        default:
            creatingType += "text";
            break;
    }
    return creatingType;
};

var getOptionsForType = function (_jsType) {
    var opts = "";
    switch (_jsType) {
        case String:
            opts += 'COLLATE pg_catalog."default"';
            break;
        default:
            opts += "";
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
            return "";
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
            return _value;
        default:
            return JSON.parse(Buffer.from(_value, 'base64').toString('utf8'));
    }
};

var extractCondition = function (_arr) {
    if(_arr.constructor === Array) {

        var arr = [];
        for (var a = 0; a < _arr.length; a++) {
            if ((!exist(_arr[a].name) || !exist(_arr[a].operator) || !exist(_arr[a].value)))
                throw "Exception 'condition without a data'";

            let val = _arr[a].value;
            if(typeof val === "string")
                val = val.replace("'", "''");

            arr.push(print_f("\"%s\" %s '%s'", _arr[a].name, _arr[a].operator, val));
        }
        return arr.join(" AND ");
    } else if(_arr.constructor === String) {
        return _arr;
    }
};

var updateFields = function (_fields){
    var arr = [];
    for (var a = 0; a < _fields.length; a++) {
        arr.push('"' + _fields[a] + '"');
    }
    return arr.join(",");
};

module.exports = DB;