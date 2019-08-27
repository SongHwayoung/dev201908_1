var con_redis = require('../common/connection_redis');
var decrypt = require('../common/crypto');
const access_expire_time = 60;
const refresh_expire_time = 120;

exports.signout = (req, res) => {

    var user_id = req.body.user_id;
    var access_token = req.body.access_token;

    var result = new Object();
    result.user_id = user_id; 
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 access_token이 없음, 
    // 110:access_token이 부정확함 
    // 300: 기타 오류

    con_redis.redisPool.get(user_id+'access', async function (err, record){ // 엑세스 토큰이 있는 지 검사
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
}; 
  
exports.refresh_token = (req, res) => {
    var result = new Object();
    
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 refresh_token이 없음, 
    // 110:refresh_token이 부정확함 
    // 300: 기타 오류
    result.user_id = req.body.user_id;     
    result.access_token = ''; 
    result.refresh_token = '';
        
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

};
  
exports.validation_token = (req, res) => {

    var result = new Object();
    
    result.errorCode = 300; 
    // 0: 정상 , 
    // 100:요청한 user_id에 대한 access_token이 없음, 
    // 110:access_token이 부정확함 , 
    // 120:access_token 시간 만료로 refresh_token으로 갱신하여야함
    // 300: 기타 오류
    result.user_id = req.body.user_id;     
    result.access_token = ''; 
    result.refresh_token = '';

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
};

async function set_access_token(user_id){
    
    var access_token = decrypt.decryptRandom(user_id + 'accesstoken'); //access token 생성 - user_id + 'accesstoken' + time 을 sha256 으로 암호화 하여 생성
    var refresh_token = decrypt.decryptRandom(user_id + 'refreshtoken');//refresh token 생성 - user_id + 'refreshtoken' + time 을 sha256 으로 암호화 하여 생성

    var result = new Object();
    result.user_id = user_id; 
    result.access_token = access_token; 
    result.refresh_token = refresh_token;
    
    try {
        
        result.expire_time = access_expire_time;
        await con_redis.redisPool.set(user_id + 'access', JSON.stringify(result));
        await con_redis.redisPool.expire(user_id + 'access', access_expire_time); // 임시로 60초의 생성시간을 준다.
        
        await con_redis.redisPool.set(user_id + 'refresh', JSON.stringify(result));
        await con_redis.redisPool.expire(user_id + 'refresh', refresh_expire_time); // 임시로 120초의 생성시간을 준다
        result.errorCode = 0;
    } catch(err) {
        result.errorCode = 300; 
    }
    console.log(JSON.stringify(result));
    return result;
}

exports.set_access_token = set_access_token;