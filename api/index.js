const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const db = require('../database');

const app = express();
const PORT = process.env.PORT || 3000;

// WaafiPay Credentials
const WAAFI_CONFIG = {
    merchantUid: process.env.WAAFI_MERCHANT_UID || "M1001234",
    apiUserId: process.env.WAAFI_API_USER_ID || "1001234",
    apiKey: process.env.WAAFI_API_KEY || "API-12345678W",
    baseUrl: process.env.WAAFI_BASE_URL || "https://api.waafipay.net/asm"
};

app.use(cors());
app.use(bodyParser.json());

// Explicitly serve static files using process.cwd()
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// Ensure index.html is served for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// --- PAYMENT API ---

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
            paymentParams.serviceParams.payerInfo.expiryDate = cardDetails.expiry;
            paymentParams.serviceParams.payerInfo.cvv2 = cardDetails.cvv;
        }

        const response = await axios.post(WAAFI_CONFIG.baseUrl, paymentParams);
        if (response.data.responseCode === "2001") {
            res.json({ success: true, transactionId: response.data.params?.transactionId });
        } else {
            res.status(400).json({ success: false, message: response.data.responseMsg || "Payment Rejected" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Payment Gateway Error" });
    }
});

// --- CORE API ROUTES ---

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

app.post('/api/orders', (req, res) => {
    const { customer_name, address, total, items } = req.body;
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

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) res.json({ message: 'Login successful', user: row });
        else res.status(401).json({ message: 'Invalid credentials' });
    });
});

// Export for Vercel
module.exports = app;

// Local startup
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
