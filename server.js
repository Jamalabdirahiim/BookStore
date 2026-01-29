const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const db = require('./database');
const fs = require('fs');

const app = express();
const PORT = 3000;

// WaafiPay Credentials
const WAAFI_CONFIG = {
    merchantUid: process.env.WAAFI_MERCHANT_UID || "M1001234",
    apiUserId: process.env.WAAFI_API_USER_ID || "1001234",
    apiKey: process.env.WAAFI_API_KEY || "API-12345678W",
    baseUrl: process.env.WAAFI_BASE_URL || "https://api.waafipay.net/asm"
};

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure Upload Directory Exists (Local only)
const uploadDir = path.join(__dirname, 'public/uploads');
if (process.env.NODE_ENV !== 'production') {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- PAYMENT API ---

// Process WaafiPay Payment (EVC Plus or Credit Card)
app.post('/api/payment/process', async (req, res) => {
    const { paymentMethod, amount, phoneNumber, cardDetails } = req.body;

    try {
        const requestId = Date.now().toString();

        let paymentParams = {
            schemaVersion: "1.0",
            requestId: requestId,
            timestamp: requestId,
            channelName: "WEB",
            serviceName: "API_PURCHASE",
            serviceParams: {
                merchantUid: WAAFI_CONFIG.merchantUid,
                apiUserId: WAAFI_CONFIG.apiUserId,
                apiKey: WAAFI_CONFIG.apiKey,
                paymentMethod: paymentMethod === 'evc' ? "MWALLET_ACCOUNT" : "CREDIT_CARD",
                payerInfo: {},
                transactionInfo: {
                    amount: amount.toString(),
                    currency: "USD",
                    description: "Bookstore Purchase"
                }
            }
        };

        if (paymentMethod === 'evc') {
            paymentParams.serviceParams.payerInfo.accountNo = phoneNumber;
        } else {
            paymentParams.serviceParams.payerInfo.cardNo = cardDetails.number;
            paymentParams.serviceParams.payerInfo.expiryDate = cardDetails.expiry; // MMYY
            paymentParams.serviceParams.payerInfo.cvv2 = cardDetails.cvv;
        }

        console.log("Calling WaafiPay API for:", paymentMethod);
        const response = await axios.post(WAAFI_CONFIG.baseUrl, paymentParams);

        if (response.data.responseCode === "2001") {
            res.json({ success: true, transactionId: response.data.params?.transactionId });
        } else {
            res.status(400).json({
                success: false,
                message: response.data.responseMsg || "Payment Rejected by WaafiPay"
            });
        }
    } catch (error) {
        console.error("WaafiPay Error:", error.message);
        res.status(500).json({ success: false, message: "Payment Gateway Error" });
    }
});

// --- CORE API ROUTES ---

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: '/uploads/' + req.file.filename });
});

app.get('/api/books', (req, res) => {
    const { category } = req.query;
    let sql = 'SELECT * FROM books';
    let params = [];
    if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
    }
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/books/:id', (req, res) => {
    db.get('SELECT * FROM books WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: row });
    });
});

app.post('/api/books', (req, res) => {
    const { title, author, price, category, description, image_url, stock } = req.body;
    db.run('INSERT INTO books (title, author, price, category, description, image_url, stock) VALUES (?,?,?,?,?,?,?)',
        [title, author, price, category, description, image_url, stock], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Book created', id: this.lastID });
        });
});

app.put('/api/books/:id', (req, res) => {
    const { title, author, price, category, description, image_url, stock } = req.body;
    db.run('UPDATE books SET title = ?, author = ?, price = ?, category = ?, description = ?, image_url = ?, stock = ? WHERE id = ?',
        [title, author, price, category, description, image_url, stock, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Book updated' });
        });
});

app.delete('/api/books/:id', (req, res) => {
    db.run('DELETE FROM books WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Book deleted' });
    });
});

app.post('/api/orders', (req, res) => {
    const { customer_name, address, total, items, transactionId } = req.body;
    const sql = 'INSERT INTO orders (customer_name, address, total, items, status, date) VALUES (?,?,?,?,?,?)';
    const params = [customer_name, address, total, JSON.stringify(items), 'Paid', new Date().toISOString()];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order placed', id: this.lastID });
    });
});

app.get('/api/orders', (req, res) => {
    db.all('SELECT * FROM orders ORDER BY date DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order status updated' });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) res.json({ message: 'Login successful', user: row });
        else res.status(401).json({ message: 'Invalid credentials' });
    });
});

// --- SERVER INITIALIZATION ---

// For Vercel, we export the app. For local, we listen on the port.
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app; // Export for Vercel
