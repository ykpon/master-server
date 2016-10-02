var config = require('./config.js');
var funcs = require('./functions.js');
var dgram = require('dgram');
var server = dgram.createSocket('udp4');

var p_start = "\xFF\xFF\xFF\xFF\x66\x0A";
var p_end = "\x00\x00\x00\x00\x00\x00";
var servers = ["", []];

setInterval(funcs.an(function() {
    funcs.get_servers('all', function(err, content) {
        if (err) throw err;
        else servers[0] = content;
    });
})(), config.ms.delay_default_servers_refresh * 1000);
if (config.ms.boost_servers_enabled) {
    setInterval(funcs.an(function() {
        funcs.get_servers('boost', function(err, content) {
            if (err) throw err;
            else servers[1] = content;
        });
    })(), config.ms.delay_boost_servers_refresh * 1000);
}

server.on('listening', function() {
    var address = server.address();
    console.log('MS listening on ' + address.address + ":" + address.port);
});

server.on('message', function(message, remote) {
    //console.log(remote.address + ':' + remote.port + ' - ' + message);
    if (message.toString('ascii').indexOf('0.0.0.0:0') == '-1' || servers[0] == "") {
        return false;
    }

    if (servers[1].length > 0) {
        var i = 0;
        var bsi = setInterval(function() {
            funcs.send_reply([p_start, servers[1][i++]], remote, server);
            if (i == servers[1].length) {
				setTimeout(function() {
					funcs.send_reply(p_start + servers[0] + p_end, remote, server);
				}, config.ms.delay_default_servers_reply * 1000);
				clearInterval(bsi);
			}
        }, config.ms.delay_boost_servers_reply * 1000);
    } else {
        funcs.send_reply(p_start + servers[0] + p_end, remote, server);
    }
});

server.bind(config.server.port, config.server.host);