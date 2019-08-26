
const promiseMysql = require('mysql2/promise');


var myPool = promiseMysql.createPool({
    connectionLimit : 10,
    host: '127.0.0.1',
    port: '3306',
    user: 'hisong',
    password: '1234',
    database: 'db_oauth'
});

async function query(query , params) {
    try {
       
        const connection = await myPool.getConnection();
        const result = await connection.query(query, params);

        connection.release();
        return result;
        
    } catch(err) {
        console.log(err.message);
    } 
}

exports.query = query;
