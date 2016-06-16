module.exports = {
    listen: function(event_name, method, context) {
        // console.log('event_name', event_name, 'context', context, 'method', method);
        if (!this.events) {
            this.events = {};
        }
        var handlers = this.events[event_name];
        if (!handlers){
            handlers = this.events[event_name] = [];
        }
        handlers.push({
            method: method,
            context: (context ? context : {})
        });
    },
    fire: function(event_name, data) {
        // console.log('event_name', event_name, 'data', data);
        if (!this.events) {
            return;
        }
        var handlers = this.events[event_name];
        if (!handlers){
            return;
        }
        for (var i = 0, n = handlers.length; i < n; ++i) {
            var handler = handlers[i];
            // console.log('handler.method', handler.method);
            if (handler.method.call(handler.context, event_name, data) === false) {
                return false;
            }
        }
        return true;
    }
};