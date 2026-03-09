# NoteShare - Student Notes Platform

A full-stack Node.js platform where students can seamlessly upload, search for, and download class notes and study materials. 

## Features
- Complete Authentication (Login/Sign Up)
- Server-side sessions and rendering
- Filter notes by Title and Subject
- Drag-and-drop file support for PDF, DOC, PPT, TXT, and images.
- Download tracking and statistics

## Start Server
```bash
npm install
npm run dev
```

## Docker Options
You can also run this using Docker:
```bash
docker build -t noteshare:latest .
docker run -p 3000:3000 -d noteshare:latest
```
