const express = require('express');
const router = express.Router();
const user_controller = require('../controller/user');
const token_controller = require('../controller/token');

router.post('/regist_user', user_controller.regist_user);

router.post('/signin', user_controller.signin);

router.post('/signout', token_controller.signout);

router.post('/refresh_token', token_controller.refresh_token);

router.post('/validation_token', token_controller.validation_token);



module.exports = router;