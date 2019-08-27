


const redisMock = require('redis-mock');
const redisPool = redisMock.createClient();


const sqlite3 = require('sqlite3').verbose();
const dbPath = '../db_oauth.db';
var db;

const dropDB = 'DROP TABLE IF EXISTS user_master';
const createDB = 'CREATE TABLE IF NOT EXISTS user_master(user_id VARCHAR(50) PRIMARY KEY , password VARCHAR(255), reg_date)';

const crypto = require('crypto');
const d = new Date();

const access_expire_time = 60;
const refresh_expire_time = 120;

initializeDB();



exports.test = async (req, res) => {
    
    await regist_user(req.body.user_id,req.body.password);
    
    var record = await signin(req.body.user_id,req.body.password);
    console.log('sign in record');
    console.log(JSON.stringify(record));


    
    var user_record = await user_search_bytoken(record.access_token);
    console.log('user record');
    console.log(JSON.stringify(user_record));
    

    var validate_record = await validation_token(req.body.user_id, record.access_token);
    console.log('validation record');
    console.log(JSON.stringify(validate_record));
    
    var validate_record2 = await validation_token_bytoken(record.access_token);
    console.log('validation record2');
    console.log(JSON.stringify(validate_record2));
    

    
    /*
    var refresh_record = await refresh_token(req.body.user_id, record.refresh_token);
    console.log('refresh record');
    console.log(JSON.stringify(refresh_record));
    */
    
    var refresh_record2 = await refresh_token_bytoken(record.refresh_token);
    console.log('refresh record2');
    console.log(JSON.stringify(refresh_record2));


    /*
    var signout_record = await signout(req.body.user_id, refresh_record.access_token);
    console.log('sign out record');
    console.log(JSON.stringify(signout_record));
    */
    var signout_record2 = await signout_bytoken(refresh_record2.access_token);
    console.log('sign out record2');
    console.log(JSON.stringify(signout_record2));
    
    res.json(record);
}




/*******************business function ************************ */

async function initializeDB(){
    await DBopen();
    await initDB();
}



// 사용자 등록 임시로 생성한 API로 추후 회원등록 및 SSO등과 연동시 변경해야 함.
async function regist_user(user_id , password){
    
    var decryptPassword = "";
    if(password) {
        decryptPassword = decrypt(password);
    } else {        
        decryptPassword = "none";
    }

    var result = new Object(); // result.errorCode  0: 정상 , 300: 기타 오류      

    //var sql = 'INSERT INTO db_oauth.user_master (user_id, password, reg_date) VALUES(?, ?, now())';
    var sql = "INSERT INTO user_master (user_id, password, reg_date) VALUES(?, ?, datetime('now','localtime'))";
    
    var params = [user_id, decryptPassword];
    try {
        //var result = await con_mysql.query(sql, params);
        await run(sql, params);
        result.errorCode = 0;
        
    } catch(err) {
        console.log('error');     
        console.log(err);   
        result.errorCode = 300;
    }
    return result;
}
  
async function signin(user_id , password){
    
    var result = new Object();

    result.errorCode = 300; // 0: 정상 , 100:유저가 없음 , 200:password 가 잘못됨, 300: 기타 오류        
    result.user_id = user_id; 
    result.access_token = ''; 
    result.refresh_token = '';
    result.expire_time = 0;

    try {
        var userLoginInfo = await user_search(user_id , password);

        result.errorCode = userLoginInfo.errorCode;
        //userLoginInfo.errorCode // 0: 정상 , 100:유저가 없음 , 200:password 가 잘못됨, 300: 기타 오류
        if(userLoginInfo.errorCode == 0){//유저 비번 검사가 완료되면
            
            // 토큰 발행
            var tokenResult = await set_access_token(user_id);
            result.access_token = tokenResult.access_token; 
            result.refresh_token = tokenResult.refresh_token;
            result.expire_time = tokenResult.expire_time;
        }

    } catch(err) {
        console.log('error');     
        console.log(err); 
        result.errorCode = 300
    }
    return result;
}

