var con_mysql = require('../common/connection_mysql');
var decrypt = require('../common/crypto');
var token_controller = require('./token');



exports.regist_user = async(req, res) => {

    var user_id = req.body.user_id;
    var password = decrypt.decrypt(req.body.password);

    var sql = 'INSERT INTO db_oauth.user_master (user_id, password, reg_date) VALUES(?, ?, now())';
    var params = [user_id, password];
    try {
        var result = await con_mysql.query(sql, params);
        res.status(200).send('The user info has been saved!'); 
        
    } catch(err) {
        console.log('error');     
        console.log(err); 
        res.status(500).send('Internal Server Error');
    }

};
  
exports.signin = async(req, res)  => {
    
    var user_id = req.body.user_id;
    var password = req.body.password;
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
            var tokenResult = await token_controller.set_access_token(user_id);
            result.access_token = tokenResult.access_token; 
            result.refresh_token = tokenResult.refresh_token;
            result.expire_time = tokenResult.expire_time;
        }

        res.json(result); 

    } catch(err) {
        console.log('error');     
        console.log(err); 
        res.json(result); 
    }

    

};

async function user_search (user_id , password){
    
    var decryptPassword = decrypt.decrypt(password);

    var result = new Object();
    result.errorCode = 100; // 0: 정상 , 100:유저가 없음 , 200:password 가 잘못됨, 300: 기타 오류
    result.user_id = "";
    result.reg_date = 0;
    var sql = 'SELECT user_id , password , reg_date FROM db_oauth.user_master WHERE user_id = ?';
    var params = [user_id];
    try {
        const [rows] = await con_mysql.query(sql, params);
     
        if (rows.length == 0){       
            console.log('No Record');      
            result.errorCode = 100;
        } else if(rows[0].password != decryptPassword ){            
            console.log('Password error');      
            result.errorCode = 200;
        } else {           
            result.errorCode = 0; 
            result.user_id = rows[0].user_id;
            result.reg_date = rows[0].reg_date;
        }
    } catch(err) {
        console.log('error');     
        console.log(err); 
        result.errorCode = 300;
    }
    return result;
}

exports.user_search = user_search;