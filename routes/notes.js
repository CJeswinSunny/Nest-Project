const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp'
];

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not supported. Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG, WEBP'));
        }
    }
});

const SUBJECTS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'Computer Science', 'English', 'History', 'Geography',
    'Economics', 'Business Studies', 'Psychology', 'Philosophy',
    'Engineering', 'Medicine', 'Law', 'Arts', 'Other'
];

module.exports = function (db) {

    // GET / — Home page with notes listing
    router.get('/', (req, res) => {
        const { search, subject, sort } = req.query;
        let query = `
      SELECT notes.*, users.username, users.avatar_color
      FROM notes
      JOIN users ON notes.user_id = users.id
    `;
        const conditions = [];
        const params = [];

        if (search) {
            conditions.push(`(notes.title LIKE ? OR notes.description LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }

        if (subject && subject !== 'All') {
            conditions.push(`notes.subject = ?`);
            params.push(subject);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Sort
        switch (sort) {
            case 'oldest':
                query += ' ORDER BY notes.created_at ASC';
                break;
            case 'popular':
                query += ' ORDER BY notes.download_count DESC';
                break;
            default:
                query += ' ORDER BY notes.created_at DESC';
        }

        const notes = db.prepare(query).all(...params);

        // Get note counts per subject for sidebar
        const subjectCounts = db.prepare(`
      SELECT subject, COUNT(*) as count FROM notes GROUP BY subject ORDER BY count DESC
    `).all();

        const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes').get().count;
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const totalDownloads = db.prepare('SELECT COALESCE(SUM(download_count), 0) as count FROM notes').get().count;

        res.render('home', {
            title: 'NoteShare — Student Notes Sharing Platform',
            notes,
            subjects: SUBJECTS,
            subjectCounts,
            currentSearch: search || '',
            currentSubject: subject || 'All',
            currentSort: sort || 'newest',
            stats: { totalNotes, totalUsers, totalDownloads }
        });
    });

    // GET /notes/upload
    router.get('/notes/upload', requireAuth, (req, res) => {
        res.render('upload', { title: 'Upload Note', subjects: SUBJECTS });
    });

    // POST /notes/upload
    router.post('/notes/upload', requireAuth, (req, res) => {
        upload.single('file')(req, res, (err) => {
            if (err) {
                req.session.error = err.message || 'File upload failed.';
                return res.redirect('/notes/upload');
            }

            if (!req.file) {
                req.session.error = 'Please select a file to upload.';
                return res.redirect('/notes/upload');
            }

            const { title, subject, description } = req.body;

            if (!title || !subject) {
                // Cleanup uploaded file
                fs.unlinkSync(req.file.path);
                req.session.error = 'Title and subject are required.';
                return res.redirect('/notes/upload');
            }

            db.prepare(`
        INSERT INTO notes (user_id, title, subject, description, filename, original_name, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
                req.session.userId,
                title,
                subject,
                description || '',
                req.file.filename,
                req.file.originalname,
                req.file.size
            );

            req.session.success = 'Note uploaded successfully! 📝';
            res.redirect('/');
        });
    });

    // GET /notes/:id — Note detail page
    router.get('/notes/:id', (req, res) => {
        const note = db.prepare(`
      SELECT notes.*, users.username, users.avatar_color
      FROM notes
      JOIN users ON notes.user_id = users.id
      WHERE notes.id = ?
    `).get(req.params.id);

        if (!note) {
            req.session.error = 'Note not found.';
            return res.redirect('/');
        }

        // Get more notes from same user
        const moreFromUser = db.prepare(`
      SELECT * FROM notes WHERE user_id = ? AND id != ? ORDER BY created_at DESC LIMIT 4
    `).all(note.user_id, note.id);

        // Get related notes (same subject)
        const relatedNotes = db.prepare(`
      SELECT notes.*, users.username, users.avatar_color
      FROM notes
      JOIN users ON notes.user_id = users.id
      WHERE notes.subject = ? AND notes.id != ?
      ORDER BY notes.download_count DESC
      LIMIT 4
    `).all(note.subject, note.id);

        res.render('note-detail', {
            title: note.title + ' — NoteShare',
            note,
            moreFromUser,
            relatedNotes
        });
    });

    // GET /notes/:id/download
    router.get('/notes/:id/download', (req, res) => {
        const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);

        if (!note) {
            req.session.error = 'Note not found.';
            return res.redirect('/');
        }

        // Increment download count
        db.prepare('UPDATE notes SET download_count = download_count + 1 WHERE id = ?').run(note.id);

        const filePath = path.join(uploadsDir, note.filename);
        if (!fs.existsSync(filePath)) {
            req.session.error = 'File not found on server.';
            return res.redirect('/notes/' + note.id);
        }

        res.download(filePath, note.original_name);
    });

    // POST /notes/:id/delete
    router.post('/notes/:id/delete', requireAuth, (req, res) => {
        const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);

        if (!note) {
            req.session.error = 'Note not found or not authorized.';
            return res.redirect('/my-notes');
        }

        // Delete file
        const filePath = path.join(uploadsDir, note.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        db.prepare('DELETE FROM notes WHERE id = ?').run(note.id);

        req.session.success = 'Note deleted successfully.';
        res.redirect('/my-notes');
    });

    // GET /my-notes
    router.get('/my-notes', requireAuth, (req, res) => {
        const notes = db.prepare(`
      SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.session.userId);

        const totalDownloads = db.prepare(`
      SELECT COALESCE(SUM(download_count), 0) as count FROM notes WHERE user_id = ?
    `).get(req.session.userId).count;

        res.render('my-notes', {
            title: 'My Notes — NoteShare',
            notes,
            totalDownloads
        });
    });

    return router;
};