async function user_search (user_id , password){
    var decryptPassword = "";
    if(password) {
        decryptPassword = decrypt(password);
    } else {        
        decryptPassword = "none";
    }

    var result = new Object();
    result.errorCode = 100; // 0: 정상 , 100:유저가 없음 , 200:password 가 잘못됨, 300: 기타 오류
    result.user_id = "";
    result.reg_date = 0;
    //var sql = 'SELECT user_id , password , reg_date FROM db_oauth.user_master WHERE user_id = ?';
    var sql = 'SELECT user_id , password , reg_date FROM user_master WHERE user_id = ?';
    var params = [user_id];
    try {
        //const [rows] = await con_mysql.query(sql, params);         
        //const [rows] = await con_mysql.all(sql, params);
        const rows = await get(sql, params);
     
        if (!rows){       
            console.log('No Record');      
            result.errorCode = 100;
        //} else if(rows[0].password != decryptPassword ){            
        } else if(rows.password != decryptPassword ){            
            console.log('Password error');      
            result.errorCode = 200;
        } else {           
            result.errorCode = 0; 
            //result.user_id = rows[0].user_id;
            //result.reg_date = rows[0].reg_date;
            result.user_id = rows.user_id;
            result.reg_date = rows.reg_date;
        }
    } catch(err) {
        console.log('error');     
        console.log(err); 
        result.errorCode = 300;
    }
    return result;
}

async function user_search_bytoken (access_token){

    var result = new Object();
        

    result.errorCode = 100; // 0: 정상 , 100:유저가 없음 , 110:access_token이 잘못됨, 300: 기타 오류
    result.user_id = "";
    result.reg_date = 0;

    try {
        result.user_id = await getRedisData(access_token);

        if(!result.user_id) {
            result.errorCode = 110;  
        } else {
            var user_id = result.user_id;
            
            var sql = 'SELECT user_id , reg_date FROM user_master WHERE user_id = ?';
            var params = [user_id];
            //const [rows] = await con_mysql.query(sql, params);         
            //const [rows] = await con_mysql.all(sql, params);
            const rows = await get(sql, params);
        
            if (!rows){       
                console.log('No Record');      
                result.errorCode = 100;
            //} else if(rows[0].password != decryptPassword ){            
            }else {           
                result.errorCode = 0; 
                //result.user_id = rows[0].user_id;
                //result.reg_date = rows[0].reg_date;
                result.user_id = rows.user_id;
                result.reg_date = rows.reg_date;
            }
        }
    } catch(err) {
        console.log('error');     
        console.log(err); 
        result.errorCode = 300;
    }
    return result;
}



function getRedisData(key , callback) {
    // new Promise() 추가
    return new Promise(function (resolve, reject) {
        redisPool.get(key, async function (err, record){
        // 데이터를 받으면 resolve() 호출
        resolve(record);
      });
    });
  }
  
  // getDat



  async function signout_bytoken (access_token){

    var result = new Object();
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 access_token이 없음, 
    // 110:access_token이 부정확함 
    // 300: 기타 오류
    try{         
        result.user_id = await getRedisData(access_token);
        
        if(!result.user_id) {
            result.errorCode = 110;  
        } else {
            var user_id = result.user_id;
            var record = await getRedisData(user_id+'access');
            
            if(record){            
                var jsonRecord = JSON.parse(record);
                if(access_token == jsonRecord.access_token){ // 엑세스 토큰이 같다면 정상
                    await redisPool.del(user_id + 'access'); // 기존 access token 정보를 지운다.
                    await redisPool.del(user_id + 'refresh'); // 기존 refresh token 정보를 지운다.
                    await redisPool.del(jsonRecord.access_token); // 기존 access token기준의 user_id정보를 지운다.
                    await redisPool.del(jsonRecord.refresh_token); // 기존 refresh token기준의 user_id정보 정보를 지운다.
                    result.errorCode = 0;  
                }else{ // 엑세스 토큰이 다르다면
                    result.errorCode = 110;  
                }
            }else{
                result.errorCode = 100;  
            }
        }
    }catch(err) {
        result.errorCode = 300;  
    }
    return result;
} 
  
