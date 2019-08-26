var redisPool = require('redis-connection-pool')('myRedisPool',{
    host: '127.0.0.1', //default
    port: 6379, //default
    max_clients: 30, //defalut
    perform_checks: false //checks for needed push/pop functionality   
});



exports.redisPool = redisPool;
