const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cookieSession = require('cookie-session');
const passport = require('passport');
const settings = require('./settings.json');
const client = require('./modules/discord-bot');

const r = require('./modules/database');
const app = express();
const http = require('http');
const server = http.createServer(app);
const user = require('./modules/user');

// view engine setup
app.set('views', path.join(__dirname, 'views/templates'));
app.set('view engine', 'ejs');
app.set('view options', {pretty: true});
app.locals.pretty = app.get('env') === 'development';

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use(cookieSession({
  secret: settings.secret,
  maxAge: 1000 * 60 * 60 * 24 * 7
}));

app.use(cookieParser(settings.secret));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', require('./routes/index'));
app.use('/bots', require('./routes/bots'));
app.use('/user', require('./routes/user'))
app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth'));
app.use('/docs', require('./routes/docs'));
app.use('/staff', require('./routes/staff'))
app.use(user.configure)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error', { title: 'Error', status: err.status, message: err.message });
});

server.listen(process.env.PORT || 80);


