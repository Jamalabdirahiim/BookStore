/* Admin Logic */

// Login Handling
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                sessionStorage.setItem('adminUser', JSON.stringify(data.user));
                window.location.href = 'dashboard.html';
            } else {
                const errorMsg = document.getElementById('error-msg');
                errorMsg.style.display = 'block';
                errorMsg.textContent = data.message;
            }
        } catch (err) {
            console.error(err);
        }
    });
}

function logout() {
    sessionStorage.removeItem('adminUser');
    window.location.href = '../index.html';
}

// Dashboard Logic
console.log("Admin Logic v1.0.5 Loaded");
let adminBooks = [];
let adminOrders = [];

// Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    // Ideally find the nav item that called this, but simple hack:
    const navs = document.querySelectorAll('.nav-item');
    if (tabId === 'overview') navs[0].classList.add('active');
    if (tabId === 'books') navs[1].classList.add('active');
    if (tabId === 'orders') navs[2].classList.add('active');
}

async function initDashboard() {
    await fetchAdminData();
    renderOverview();
    renderBooksTable();
    renderOrdersTable();
}

async function fetchAdminData() {
    try {
        const [booksRes, ordersRes] = await Promise.all([
            fetch('/api/books'),
            fetch('/api/orders')
        ]);

        const booksData = await booksRes.json();
        const ordersData = await ordersRes.json();

        // Merge with local storage custom books
        const customBooks = JSON.parse(localStorage.getItem('customBooks')) || [];
        let combinedBooks = [...booksData.data];

        customBooks.forEach(cb => {
            const idx = combinedBooks.findIndex(b => String(b.id) === String(cb.id));
            if (idx !== -1) combinedBooks[idx] = cb;
            else combinedBooks.push(cb);
        });

        adminBooks = combinedBooks;
        adminOrders = ordersData.data || [];
    } catch (err) {
        console.error("Error loading admin data", err);
    }
}

function renderOverview() {
    document.getElementById('total-books').textContent = adminBooks.length;
    document.getElementById('total-orders').textContent = adminOrders.length;

    const revenue = adminOrders.reduce((acc, order) => acc + order.total, 0);
    document.getElementById('total-rev').textContent = '$' + revenue.toFixed(2);

    // Recent orders (last 5)
    const recent = adminOrders.slice(0, 5);
    const table = document.getElementById('recent-orders-table');
    if (table) {
        table.innerHTML = recent.map((o, idx) => `
            <tr>
                <td>#${idx + 1}</td>
                <td>${o.customer_name}</td>
                <td>$${o.total.toFixed(2)}</td>
                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
            </tr>
        `).join('');
    }
}

function renderBooksTable() {
    const tbody = document.querySelector('#books-table tbody');
    if (!tbody) return;

    tbody.innerHTML = adminBooks.map((book, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>
                <img src="${book.image_url}" alt="Cover" style="width: 40px; height: 56px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            </td>
            <td style="font-weight: 500;">${book.title}</td>
            <td>${book.author}</td>
            <td><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${book.category}</span></td>
            <td style="font-weight: 600;">$${book.price.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-outline" style="margin-right: 0.5rem;" onclick="editBook('${book.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteBook('${book.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderOrdersTable() {
    const tbody = document.querySelector('#orders-table tbody');
    if (!tbody) return;

    tbody.innerHTML = adminOrders.map((order, idx) => {
        const items = JSON.parse(order.items || '[]');
        const itemsSummary = items.map(i => `${i.title} (x${i.quantity})`).join(', ');

        return `
        <tr>
            <td>${idx + 1}</td>
            <td>
                <div>${order.customer_name}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${order.address}</div>
            </td>
            <td>${new Date(order.date).toLocaleDateString()}</td>
            <td style="max-width: 200px; font-size: 0.875rem;">${itemsSummary}</td>
            <td>$${order.total.toFixed(2)}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>
                ${order.status !== 'Shipped' ?
                `<button class="btn btn-sm btn-primary" onclick="updateOrderStatus('${order.id}', 'Shipped')">Mark Shipped</button>` :
                `<span style="color: var(--success); font-weight: 600;">✓ Completed</span>`
            }
            </td>
        </tr>
        `
    }).join('');
}


// Book Modal & CRUD
const bookModal = document.getElementById('book-modal');
const bookForm = document.getElementById('book-form');

function openBookModal(isEdit = false) {
    bookModal.classList.add('show');
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Book' : 'Add New Book';
    if (!isEdit) {
        bookForm.reset();
        document.getElementById('book-id').value = '';
    }
}

function closeBookModal() {
    bookModal.classList.remove('show');
}

// Edit Book Setup
function editBook(id) {
    const book = adminBooks.find(b => b.id === id);
    if (!book) return;

    document.getElementById('book-id').value = book.id;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-price').value = book.price;
    document.getElementById('book-category').value = book.category;

    // Set hidden URL and preview text
    document.getElementById('book-image-url').value = book.image_url;
    document.getElementById('current-image-preview').textContent = `Current Image: ${book.image_url ? book.image_url.split('/').pop() : 'None'}`;

    // Reset file input
    document.getElementById('book-image-file').value = '';

    document.getElementById('book-desc').value = book.description;

    openBookModal(true);
}

// Handle Form Submit
if (bookForm) {
    bookForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('book-id').value;
        const fileInput = document.getElementById('book-image-file');
        let finalImageUrl = document.getElementById('book-image-url').value;

        // 1. Handle File Upload if present (Convert to DataURL for Vercel/Memory support)
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            finalImageUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } else if (!finalImageUrl) {
            // Require image if it's new and no file selected
            alert("Please select a book cover image.");
            return;
        }

        const bookData = {
            title: document.getElementById('book-title').value,
            author: document.getElementById('book-author').value,
            price: parseFloat(document.getElementById('book-price').value),
            category: document.getElementById('book-category').value,
            image_url: finalImageUrl,
            description: document.getElementById('book-desc').value,
            stock: 10 // default
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/books/${id}` : '/api/books';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });

            if (res.ok) {
                const data = await res.json();
                const savedBook = { ...bookData, id: id || data.id };

                // Save to local persistence
                let customBooks = JSON.parse(localStorage.getItem('customBooks')) || [];
                if (id) {
                    const idx = customBooks.findIndex(b => b.id == id);
                    if (idx !== -1) customBooks[idx] = savedBook;
                    else customBooks.push(savedBook);
                } else {
                    customBooks.push(savedBook);
                }
                localStorage.setItem('customBooks', JSON.stringify(customBooks));

                closeBookModal();
                initDashboard(); // Refresh
            } else {
                alert('Error saving book');
            }
        } catch (err) {
            console.error(err);
        }
    });
}

async function deleteBook(id) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
        const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
        if (res.ok) {
            // Also remove from local persistence
            let customBooks = JSON.parse(localStorage.getItem('customBooks')) || [];
            customBooks = customBooks.filter(b => b.id != id);
            localStorage.setItem('customBooks', JSON.stringify(customBooks));

            initDashboard();
        }
    } catch (err) {
        console.error(err);
    }
}

async function updateOrderStatus(id, status) {
    try {
        const res = await fetch(`/api/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) initDashboard();
    } catch (err) {
        console.error(err);
    }
}
