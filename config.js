var config = {};
config.db = {
    host: '', // MySQL database host
    user: '', // MySQL database username
    password: '', // MySQL database password
    database: '' // MySQL database name
};
config.server = {
    host: '0.0.0.0', // Master-Server external address
    port: '10000' // Master-Server port
};
config.ms = {
    delay_default_servers_refresh: 3600,
    boost_servers_enabled: true,
    delay_boost_servers_refresh: 1200,
    delay_end_server_list: 5
};
module.exports = config;