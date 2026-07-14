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

const BASE_PATH = process.env.BASE_PATH || '';
const LIGHTSHOWLOL_DIR = path.join(__dirname, 'lightshow.lol');

const pgPool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'vortexcommunity',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'vortex'
});

require('./config/passport')(passport);

var app = express();

app.set('trust proxy', 1);
app.locals.basePath = BASE_PATH;

const allowedOrigins = ['https://lightshow.lol', 'https://vortex.community', 'http://localhost:3000', 'http://127.0.0.1:8000', 'http://localhost:8000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
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
  BASE_PATH + '/firmwares',
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

app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));

if (require('fs').existsSync(LIGHTSHOWLOL_DIR)) {
  app.use('/', express.static(LIGHTSHOWLOL_DIR));
}

app.use(require('./middleware/setPageStyles'));

app.use(session({
    store: new pgSession({
      pool: pgPool,
      tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { path: '/', maxAge: 30 * 24 * 60 * 60 * 1000, secure: 'auto', sameSite: 'lax' }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    if (req.originalUrl.includes('/community')) {
      console.log('[SESS]', req.method, req.originalUrl,
        'cookie:', req.headers.cookie ? req.headers.cookie.substring(0, 60) : 'MISSING',
        'user:', req.user ? req.user.id : 'none');
      const origSetHeader = res.setHeader.bind(res);
      res.setHeader = function(name, value) {
        if (name.toLowerCase() === 'set-cookie') {
          console.log('[SET-COOKIE]', value);
        }
        return origSetHeader(name, value);
      };
    }
    next();
});

app.use(flash());

app.use((req, res, next) => {
    res.locals.basePath = BASE_PATH;
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.user = req.user || null;
    const lightshowUrl = process.env.LIGHTSHOWLOL_URL || 'https://lightshow.lol';
    res.locals.lightshowUrl = lightshowUrl;
    res.locals.lightshowOrigin = new URL(lightshowUrl).origin;
    next();
});

app.use(BASE_PATH + '/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'images', 'vortex-transparent.png'));
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    message: 'Too many uploads created from this IP, please try again after 15 minutes'
});
app.use(BASE_PATH + '/upload', uploadLimiter);

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

app.use(BASE_PATH + '/', indexRouter);
app.use(BASE_PATH + '/upload', userUploadRouter);
app.use(BASE_PATH + '/firmware', firmwareUploadRouter);
app.use(BASE_PATH + '/user', userRouter);
app.use(BASE_PATH + '/pats', patsRouter);
app.use(BASE_PATH + '/pat', patRouter);
app.use(BASE_PATH + '/modes', modesRouter);
app.use(BASE_PATH + '/mode', modeRouter);
app.use(BASE_PATH + '/downloads', cors({
  origin: 'https://lightshow.lol',
  methods: ['GET'],
  credentials: true
}), downloadsRouter);
app.use(BASE_PATH + '/register', registerRouter);
app.use(BASE_PATH + '/verify', verifyRouter);
app.use(BASE_PATH + '/login', loginRouter);
app.use(BASE_PATH + '/logout', logoutRouter);
app.use(BASE_PATH + '/privacy', privacyRouter);
app.use(BASE_PATH + '/terms', termsRouter);
app.use(BASE_PATH + '/control', adminRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    const message = err.message || 'Unknown Error';
    const basePath = res.locals && res.locals.basePath ? res.locals.basePath : '';
    const hint = status === 404 ? 'The page you\'re looking for doesn\'t exist or has been moved.' :
                 status === 500 ? 'A server error occurred.' : 'Something went wrong.';
    res.status(status);
    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0}body{background:#121212;color:#fff;font-family:Arial,sans-serif;min-height:100vh;display:flex;justify-content:center;align-items:center}
.card{text-align:center;padding:48px 32px;max-width:420px}
.code{font-size:72px;font-weight:800;color:#1abc9c;margin:0 0 8px;line-height:1}
.msg{font-size:18px;color:#eee;margin:0 0 12px}
.hint{font-size:14px;color:#999;margin:0 0 28px}
.btn{display:inline-block;background:#1abc9c;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none}
.btn:hover{background:#16a085}
</style></head>
<body><div class="card">
<h1 class="code">${status}</h1>
<p class="msg">${message}</p>
<p class="hint">${hint}</p>
<a href="${basePath}/" class="btn">&larr; Go Home</a>
</div></body></html>`);
});

module.exports = app;
