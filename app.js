const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3004;
const db = new sqlite3.Database('./tasks.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
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

// Fetch data from external API and insert into the database

const fetchAndInsert = async () => {
  const response = await axios.get(
    "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
  );
  const data = response.data;

  for (let item of data) {
    const queryData = `SELECT id FROM transactions WHERE id = ${item.id}`;
    const existingData = await db.get(queryData);
    if (existingData === undefined) {
      const query = `
   INSERT INTO transactions (id, title, price, description, category, image, sold, dateOfSale) 
   VALUES (
       ${item.id},
       '${item.title.replace(/'/g, "''")}',
       ${item.price},
       '${item.description.replace(/'/g, "''")}',
       '${item.category.replace(/'/g, "''")}',
       '${item.image.replace(/'/g, "''")}',
       ${item.sold},
       '${item.dateOfSale.replace(/'/g, "''")}'
   );
`; 
      await db.run(query);
    }
  }
  console.log("Transactions added");
};
fetchAndInsert();


//API endpoints

//API endpoint to get all transactions
app.get('/transactions', (req, res) => {
    const page = req.query.page || 1; 
    const limit = 10; 
    const offset = (page - 1) * limit; 
    db.all(`SELECT * FROM transactions LIMIT ? OFFSET ?`, [limit, offset], (err, rows) => {
        if (err) {
            console.error('Error retrieving Transaction:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(rows);
    });
});

//API endpoint to post transactions
app.post('/transactions', (req, res) => {
    const { title, price, description, category, image, sold, dateOfSale } = req.body;
    if (!title || !price || !description || !category || !image || !sold || !dateOfSale) {
        return res.status(400).json({ error: 'Title, price, description, category, image, sold and dateOfSale are required.' });
    }
    db.run(`INSERT INTO transactions (title, price, description, category, image, sold, dateOfSale) VALUES (?, ?, ?, ?, ?, ?, ?)`, [title, price, description, category, image, sold, dateOfSale], function(err) {
        if (err) {
            console.error('Error inserting Transaction:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(201).json({ id: this.lastID });
    });
});

//API endpoint to put transaction
app.put('/transactions/:id', (req, res) => {
    const taskId = req.params.id;
    const { title, price, description, category, image, sold, dateOfSale } = req.body;
    if (!title || !price || !description || !category || !image || !sold || !dateOfSale) {
        return res.status(400).json({ error: 'Title, price, description, category, image, sold and dateOfSale are required.' });
    }
    db.run(`UPDATE transactions SET title = ?, price = ?, description = ?, category = ?, image = ?, sold = ?, dateOfSale = ? WHERE id = ?`, [title, price, description, category, image, sold, dateOfSale, taskId], function(err) {
        if (err) {
            console.error('Error updating task:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }
        res.status(200).json({ message: 'Transaction updated successfully.' });
    });
});

//API endpoint to delete transaction
app.delete('/transactions/:id', (req, res) => {
    const transactionId = req.params.id;
    db.run(`DELETE FROM Transactions WHERE id = ?`, transactionId, function(err) {
        if (err) {
            console.error('Error deleting transaction:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }
        res.status(200).json({ message: 'Transaction deleted successfully.' });
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
