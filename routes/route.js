const express = require('express');
const router = express.Router();
const user_controller = require('../controller/user');
const token_controller = require('../controller/token');
const oauth_functions = require('../controller/oauth_functions');

// 사용자 등록
router.post('/regist_user', user_controller.regist_user);

// id, password로 access token, refresh token 획득
router.post('/signin', user_controller.signin);

// id, access token으로 signout
router.post('/signout', token_controller.signout);

// id, refresh toekn으로 access token갱신
router.post('/refresh_token', token_controller.refresh_token);

// id access token 유효성 확인
router.post('/validation_token', token_controller.validation_token);


// id access token 유효성 확인
router.post('/test', oauth_functions.test);


module.exports = router;