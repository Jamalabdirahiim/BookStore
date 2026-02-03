require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Data paths
const booksPath = path.join(process.cwd(), 'data', 'books.json');
const usersPath = path.join(process.cwd(), 'data', 'users.json');

// --- SMART CACHE (In-Memory Data) ---
// This allows CRUD to work on Vercel despite the read-only filesystem.
// Data will reset when the server restarts/cold-starts.
let booksCache = [];
let ordersCache = [];
let usersCache = [];

// Initialization: Load files into memory once
try {
    const booksData = fs.readFileSync(booksPath, 'utf8');
    booksCache = JSON.parse(booksData);
} catch (e) {
    console.error("Failed to load books into cache");
}

try {
    const usersData = fs.readFileSync(usersPath, 'utf8');
    usersCache = JSON.parse(usersData);
} catch (e) {
    console.error("Failed to load users into cache");
}

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Explicitly serve static files
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// --- PAYMENT API (SIMULATION) ---
app.post('/api/payment/process', async (req, res) => {
    const { paymentMethod, amount } = req.body;

    // Simulate processing delay
    setTimeout(() => {
        // Always return success for simulation
        const transactionId = "TXN" + Date.now();
        res.json({ success: true, transactionId: transactionId });
    }, 2000);
});

// --- CONTACT API (Real Email) ---
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    // Check if credentials exist
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        return res.status(500).json({ success: false, message: 'Server email not configured.' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: 'axmedc.xakiim@gmail.com', // User's email to receive messages
        subject: `New Contact from ${name} (BookHaven)`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Email Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send email.' });
    }
});

// --- BOOKS API ---
app.get('/api/books', (req, res) => {
    const { category } = req.query;
    if (category) {
        const filtered = booksCache.filter(b => b.category === category);
        return res.json({ data: filtered });
    }
    res.json({ data: booksCache });
});

app.get('/api/books/:id', (req, res) => {
    const book = booksCache.find(b => b.id == req.params.id);
    if (book) res.json({ data: book });
    else res.status(404).json({ error: 'Book not found' });
});

// --- ORDERS API ---
app.post('/api/orders', (req, res) => {
    const orderId = Date.now();
    const order = {
        id: orderId,
        ...req.body,
        status: 'Paid',
        date: new Date().toISOString()
    };
    ordersCache.push(order);
    res.json({ message: 'Order placed', id: orderId });
});

app.get('/api/orders', (req, res) => {
    res.json({ data: ordersCache });
});

// --- MANAGEMENT API ---

// Mock Upload
app.post('/api/upload', (req, res) => {
    res.json({ url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400' });
});

app.post('/api/books', (req, res) => {
    const bookId = Date.now();
    const newBook = {
        id: bookId,
        ...req.body,
        stock: req.body.stock || 10
    };
    booksCache.push(newBook);
    res.json({ message: 'Book added', id: bookId });
});

app.put('/api/books/:id', (req, res) => {
    const index = booksCache.findIndex(b => b.id == req.params.id);
    if (index !== -1) {
        booksCache[index] = { ...booksCache[index], ...req.body };
        res.json({ message: 'Book updated' });
    } else {
        res.status(404).json({ error: 'Book not found' });
    }
});

app.delete('/api/books/:id', (req, res) => {
    booksCache = booksCache.filter(b => b.id != req.params.id);
    res.json({ message: 'Book deleted' });
});

app.put('/api/orders/:id/status', (req, res) => {
    const index = ordersCache.findIndex(o => o.id == req.params.id);
    if (index !== -1) {
        ordersCache[index].status = req.body.status;
        res.json({ message: 'Status updated' });
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// Admin Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = usersCache.find(u => u.username === username && u.password === password);
    if (user) res.json({ message: 'Login successful', user });
    else res.status(401).json({ message: 'Invalid credentials' });
});

// Root handler
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Smart Server running on http://localhost:${PORT}`));
}
