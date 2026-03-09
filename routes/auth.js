const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const AVATAR_COLORS = [
    '#6C63FF', '#FF6584', '#43E97B', '#F7971E', '#00D2FF',
    '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#3B82F6'
];

module.exports = function (db) {

    // GET /register
    router.get('/register', (req, res) => {
        if (req.session.userId) return res.redirect('/');
        res.render('register', { title: 'Register' });
    });

    // POST /register
    router.post('/register', async (req, res) => {
        try {
            const { username, email, password, confirmPassword } = req.body;

            // Validation
            if (!username || !email || !password || !confirmPassword) {
                req.session.error = 'All fields are required.';
                return res.redirect('/register');
            }

            if (password.length < 6) {
                req.session.error = 'Password must be at least 6 characters.';
                return res.redirect('/register');
            }

            if (password !== confirmPassword) {
                req.session.error = 'Passwords do not match.';
                return res.redirect('/register');
            }

            // Check existing user
            const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
            if (existing) {
                req.session.error = 'Username or email already exists.';
                return res.redirect('/register');
            }

            // Hash password and create user
            const hash = await bcrypt.hash(password, 12);
            const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

            const result = db.prepare(
                'INSERT INTO users (username, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)'
            ).run(username, email, hash, avatarColor);

            req.session.userId = result.lastInsertRowid;
            req.session.success = 'Welcome to NoteShare! 🎉';
            res.redirect('/');
        } catch (err) {
            console.error(err);
            req.session.error = 'Something went wrong. Please try again.';
            res.redirect('/register');
        }
    });

    // GET /login
    router.get('/login', (req, res) => {
        if (req.session.userId) return res.redirect('/');
        res.render('login', { title: 'Login' });
    });

    // POST /login
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                req.session.error = 'All fields are required.';
                return res.redirect('/login');
            }

            const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            if (!user) {
                req.session.error = 'Invalid email or password.';
                return res.redirect('/login');
            }

            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                req.session.error = 'Invalid email or password.';
                return res.redirect('/login');
            }

            req.session.userId = user.id;
            req.session.success = `Welcome back, ${user.username}! 👋`;
            res.redirect('/');
        } catch (err) {
            console.error(err);
            req.session.error = 'Something went wrong. Please try again.';
            res.redirect('/login');
        }
    });

    // GET /logout
    router.get('/logout', (req, res) => {
        req.session.destroy(() => {
            res.redirect('/');
        });
    });

    return router;
};
