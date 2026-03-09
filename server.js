const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const { initDB } = require('./db/database');
const { setLocals } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initDB();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sessions
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'db') }),
  secret: 'student-notes-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Attach user to all views
app.use(setLocals(db));

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  delete req.session.success;
  delete req.session.error;
  next();
});

// Routes
const authRoutes = require('./routes/auth')(db);
const notesRoutes = require('./routes/notes')(db);

app.use('/', authRoutes);
app.use('/', notesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 — Page Not Found</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body{font-family:'Inter',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa;color:#333;text-align:center}
    .c{padding:40px}.e{font-size:6rem;margin-bottom:10px}h1{font-size:3rem;color:#6c5ce7;margin:10px 0}h2{margin:10px 0;font-weight:400}
    a{display:inline-block;margin-top:20px;padding:12px 30px;background:#6c5ce7;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}</style>
    </head><body><div class="c"><div class="e">🔍</div><h1>404</h1><h2>Page Not Found</h2><p>Sorry, the page you're looking for doesn't exist.</p><a href="/">Back to Home</a></div></body></html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body{font-family:'Inter',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa;color:#333;text-align:center}
    .c{padding:40px}.e{font-size:6rem;margin-bottom:10px}h1{font-size:3rem;color:#e74c3c;margin:10px 0}h2{margin:10px 0;font-weight:400}
    a{display:inline-block;margin-top:20px;padding:12px 30px;background:#6c5ce7;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}</style>
    </head><body><div class="c"><div class="e">⚠️</div><h1>Oops!</h1><h2>Something went wrong</h2><p>An unexpected error occurred. Please try again later.</p><a href="/">Back to Home</a></div></body></html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Student Notes Platform running at http://localhost:${PORT}`);
});
