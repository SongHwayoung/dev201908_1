
/*const promiseMysql = require('mysql2/promise');


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

*/

const sqlite3 = require('sqlite3').verbose();
const dbPath = '../db_oauth.db';
var db;

const dropDB = 'DROP TABLE IF EXISTS user_master';

const createDB = 'CREATE TABLE IF NOT EXISTS user_master(user_id VARCHAR(50) PRIMARY KEY , password VARCHAR(255), reg_date)';



function DBopen() {
    return new Promise(function(resolve) {
    this.db = new sqlite3.Database(dbPath, 
        function(err) {
            if(err) {
                reject("Open error: "+ err.message);
            } else {
                resolve(dbPath + " opened");
            }
        }
    )   
    });
}


function DBclose() {
    return new Promise(function(resolve, reject) {

        this.db.close((err) => {
          if (err) {
            console.error(err.message);
            reject(err);
          } else {
            console.log('Close the database connection.');
            resolve(true);
          }
         
        });        
    }) 
}

// any query: insert/delete/update
function run(query, params) {
    return new Promise(function(resolve, reject) {
        this.db.run(query, params, 
            function(err)  {
                if(err) {
                    reject(err.message);
                } else {
                    resolve(true);
                }
        });
    });
}

// first row read
function get(query, params) {
    return new Promise(function(resolve, reject) {
        this.db.get(query, params, function(err, row)  {
            if(err) {
                reject("Read error: " + err.message);
            }else {
                resolve(row);
            };
        });
    });
}

// set of rows read
function all(query, params) {
    return new Promise(function(resolve, reject) {
        if(params == undefined) {
            params=[];
        } 
        console.log(query);
        console.log(params);
        this.db.all(query, params, function(err, rows)  {
            if(err) {
                reject("Read error: " + err.message);
            } else {
                resolve(rows);
            }
        })
    }) 
}

  
// init database;
function initDB () {
    return run(createDB);
}


//exports.query = query;

exports.initDB = initDB;
exports.run = run;
exports.get = get;
exports.all = all;
exports.DBopen = DBopen;
exports.DBclose = DBclose;

