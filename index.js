const express = require('express');
const path = require("path")
const {open} = require("sqlite")
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, "data.db")

const app = express();
app.use(express.json())
const PORT = process.env.PORT || 3004;

const db = new sqlite3.Database('data.db');

// Creating a table to store the seed data
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS product_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            price INTEGER,
            description TEXT,
            category TEXT,
            image TEXT,
            sold BOOLEAN,
            dateOfSale DATETIME
        )
    `);
});

app.get('/all-transactions-database', async (req, res) => {
    try {
        // Fetching JSON data from the third-party API
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const seedData = response.data;
        console.log(seedData)

        // Inserting seed data into the database
        db.serialize(() => {
            const stmt = db.prepare('INSERT INTO product_transactions (id, title, price, description, category, image, sold, dateOfSale) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            seedData.forEach(({ id, title, price, description, category, image, sold, dateOfSale }) => {
                stmt.run(id, title, price, description, category, image, sold, dateOfSale);
            });
            stmt.finalize();
        });

        res.json({ message: 'Database initialized successfully with seed data.' });
        console.log(res.json())
    } catch (error) {
        console.error('Error initializing database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Starting the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//converting db object to response
const convertDBObjectToResponse = (dbObject) => {
    return {
      id: dbObject.id,
      title: dbObject.title,
      price: dbObject.price,
      description: dbObject.description,
      category: dbObject.category,
      image: dbObject.image,
      sold: dbObject.sold,
      dateOfSale: dbObject.dateOfSale,
    };
  };

//API to list all transactions
app.get("/transactions/", async (request, response) => {
    const { page = 1, perPage = 10, search = '' } = request.query;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + parseInt(perPage)
    let getAllTransactionsQuery = `
      SELECT *
      FROM product_transactions;
      `;
      if (search) {
        const searchTerm = `%${search}%`;
        getAllTransactionsQuery += ` WHERE title LIKE ${searchTerm} OR description LIKE ${searchTerm} OR product_price LIKE ${searchTerm}`;
    }
    getAllTransactionsQuery += ` LIMIT ${startIndex} OFFSET ${endIndex}`;  
    const transactionsArray = await db.all(getAllTransactionsQuery);
    console.log(transactionsArray)
    response.send(
      transactionsArray.map((eachTransaction) => convertDBObjectToResponse(eachTransaction))
    );
});

