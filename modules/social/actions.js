var Call = require('../../system/call/index.js');

var UUID_Reg = /^[0-9A-Fa-f]+$/;

module.exports = {
    weld: function (ctx) {
        var uuid = ctx.req.param.uuid;
        ctx.errorTry(!uuid.match(UUID_Reg), Error); // 'weld.notuid'
        ctx.param.set(ctx.current.module.getMid(), "uuid", uuid);
    },
    addFollowing:function(ctx) {
        ctx.current.autoNext = false;

        var module = ctx.current.module;
        var object = ctx.req.body.getValue("object");
        var target = ctx.req.body.getValue("target");

        var count = 0;
        var callback = function(obj) {
            count = count + 1;
            if(count >= 2) {
                ctx.res.send({state:'OK'});
                ctx.current.next();
            }
        }

        Call.post(ctx, "/" + object + "/following/", {weld:module, data:{value:target}}, function(obj) {
            callback(obj);
        });
        Call.post(ctx, "/" + target + "/follower/", {weld:module, data:{value:object}}, function(obj) {
            callback(obj);
        });
    },
    boxlist:function(ctx) {
        ctx.current.autoNext = false;
        
        var saram = ctx.getSaram();
        var object = ctx.req.param.uuid;
        ctx.errorTry(!object.match(UUID_Reg), Error); // 'notuuid'

        Call.get(ctx, "/" + object + "/follower/", {weld:ctx.current.module, query:{}}, function(obj) {
            ctx.errorTry(obj.error, Error);

            var list = [];
            for(var i in obj.items) {
                list.push(obj.items[i].value);
            }
            list.push(object);
            ctx.res.send({target:list});
            ctx.current.next();
        });
    }
}
