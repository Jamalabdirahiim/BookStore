const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); // Import multer
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const fs = require('fs');

// Ensure Upload Directory Exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Use absolute path
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// API Routes

// Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the URL path
    res.json({ url: '/uploads/' + req.file.filename });
});

// GET all books
app.get('/api/books', (req, res) => {
    const { category } = req.query;
    let sql = 'SELECT * FROM books';
    let params = [];

    if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// GET book by id
app.get('/api/books/:id', (req, res) => {
    const sql = 'SELECT * FROM books WHERE id = ?';
    const params = [req.params.id];
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: row });
    });
});

// ADD a new book (Admin)
app.post('/api/books', (req, res) => {
    const { title, author, price, category, description, image_url, stock } = req.body;
    const sql = 'INSERT INTO books (title, author, price, category, description, image_url, stock) VALUES (?,?,?,?,?,?,?)';
    const params = [title, author, price, category, description, image_url, stock];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Book created', id: this.lastID });
    });
});

// UPDATE a book (Admin)
app.put('/api/books/:id', (req, res) => {
    const { title, author, price, category, description, image_url, stock } = req.body;
    const sql = 'UPDATE books SET title = ?, author = ?, price = ?, category = ?, description = ?, image_url = ?, stock = ? WHERE id = ?';
    const params = [title, author, price, category, description, image_url, stock, req.params.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Book updated' });
    });
});

// DELETE a book (Admin)
app.delete('/api/books/:id', (req, res) => {
    const sql = 'DELETE FROM books WHERE id = ?';
    const params = [req.params.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Book deleted' });
    });
});

// PLACE Order
app.post('/api/orders', (req, res) => {
    const { customer_name, address, total, items } = req.body;
    const sql = 'INSERT INTO orders (customer_name, address, total, items, status, date) VALUES (?,?,?,?,?,?)';
    const params = [customer_name, address, total, JSON.stringify(items), 'Access', new Date().toISOString()];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Order placed', id: this.lastID });
    });
});

// GET Orders (Admin)
app.get('/api/orders', (req, res) => {
    const sql = 'SELECT * FROM orders ORDER BY date DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// UPDATE Order Status (Admin)
app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    const params = [status, req.params.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Order status updated' });
    });
});

// Simple Admin Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // In a real app, use hashed passwords.
    // For this prototype, we'll check against the database or hardcoded for simplicity, 
    // but let's do database check to be consistent.
    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.json({ message: 'Login successful', user: row });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
