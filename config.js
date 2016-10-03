var config = {};
config.db = {
    host: 'sql7.freesqldatabase.com', // MySQL database host
    user: 'sql7138090', // MySQL database username
    password: 'N9lgALdpAH', // MySQL database password
    database: 'sql7138090' // MySQL database name
};
config.server = {
    host: '0.0.0.0', // Master-Server external address
    port: '10000' // Master-Server port
};
config.ms = {
    delay_default_servers_refresh: 3600,
    boost_servers_enabled: true,
    delay_boost_servers_refresh: 1200
};
module.exports = config;