async function signout (user_id, access_token){

    var result = new Object();
    result.user_id = user_id; 
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 access_token이 없음, 
    // 110:access_token이 부정확함 
    // 300: 기타 오류
    try{            
        
        var record = await getRedisData(user_id+'access');
        
        if(record){            
            var jsonRecord = JSON.parse(record);
            if(access_token == jsonRecord.access_token){ // 엑세스 토큰이 같다면 정상
                await redisPool.del(user_id + 'access'); // 기존 access token 정보를 지운다.
                await redisPool.del(user_id + 'refresh'); // 기존 refresh token 정보를 지운다.
                result.errorCode = 0;  
            }else{ // 엑세스 토큰이 다르다면
                result.errorCode = 110;  
            }
        }else{
            result.errorCode = 100;  
        }
    }catch(err) {
        result.errorCode = 300;  
    }
    return result;
    /*
    redisPool.get(user_id+'access', async function (err, record){ // 엑세스 토큰이 있는 지 검사
    try{            
        if(err) throw new Eoor('Internal Server Error');                
        if(record){            
            var jsonRecord = JSON.parse(record);
            if(access_token == jsonRecord.access_token){ // 엑세스 토큰이 같다면 정상
                await con_redis.redisPool.del(user_id + 'access'); // 기존 access token 정보를 지운다.
                await con_redis.redisPool.del(user_id + 'refresh'); // 기존 refresh token 정보를 지운다.
                result.errorCode = 0;  
            }else{ // 엑세스 토큰이 다르다면
                result.errorCode = 110;  
            }
        }else{
            result.errorCode = 100;  
        }
        res.json(result);
    }catch(err) {
        result.errorCode = 300;  
        res.json(result);
    }
    });
    */
}
  
async function refresh_token_bytoken(refresh_token){
    var result = new Object();
    
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 refresh_token이 없음, 
    // 110:refresh_token이 부정확함 
    // 300: 기타 오류
    result.access_token = ''; 
    result.refresh_token = '';

    try{   
        
        result.user_id = await getRedisData(refresh_token);    
        
        if(!result.user_id) {
            result.errorCode = 110;  
        } else {
            var user_id = result.user_id;                  
            var refresh_record = await getRedisData(user_id+'refresh');
            if(refresh_record){ // 토큰이 있다면            
                var jsonRecord = JSON.parse(refresh_record);
                if(jsonRecord.refresh_token == refresh_token){ // 서버와 요청한 리프레시 토큰을 비교
                    var tokenResult = await set_access_token(user_id, refresh_token);
                    result.access_token = tokenResult.access_token;
                    result.refresh_token = tokenResult.refresh_token;
                    result.errorCode = 0;
                    
                }else{ // 토큰을 비교하여 틀리다면
                    result.errorCode = 110;                             
                    result.access_token = ''; 
                    result.refresh_token = '';
                }
                
            }else{ // 토큰이 없다면
                result.errorCode = 100;                             
                result.access_token = ''; 
                result.refresh_token = '';
            }
        }
       
    }catch(err) {
        result.errorCode = 300;                             
        result.access_token = ''; 
        result.refresh_token = '';
    }
    return result;
}

async function refresh_token(user_id, refresh_token){
    var result = new Object();
    
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 refresh_token이 없음, 
    // 110:refresh_token이 부정확함 
    // 300: 기타 오류
    result.user_id = user_id;     
    result.access_token = ''; 
    result.refresh_token = '';

    try{                    
        var refresh_record = await getRedisData(user_id+'refresh');
        if(refresh_record){ // 토큰이 있다면            
            var jsonRecord = JSON.parse(refresh_record);
            if(jsonRecord.refresh_token == refresh_token){ // 서버와 요청한 리프레시 토큰을 비교
                var tokenResult = await set_access_token(user_id);
                result.access_token = tokenResult.access_token;
                result.refresh_token = tokenResult.refresh_token;
                result.errorCode = 0;
                
            }else{ // 토큰을 비교하여 틀리다면
                result.errorCode = 110;                             
                result.access_token = ''; 
                result.refresh_token = '';
            }
            
        }else{ // 토큰이 없다면
            result.errorCode = 100;                             
            result.access_token = ''; 
            result.refresh_token = '';
        }
       
    }catch(err) {
        result.errorCode = 300;                             
        result.access_token = ''; 
        result.refresh_token = '';
    }
    return result;

    /*
        
    con_redis.redisPool.get(req.body.user_id+'refresh', async function (err, refresh_record) {   // 리프레시토큰이 있는지 검색
    try{                    
        if(err) throw new Eoor('Internal Server Error');                
        if(refresh_record){ // 토큰이 있다면            
            var jsonRecord = JSON.parse(refresh_record);
            if(jsonRecord.refresh_token == req.body.refresh_token){ // 서버와 요청한 리프레시 토큰을 비교
                var tokenResult = await set_access_token(req.body.user_id);
                result.access_token = tokenResult.access_token;
                result.refresh_token = tokenResult.refresh_token;
                result.errorCode = 0;
                
            }else{ // 토큰을 비교하여 틀리다면
                result.errorCode = 110;                             
                result.access_token = ''; 
                result.refresh_token = '';
            }
            
        }else{ // 토큰이 없다면
            result.errorCode = 100;                             
            result.access_token = ''; 
            result.refresh_token = '';
        }
        console.log(req.body.refresh_token);
        console.log(JSON.stringify(result));
        res.json(result);
    }catch(err) {
        result.errorCode = 300;                             
        result.access_token = ''; 
        result.refresh_token = '';
        res.json(result);
    }
    });
*/
};


