const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database', 'bookstore.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Only initialize/seed if not in production (Vercel filesystem is read-only)
if (process.env.NODE_ENV !== 'production') {
    db.serialize(() => {
        // Create Books Table
        db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        author TEXT,
        price REAL,
        category TEXT,
        description TEXT,
        image_url TEXT,
        stock INTEGER DEFAULT 10
    )`);

        // Create Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        address TEXT,
        total REAL,
        items TEXT, 
        status TEXT,
        date TEXT
    )`);

        // Create Users Table (Admin)
        db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`);

        // Seed Data - Admin User
        const insertAdmin = db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)");
        insertAdmin.run('admin', 'admin123', 'admin');
        insertAdmin.finalize();

        // Seed Data - Books with Real Cover Images
        db.get("SELECT count(*) as count FROM books", (err, row) => {
            if (row.count === 0) {
                const stmt = db.prepare("INSERT INTO books (title, author, price, category, description, image_url) VALUES (?, ?, ?, ?, ?, ?)");

                const books = [
                    {
                        title: "Atomic Habits",
                        author: "James Clear",
                        price: 27.99,
                        category: "Self-Help",
                        description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones. No matter your goals, Atomic Habits offers a proven framework for improving every day. James Clear reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.",
                        image_url: "https://covers.openlibrary.org/b/id/12708357-L.jpg"
                    },
                    {
                        title: "The Psychology of Money",
                        author: "Morgan Housel",
                        price: 24.99,
                        category: "Business",
                        description: "Timeless lessons on wealth, greed, and happiness. Doing well with money isn't necessarily about what you know. It's about how you behave. And behavior is hard to teach, even to really smart people.",
                        image_url: "https://covers.openlibrary.org/b/id/10677564-L.jpg"
                    },
                    {
                        title: "Sapiens",
                        author: "Yuval Noah Harari",
                        price: 29.99,
                        category: "History",
                        description: "A Brief History of Humankind. From a renowned historian comes a groundbreaking narrative of humanity's creation and evolution that explores the ways in which biology and history have defined us and enhanced our understanding of what it means to be human.",
                        image_url: "https://covers.openlibrary.org/b/id/8235729-L.jpg"
                    },
                    {
                        title: "The Lean Startup",
                        author: "Eric Ries",
                        price: 26.50,
                        category: "Business",
                        description: "How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses. Most startups fail. But many of those failures are preventable. The Lean Startup is a new approach being adopted around the world, changing the way companies are built and new products are launched.",
                        image_url: "https://covers.openlibrary.org/b/id/7895280-L.jpg"
                    },
                    {
                        title: "Educated",
                        author: "Tara Westover",
                        price: 22.99,
                        category: "Biography",
                        description: "A Memoir. An unforgettable memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University. Born to survivalists in the mountains of Idaho, Tara Westover was seventeen the first time she set foot in a classroom.",
                        image_url: "https://covers.openlibrary.org/b/id/8509458-L.jpg"
                    },
                    {
                        title: "Thinking, Fast and Slow",
                        author: "Daniel Kahneman",
                        price: 32.00,
                        category: "Psychology",
                        description: "The phenomenal international bestseller that shows us how the mind works, and how we make decisions. Why is there more chance we'll believe something if it's in a bold type face? Why are judges more likely to deny parole before lunch?",
                        image_url: "https://covers.openlibrary.org/b/id/7895134-L.jpg"
                    },
                    {
                        title: "The 7 Habits of Highly Effective People",
                        author: "Stephen R. Covey",
                        price: 25.99,
                        category: "Self-Help",
                        description: "Powerful Lessons in Personal Change. One of the most inspiring and impactful books ever written, The 7 Habits of Highly Effective People has captivated readers for nearly three decades. It has transformed the lives of presidents and CEOs, educators and parents.",
                        image_url: "https://covers.openlibrary.org/b/id/295577-L.jpg"
                    },
                    {
                        title: "Clean Code",
                        author: "Robert C. Martin",
                        price: 49.99,
                        category: "Technology",
                        description: "A Handbook of Agile Software Craftsmanship. Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code.",
                        image_url: "https://covers.openlibrary.org/b/id/7895270-L.jpg"
                    },
                    {
                        title: "The Alchemist",
                        author: "Paulo Coelho",
                        price: 18.99,
                        category: "Fiction",
                        description: "A magical fable about following your dreams. Paulo Coelho's masterpiece tells the mystical story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure. His quest will lead him to riches far different—and far more satisfying—than he ever imagined.",
                        image_url: "https://covers.openlibrary.org/b/id/8235823-L.jpg"
                    },
                    {
                        title: "1984",
                        author: "George Orwell",
                        price: 16.99,
                        category: "Fiction",
                        description: "A dystopian social science fiction novel and cautionary tale. Among the seminal texts of the 20th century, Nineteen Eighty-Four is a rare work that grows more haunting as its futuristic purgatory becomes more real.",
                        image_url: "https://covers.openlibrary.org/b/id/7222246-L.jpg"
                    },
                    {
                        title: "Deep Work",
                        author: "Cal Newport",
                        price: 28.00,
                        category: "Self-Help",
                        description: "Rules for Focused Success in a Distracted World. Deep work is the ability to focus without distraction on a cognitively demanding task. It's a skill that allows you to quickly master complicated information and produce better results in less time.",
                        image_url: "https://covers.openlibrary.org/b/id/8235900-L.jpg"
                    },
                    {
                        title: "The Subtle Art of Not Giving a F*ck",
                        author: "Mark Manson",
                        price: 24.00,
                        category: "Self-Help",
                        description: "A Counterintuitive Approach to Living a Good Life. In this generation-defining self-help guide, a superstar blogger cuts through the crap to show us how to stop trying to be positive all the time so that we can truly become better, happier people.",
                        image_url: "https://covers.openlibrary.org/b/id/8235838-L.jpg"
                    },
                    {
                        title: "Zero to One",
                        author: "Peter Thiel",
                        price: 27.50,
                        category: "Business",
                        description: "Notes on Startups, or How to Build the Future. If you want to build a better future, you must believe in secrets. The great secret of our time is that there are still uncharted frontiers to explore and new inventions to create.",
                        image_url: "https://covers.openlibrary.org/b/id/7895279-L.jpg"
                    },
                    {
                        title: "Becoming",
                        author: "Michelle Obama",
                        price: 32.99,
                        category: "Biography",
                        description: "An intimate, powerful, and inspiring memoir by the former First Lady of the United States. In her memoir, a work of deep reflection and mesmerizing storytelling, Michelle Obama invites readers into her world, chronicling the experiences that have shaped her.",
                        image_url: "https://covers.openlibrary.org/b/id/8509457-L.jpg"
                    },
                    {
                        title: "The 48 Laws of Power",
                        author: "Robert Greene",
                        price: 29.99,
                        category: "Psychology",
                        description: "Amoral, cunning, ruthless, and instructive, this multi-million-copy New York Times bestseller is the definitive manual for anyone interested in gaining, observing, or defending against ultimate control – from the author of The Laws of Human Nature.",
                        image_url: "https://covers.openlibrary.org/b/id/8235835-L.jpg"
                    },
                    {
                        title: "The Four Agreements",
                        author: "Don Miguel Ruiz",
                        price: 19.99,
                        category: "Self-Help",
                        description: "A Practical Guide to Personal Freedom. In The Four Agreements, bestselling author don Miguel Ruiz reveals the source of self-limiting beliefs that rob us of joy and create needless suffering.",
                        image_url: "https://covers.openlibrary.org/b/id/6979861-L.jpg"
                    },
                    {
                        title: "Designing Data-Intensive Applications",
                        author: "Martin Kleppmann",
                        price: 54.99,
                        category: "Technology",
                        description: "The Big Ideas Behind Reliable, Scalable, and Maintainable Systems. Data is at the center of many challenges in system design today. Difficult issues need to be figured out, such as scalability, consistency, reliability, efficiency, and maintainability.",
                        image_url: "https://covers.openlibrary.org/b/id/8235901-L.jpg"
                    },
                    {
                        title: "The Power of Now",
                        author: "Eckhart Tolle",
                        price: 21.99,
                        category: "Self-Help",
                        description: "A Guide to Spiritual Enlightenment. To make the journey into the Now we will need to leave our analytical mind and its false created self, the ego, behind. From the very first page of this extraordinary book, we move rapidly into a significantly higher altitude.",
                        image_url: "https://covers.openlibrary.org/b/id/295576-L.jpg"
                    },
                    {
                        title: "Good to Great",
                        author: "Jim Collins",
                        price: 30.00,
                        category: "Business",
                        description: "Why Some Companies Make the Leap and Others Don't. Built to Last, the defining management study of the nineties, showed how great companies triumph over time and how long-term sustained performance can be engineered into the DNA of an enterprise.",
                        image_url: "https://covers.openlibrary.org/b/id/295578-L.jpg"
                    },
                    {
                        title: "Can't Hurt Me",
                        author: "David Goggins",
                        price: 26.99,
                        category: "Biography",
                        description: "Master Your Mind and Defy the Odds. For David Goggins, childhood was a nightmare -- poverty, prejudice, and physical abuse colored his days and haunted his nights. But through self-discipline, mental toughness, and hard work, Goggins transformed himself from a depressed, overweight young man with no future into a U.S. Armed Forces icon.",
                        image_url: "https://covers.openlibrary.org/b/id/8509459-L.jpg"
                    }
                ];

                books.forEach(book => {
                    stmt.run(book.title, book.author, book.price, book.category, book.description, book.image_url);
                });
                stmt.finalize();
                console.log("Seeded initial books with real cover images");
            }
        });
    });
}

module.exports = db;
