var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('./config/database');
var passport = require('passport');
var rateLimit = require('express-rate-limit');
var favicon = require('serve-favicon');
const flash = require('connect-flash');
require('dotenv').config();

// NOTE! You must create a .env file with:
//  VORTEX_COMMUNITY_API_KEY=...
//  SESSION_SECRET=...
//  MONGO_URI=mongodb://0.0.0.0:27017/vortexcommunity

var app = express();

require('./config/passport')(passport);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: 'mongodb://0.0.0.0:27017/vortexcommunity',
      mongooseConnection: mongoose.connection
    })
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Middleware to handle flash messages and assign user
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// icon
app.use(favicon(path.join(__dirname, 'public', 'images', 'vortex-transparent.png')));

// Rate limiter for uploads
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    message: 'Too many uploads created from this IP, please try again after 15 minutes'
});
app.use('/upload', uploadLimiter);

// Routes
var indexRouter = require('./routes/index');
var userUploadRouter = require('./routes/userUpload');
var firmwareUploadRouter = require('./routes/firmwareUpload');
var userRouter = require('./routes/user');
var modesRouter = require('./routes/modes');
var downloadsRouter = require('./routes/downloads');
var modeRouter = require('./routes/mode');
var registerRouter = require('./routes/register');
var verifyRouter = require('./routes/verify');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');

app.use('/', indexRouter);
app.use('/upload', userUploadRouter);
app.use('/firmware', firmwareUploadRouter);
app.use('/user', userRouter);
app.use('/modes', modesRouter);
app.use('/downloads', downloadsRouter);
app.use('/mode', modeRouter);
app.use('/register', registerRouter);
app.use('/verify', verifyRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;

