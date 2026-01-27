/* Global State */
const state = {
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    books: []
};

/* Utils */
const formatPrice = (price) => {
    return '$' + parseFloat(price).toFixed(2);
};

const saveCart = () => {
    localStorage.setItem('cart', JSON.stringify(state.cart));
    updateCartCount();
};

const updateCartCount = () => {
    const count = state.cart.reduce((acc, item) => acc + item.quantity, 0);
    const badge = document.querySelector('.cart-count');
    if (badge) badge.textContent = count;
};

/* Cart Actions */
const addToCart = (bookId) => {
    const book = state.books.find(b => b.id === bookId);
    if (!book) return;

    const existingItem = state.cart.find(item => item.id === bookId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        state.cart.push({ ...book, quantity: 1 });
    }

    saveCart();
    // Show toast or feedback
    alert(`${book.title} added to cart!`);
};

/* API Calls */
const fetchBooks = async (category = '') => {
    try {
        let url = '/api/books';
        if (category && category !== 'All') {
            url += `?category=${encodeURIComponent(category)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        state.books = data.data;
        return data.data;
    } catch (err) {
        console.error('Error fetching books:', err);
        return [];
    }
};

/* Initialize */
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});
