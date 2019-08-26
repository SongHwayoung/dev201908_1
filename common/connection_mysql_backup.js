var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit : 10,
    host: '127.0.0.1',
    port: '3306',
    user: 'hisong',
    password: '1234',
    database: 'db_oauth'
});

var DB = (function () {
    function _query(query, params, callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                
                console.log(err.message);
                connection.release();
                callback(null, err);
                throw err;
            }
            connection.query(query, params, function (err, rows) {
                connection.release();
                if (!err) {
                    callback(rows);
                }else {
                    callback(null, err);
                }
            });
            connection.on('error', function (err) {
                connection.release();
                callback(null, err);
                throw err;
            });
        });
    }
    return {
        query: _query
    };
})();
module.exports = DB;

