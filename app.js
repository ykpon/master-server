var config = require('./config.js');
var funcs = require('./functions.js');
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var ipRegex = require('ip-port-regex');

var p_start = "\xFF\xFF\xFF\xFF\x66\x0A";
var p_end = "\x00\x00\x00\x00\x00\x00";
var servers = [];

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
    var req_addr = message.toString('ascii').match(ipRegex())[0];
	if(ipRegex().test(req_addr) === false) return false;
	var all_servers = servers[1].concat(servers[0]);
	var index = 0;
	if(req_addr == '0.0.0.0:0') {
		index = 0;
	} else {
		index = all_servers.indexOf(req_addr)+1;
	}
	if(all_servers[index]) {
		funcs.send_reply([p_start,all_servers[index]], remote, server);
	}
	else {
		setTimeout(function() {
			funcs.send_reply(p_start+p_end, remote, server);
		}, config.ms.delay_end_server_list * 1000);
	}
});

server.bind(config.server.port, config.server.host);