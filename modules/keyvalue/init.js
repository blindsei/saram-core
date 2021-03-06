var XXHash = require('xxhash');
var DB = require('../../system/db/index.js');
var DBParam = require('../../system/db/param.js');
var HashShard = require('../../system/db/partitioners/hashshard/index.js');


function initKeyValueModule(ctx) {
    this.config = {};

    this.config.name = ctx.req.body.getValue("name");
    this.config.param = ctx.req.body.getValue("param", []);
    this.config.list = ctx.req.body.getValue("list", false);
    this.config.columns = ctx.req.body.getValue("columns", {value:{type:"string",length:256}});

    var param = new DBParam(this.config.param, "int64", "UNIQUE");

    var shardingItems = [param];
    if(!this.config.list) {
        shardingItems.push(function(ctx, args) { return XXHash.hash(new Buffer(args.key), 0x654C6162); });
    }

    var hashshard = new HashShard(shardingItems);

    var tableColumns = { 'key':'int64', 'str':{type:"string", length:64} };
    for(var name in this.config.columns) {
        tableColumns[name] = this.config.columns[name];
    }

    DB.setTable(ctx, {
        name : this.config.name,
        columns : param.getColumns(tableColumns),
        indexes : [param.getIndex("key", [["key", "ASC"]])]
    });

    var selectQueryColumns = { uuid:'uuid', str:'key' };
    for(var name in this.config.columns) {
        selectQueryColumns[name] = name;
    }

    DB.setQuery(ctx, {
        name : "keyvalue.get",
        action : 'select',
        table : this.config.name,
        partitioner:hashshard,
        columns : selectQueryColumns,
        conditions : [
            { oper:'param', param:param },
            { oper:'equal', column:'key', var: function(ctx, args) { return XXHash.hash(new Buffer(args.key), 0x654C6162); }}
        ]
    });
    DB.setQuery(ctx, {
        name : "keyvalue.list",
        action : 'select',
        table : this.config.name,
        partitioner:hashshard,
        columns : selectQueryColumns,
        conditions : [
            { oper:'param', param:param }
        ]
    });

    var insertQueryColumns = {
        param:param,
        key:function(ctx, args) { return XXHash.hash(new Buffer(args.key), 0x654C6162); },
        str : 'key'
    };
    for(var name in this.config.columns) {
        insertQueryColumns[name] = name;
    }

    var updateQueryColumns = {};
    for(var name in this.config.columns) {
        updateQueryColumns[name] = name;
    }


    DB.setQuery(ctx, {
        name : "keyvalue.set",
        action : 'upsert',
        table : this.config.name,
        partitioner:hashshard,
        columns : insertQueryColumns,
        update : updateQueryColumns
    });
}

module.exports = initKeyValueModule;