async function validation_token_bytoken(access_token){

    var result = new Object();
    
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 access_token이 없음, 
    // 110:access_token이 부정확함 , 
    // 120:access_token 시간 만료로 refresh_token으로 갱신하여야함
    // 300: 기타 오류   
    result.access_token = ''; 
    result.refresh_token = '';
    try {
        
        result.user_id = await getRedisData(access_token);    
        
        if(!result.user_id) {
            result.errorCode = 110;  
        } else {
            var user_id = result.user_id;
            var record = await getRedisData(user_id+'access');
            if(record){ // 엑세스 토큰이 존재하면 엑세스 토큰 비교
                var jsonRecord = JSON.parse(record);
                var reqAccessToken = access_token;

                if(jsonRecord.access_token == reqAccessToken){ // 정상
                    result.errorCode = 0;
                    result.access_token = jsonRecord.access_token; 
                    result.refresh_token = jsonRecord.refresh_token;
                } else { // 엑세스 토큰이 다를 경우
                    result.errorCode = 110;
                    result.access_token = ''; 
                    result.refresh_token = '';
                }
            } else {    // 엑세스 토큰이 존재하지 않으면 리프레시 토큰이 있는지 검색 
                try{                   
                    var refresh_record = await getRedisData(user_id+'refresh');      
                    if(refresh_record){// 리프레시 토큰이 존재하면 갱신이 필요하다는 코드를 리턴
                        result.errorCode = 120;
                        result.access_token = ''; 
                        result.refresh_token = '';
                    } else { // user_id에 대한 토큰이 존재하지 않는다.
                        result.errorCode = 100;
                        result.access_token = ''; 
                        result.refresh_token = '';
                    }                
                }catch(err) {
                    result.errorCode = 300;                             
                    result.access_token = ''; 
                    result.refresh_token = '';
                
                }
            }
        }
    }catch(err) {
                result.errorCode = 300;                             
                result.access_token = ''; 
                result.refresh_token = '';
             
    }

    return result;
};
  
async function validation_token(user_id , access_token){

    var result = new Object();
    
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 access_token이 없음, 
    // 110:access_token이 부정확함 , 
    // 120:access_token 시간 만료로 refresh_token으로 갱신하여야함
    // 300: 기타 오류
    result.user_id = user_id;     
    result.access_token = ''; 
    result.refresh_token = '';
    try {
        
        var record = await getRedisData(user_id+'access');
        if(record){ // 엑세스 토큰이 존재하면 엑세스 토큰 비교
            var jsonRecord = JSON.parse(record);
            var reqAccessToken = access_token;

            if(jsonRecord.access_token == reqAccessToken){ // 정상
                result.errorCode = 0;
                result.access_token = jsonRecord.access_token; 
                result.refresh_token = jsonRecord.refresh_token;
            } else { // 엑세스 토큰이 다를 경우
                result.errorCode = 110;
                result.access_token = ''; 
                result.refresh_token = '';
            }
        } else {    // 엑세스 토큰이 존재하지 않으면 리프레시 토큰이 있는지 검색 
            try{                   
                var refresh_record = await getRedisData(user_id+'refresh');      
                if(refresh_record){// 리프레시 토큰이 존재하면 갱신이 필요하다는 코드를 리턴
                    result.errorCode = 120;
                    result.access_token = ''; 
                    result.refresh_token = '';
                } else { // user_id에 대한 토큰이 존재하지 않는다.
                    result.errorCode = 100;
                    result.access_token = ''; 
                    result.refresh_token = '';
                }                
            }catch(err) {
                result.errorCode = 300;                             
                result.access_token = ''; 
                result.refresh_token = '';
               
            }
        }
    }catch(err) {
                result.errorCode = 300;                             
                result.access_token = ''; 
                result.refresh_token = '';
             
    }

    return result;
    /*
    //레디스 에서 user_id로 token정보를 조회
    con_redis.redisPool.get(req.body.user_id+'access', function (err, record) {
    try {
        if(err) throw new Eoor('Internal Server Error');
        if(record){ // 엑세스 토큰이 존재하면 엑세스 토큰 비교
            var jsonRecord = JSON.parse(record);
            var reqAccessToken = req.body.access_token;

            if(jsonRecord.access_token == reqAccessToken){ // 정상
                result.errorCode = 0;
                result.access_token = jsonRecord.access_token; 
                result.refresh_token = jsonRecord.refresh_token;
            } else { // 엑세스 토큰이 다를 경우
                result.errorCode = 110;
                result.access_token = ''; 
                result.refresh_token = '';
            }
            res.json(result);
        } else {    // 엑세스 토큰이 존재하지 않으면 리프레시 토큰이 있는지 검색
            con_redis.redisPool.get(req.body.user_id+'refresh', function (err, refresh_record) {    
            try{                    
                if(err) throw new Eoor('Internal Server Error');                
                if(refresh_record){// 리프레시 토큰이 존재하면 갱신이 필요하다는 코드를 리턴
                    result.errorCode = 120;
                    result.access_token = ''; 
                    result.refresh_token = '';
                } else { // user_id에 대한 토큰이 존재하지 않는다.
                    result.errorCode = 100;
                    result.access_token = ''; 
                    result.refresh_token = '';
                }                
                res.json(result);
            }catch(err) {
                result.errorCode = 300;                             
                result.access_token = ''; 
                result.refresh_token = '';
                res.json(result);
            }
            });
        }
    }catch(err) {
                result.errorCode = 300;                             
                result.access_token = ''; 
                result.refresh_token = '';
                res.json(result);
    }
    });
    */
};

