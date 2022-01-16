var express = require('express');
require('express-async-errors')
var path = require('path');
var cookieParser = require('cookie-parser');
// var logger = require('morgan');
var log4js = require('log4js')
log4js.configure('./log4js.json')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// app.use(logger('dev'));
app.use(log4js.connectLogger(log4js.getLogger('http'), {level: 'auto'}))

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) =>{
  log4js.getLogger('default').error(err.message, err)
  if(req.xhr){
    return res.json({
      code: -1,
      message: err.message
    })
  }
  next(err)
})

app.use('/', indexRouter);

module.exports = app;
