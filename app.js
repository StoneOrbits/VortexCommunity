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
const cors = require('cors');
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

// servce static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add CORS headers specifically for the 'firmwares' folder
app.use('/firmwares', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin === 'https://lightshow.lol') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  next();
});

// Use the setPageStyles middleware to inject css
app.use(require('./middleware/setPageStyles'));

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
var userUploadRouter = require('./routes/upload');
var firmwareUploadRouter = require('./routes/firmware-upload');
var userRouter = require('./routes/user');
var patsRouter = require('./routes/pats');
var patRouter = require('./routes/pat');
var modesRouter = require('./routes/modes');
var modeRouter = require('./routes/mode');
var downloadsRouter = require('./routes/downloads');
var registerRouter = require('./routes/register');
var verifyRouter = require('./routes/verify');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var adminRouter = require('./routes/admin');
var privacyRouter = require('./routes/privacy');
var termsRouter = require('./routes/terms');

app.use('/', indexRouter);
app.use('/upload', userUploadRouter);
app.use('/firmware', firmwareUploadRouter);
app.use('/user', userRouter);
app.use('/pats', patsRouter);
app.use('/pat', patRouter);
app.use('/modes', modesRouter);
app.use('/mode', modeRouter);
app.use('/downloads', downloadsRouter);
app.use('/register', registerRouter);
app.use('/verify', verifyRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/privacy', privacyRouter);
app.use('/terms', termsRouter);
app.use('/control', adminRouter);

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

