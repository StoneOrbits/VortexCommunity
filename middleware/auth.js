function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect((req.app.locals.basePath || '') + '/login');
}