async function set_access_token(user_id, old_refresh_token){
    
    var access_token = decryptRandom(user_id + 'accesstoken'); //access token 생성 - user_id + 'accesstoken' + time 을 sha256 으로 암호화 하여 생성
    var refresh_token = decryptRandom(user_id + 'refreshtoken');//refresh token 생성 - user_id + 'refreshtoken' + time 을 sha256 으로 암호화 하여 생성

    var result = new Object();
    result.user_id = user_id; 
    result.access_token = access_token; 
    result.refresh_token = refresh_token;
    
    try {
        
        result.expire_time = access_expire_time;
        await redisPool.set(user_id + 'access', JSON.stringify(result));
        await redisPool.expire(user_id + 'access', access_expire_time); // 임시로 60초의 생성시간을 준다.
        
        await redisPool.set(user_id + 'refresh', JSON.stringify(result));
        await redisPool.expire(user_id + 'refresh', refresh_expire_time); // 임시로 120초의 생성시간을 준다

        //access_token, refresh_token을 key로 user id를 저장한다
        await redisPool.set(access_token, user_id);
        await redisPool.expire(access_token, access_expire_time); // 임시로 60초의 생성시간을 준다.
        await redisPool.set(refresh_token, user_id);
        await redisPool.expire(refresh_token, refresh_expire_time); // 임시로 120초의 생성시간을 준다.

        if(!old_refresh_token){
            await redisPool.del(old_refresh_token);
        }

        result.errorCode = 0;
    } catch(err) {
        result.errorCode = 300; 
    }
    console.log(JSON.stringify(result));
    return result;
}



























/********************                 base function **********************/

 

//회원가입 및 로그인시 password 단방향 암호화 
function decrypt(nomalString){
    //salt로 요청한 password의 첫글자를 사용    
    var stanbyString = nomalString.concat(nomalString.substr(0,1));
    var decryptString = crypto.createHash('sha256').update(stanbyString).digest('base64');

    return decryptString;
}


//access token 및 refresh token의 랜덤 문자열을 얻기위한 함수
function decryptRandom(nomalString){
    // salt로 현재 프로세스로 부터 얻어온 시간을 사용
    var stanbyString = nomalString.concat(process.hrtime.bigint());

    var decryptString = crypto.createHash('sha256').update(stanbyString).digest('base64');

    return decryptString;
}




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
            if (!err) {
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


exports.regist_user = regist_user;
exports.signin = signin;
exports.user_search_bytoken = user_search_bytoken;
exports.validation_token = validation_token;
exports.validation_token_bytoken = validation_token_bytoken;
exports.refresh_token = refresh_token;
exports.refresh_token_bytoken = refresh_token_bytoken;
exports.signout = signout;
exports.signout_bytoken = signout_bytoken;