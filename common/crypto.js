var crypto = require('crypto');
var d = new Date();
 

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

exports.decrypt = decrypt;
exports.decryptRandom = decryptRandom;