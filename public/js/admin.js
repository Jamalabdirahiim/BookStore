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
        adminBooks = combinedBooks;

        // Merge with local storage orders
        const localOrders = JSON.parse(localStorage.getItem('localOrders')) || [];
        let combinedOrders = [...(ordersData.data || [])];

        localOrders.forEach(lo => {
            const idx = combinedOrders.findIndex(o => String(o.id) === String(lo.id));
            if (idx === -1) {
                // Only add if not already from server
                combinedOrders.push(lo);
            }
        });

        // Sort by date desc
        combinedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

        adminOrders = combinedOrders;
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
        <tr style="transition: all 0.2s ease;">
            <td style="font-weight: 600; color: #64748b; font-size: 0.9rem;">${idx + 1}</td>
            <td>
                <div style="
                    width: 50px; 
                    height: 70px; 
                    border-radius: 6px; 
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
                    border: 2px solid #f1f5f9;
                ">
                    <img src="${book.image_url}" alt="Cover" style="
                        width: 100%; 
                        height: 100%; 
                        object-fit: cover;
                        display: block;
                    ">
                </div>
            </td>
            <td style="font-weight: 600; color: #0f172a; font-size: 0.95rem;">${book.title}</td>
            <td style="color: #64748b; font-size: 0.9rem;">${book.author}</td>
            <td>
                <span style="
                    background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); 
                    color: #0369a1; 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    font-size: 0.8rem;
                    font-weight: 600;
                    display: inline-block;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                ">${book.category}</span>
            </td>
            <td style="font-weight: 700; color: #0f172a; font-size: 1rem;">$${book.price.toFixed(2)}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button 
                        class="btn btn-sm btn-outline" 
                        style="
                            padding: 0.5rem 1rem;
                            border: 2px solid #e2e8f0;
                            background: white;
                            color: #64748b;
                            font-weight: 600;
                            border-radius: 6px;
                            transition: all 0.2s ease;
                        " 
                        onmouseover="this.style.borderColor='#0f172a'; this.style.color='#0f172a'; this.style.background='#f8fafc'"
                        onmouseout="this.style.borderColor='#e2e8f0'; this.style.color='#64748b'; this.style.background='white'"
                        onclick="editBook('${book.id}')"
                    >Edit</button>
                    <button 
                        class="btn btn-sm btn-danger" 
                        style="
                            padding: 0.5rem 1rem;
                            background: #ef4444;
                            color: white;
                            font-weight: 600;
                            border: none;
                            border-radius: 6px;
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.background='#dc2626'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 6px -1px rgba(239,68,68,0.3)'"
                        onmouseout="this.style.background='#ef4444'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                        onclick="deleteBook('${book.id}')"
                    >Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add hover effect to rows
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.background = '#f8fafc';
            row.style.transform = 'scale(1.002)';
            row.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.background = 'white';
            row.style.transform = 'scale(1)';
            row.style.boxShadow = 'none';
        });
    });
}

function renderOrdersTable() {
    const tbody = document.querySelector('#orders-table tbody');
    if (!tbody) return;

    tbody.innerHTML = adminOrders.map((order, idx) => {
        let items = [];
        if (typeof order.items === 'string') {
            try {
                items = JSON.parse(order.items);
            } catch (e) {
                console.error("Failed to parse items for order", order.id);
            }
        } else if (Array.isArray(order.items)) {
            items = order.items;
        }

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
                notify.success(id ? 'Book updated successfully! 📚' : 'Book added successfully! 🎉');
                initDashboard(); // Refresh
            } else {
                notify.error('Error saving book. Please try again.');
            }
        } catch (err) {
            console.error(err);
        }
    });
}

async function deleteBook(id) {
    // Custom confirmation using notification system
    const confirmDelete = window.confirm('Are you sure you want to delete this book?');
    if (!confirmDelete) return;

    try {
        const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
        if (res.ok) {
            // Also remove from local persistence
            let customBooks = JSON.parse(localStorage.getItem('customBooks')) || [];
            customBooks = customBooks.filter(b => b.id != id);
            localStorage.setItem('customBooks', JSON.stringify(customBooks));

            notify.success('Book deleted successfully! 🗑️');
            initDashboard();
        } else {
            notify.error('Failed to delete book.');
        }
    } catch (err) {
        console.error(err);
        notify.error('Error deleting book.');
    }
}

async function updateOrderStatus(id, status) {
    try {
        const res = await fetch(`/api/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            notify.success('Order status updated! 🚚');
            initDashboard();
        } else {
            // If API fails (maybe it's a local-only order), try updating local storage
            const localOrders = JSON.parse(localStorage.getItem('localOrders')) || [];
            const idx = localOrders.findIndex(o => String(o.id) === String(id));

            if (idx !== -1) {
                localOrders[idx].status = status;
                localStorage.setItem('localOrders', JSON.stringify(localOrders));
                notify.success('Order status updated! (Local) 🚚');
                initDashboard();
            } else {
                notify.error('Failed to update order status.');
            }
        }
    } catch (err) {
        console.error(err);
        // Fallback for local orders if fetch fails completely
        const localOrders = JSON.parse(localStorage.getItem('localOrders')) || [];
        const idx = localOrders.findIndex(o => String(o.id) === String(id));

        if (idx !== -1) {
            localOrders[idx].status = status;
            localStorage.setItem('localOrders', JSON.stringify(localOrders));
            notify.success('Order status updated! (Local Setup) 🚚');
            initDashboard();
        } else {
            notify.error('Error updating order status.');
        }
    }
}
