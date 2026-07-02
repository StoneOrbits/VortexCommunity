var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
var rateLimit = require('express-rate-limit');
var favicon = require('serve-favicon');
const flash = require('connect-flash');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const pgPool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'vortexcommunity',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'vortex'
});

require('./config/passport')(passport);

var app = express();

const allowedOrigins = ['https://lightshow.lol', 'https://vortex.community', 'http://localhost:3000', 'http://127.0.0.1:8000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  '/firmwares',
  (req, res, next) => {
    const origin = req.headers.origin;
    if (origin === 'https://lightshow.lol') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    next();
  },
  express.static(path.join(__dirname, 'public/firmwares'))
);

app.use(express.static(path.join(__dirname, 'public')));

app.use(require('./middleware/setPageStyles'));

app.use(session({
    store: new pgSession({
      pool: pgPool,
      tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.user = req.user || null;
    const lightshowUrl = process.env.LIGHTSHOWLOL_URL || 'https://lightshow.lol';
    res.locals.lightshowUrl = lightshowUrl;
    res.locals.lightshowOrigin = new URL(lightshowUrl).origin;
    next();
});

app.use(favicon(path.join(__dirname, 'public', 'images', 'vortex-transparent.png')));

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    message: 'Too many uploads created from this IP, please try again after 15 minutes'
});
app.use('/upload', uploadLimiter);

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
var tournamentsRouter = require('./routes/tournaments');
var leaderboardRouter = require('./routes/leaderboard');

app.use('/', indexRouter);
app.use('/upload', userUploadRouter);
app.use('/firmware', firmwareUploadRouter);
app.use('/user', userRouter);
app.use('/pats', patsRouter);
app.use('/pat', patRouter);
app.use('/modes', modesRouter);
app.use('/mode', modeRouter);
app.use('/downloads', cors({
  origin: 'https://lightshow.lol',
  methods: ['GET'],
  credentials: true
}), downloadsRouter);
app.use('/register', registerRouter);
app.use('/verify', verifyRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/privacy', privacyRouter);
app.use('/terms', termsRouter);
app.use('/control', adminRouter);
app.use('/tournaments', tournamentsRouter);
app.use('/leaderboard', leaderboardRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
