const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Data paths
const booksPath = path.join(process.cwd(), 'data', 'books.json');
const usersPath = path.join(process.cwd(), 'data', 'users.json');

// Helper to read JSON data
const readData = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        return [];
    }
};

// WaafiPay Credentials
const WAAFI_CONFIG = {
    merchantUid: process.env.WAAFI_MERCHANT_UID || "M1001234",
    apiUserId: process.env.WAAFI_API_USER_ID || "1001234",
    apiKey: process.env.WAAFI_API_KEY || "API-12345678W",
    baseUrl: process.env.WAAFI_BASE_URL || "https://api.waafipay.net/asm"
};

app.use(cors());
app.use(bodyParser.json());

// Explicitly serve static files
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

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

// --- BOOKS API ---
app.get('/api/books', (req, res) => {
    const books = readData(booksPath);
    const { category } = req.query;
    if (category) {
        const filtered = books.filter(b => b.category === category);
        return res.json({ data: filtered });
    }
    res.json({ data: books });
});

app.get('/api/books/:id', (req, res) => {
    const books = readData(booksPath);
    const book = books.find(b => b.id == req.params.id);
    if (book) res.json({ data: book });
    else res.status(404).json({ error: 'Book not found' });
});

// Orders (Simulation for Vercel)
app.post('/api/orders', (req, res) => {
    console.log("Order Received:", req.body);
    // Vercel filesystem is read-only, so we just return success
    res.json({ message: 'Order received (Simulation)', id: Date.now() });
});

app.get('/api/orders', (req, res) => {
    // Return empty list or simulation data
    res.json({ data: [] });
});

// Admin Login
app.post('/api/login', (req, res) => {
    const users = readData(usersPath);
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.json({ message: 'Login successful', user });
    else res.status(401).json({ message: 'Invalid credentials' });
});

// Root handler
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Stable Server running on http://localhost:${PORT}`));
}
