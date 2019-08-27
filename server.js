const express = require('express');
var http = require('http');
const bodyParser = require('body-parser');

const app = express();

 
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

app.use('/', require('./routes/route'));

http.createServer(app).listen(8080, function(){ 
  console.log('Express App on port 8080!');
});