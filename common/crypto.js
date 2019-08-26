var crypto = require('crypto');
var d = new Date();
 
function decrypt(nomalString){
    var stanbyString = nomalString.concat(nomalString.substr(0,1));
    var decryptString = crypto.createHash('sha256').update(stanbyString).digest('base64');

    return decryptString;
}

function decryptRandom(nomalString){
    
    var stanbyString = nomalString.concat(process.hrtime.bigint());

    var decryptString = crypto.createHash('sha256').update(stanbyString).digest('base64');

    return decryptString;
}

exports.decrypt = decrypt;
exports.decryptRandom = decryptRandom;