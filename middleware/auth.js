function requireAuth(req, res, next) {
    if (!req.session.userId) {
        req.session.error = 'Please log in to access this page.';
        return res.redirect('/login');
    }
    next();
}

function setLocals(db) {
    return (req, res, next) => {
        res.locals.currentUser = null;
        if (req.session.userId) {
            const user = db.prepare('SELECT id, username, email, avatar_color FROM users WHERE id = ?').get(req.session.userId);
            if (user) {
                res.locals.currentUser = user;
            }
        }
        next();
    };
}

module.exports = { requireAuth, setLocals };
