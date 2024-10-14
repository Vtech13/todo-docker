const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors'); // Ajoutez cette ligne

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors()); // Ajoutez cette ligne

const connectWithRetry = () => {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  connection.connect((err) => {
    if (err) {
      console.error('Erreur de connexion à la base de données:', err);
      setTimeout(connectWithRetry, 5000); // Réessayer après 5 secondes
    } else {
      console.log('Connecté à la base de données MySQL');

      // Créer la table des tâches si elle n'existe pas
      connection.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE
        )
      `);

      // Route pour obtenir toutes les tâches
      app.get('/tasks', (req, res) => {
        connection.query('SELECT * FROM tasks', (err, results) => {
          if (err) throw err;
          res.json(results);
        });
      });

      // Route pour ajouter une nouvelle tâche
      app.post('/tasks', (req, res) => {
        const { title } = req.body;
        connection.query('INSERT INTO tasks (title) VALUES (?)', [title], (err, results) => {
          if (err) throw err;
          res.json({ id: results.insertId, title, completed: false });
        });
      });

      // Route pour mettre à jour une tâche
      app.put('/tasks/:id', (req, res) => {
        const { id } = req.params;
        const { title, completed } = req.body;
        connection.query('UPDATE tasks SET title = ?, completed = ? WHERE id = ?', [title, completed, id], (err) => {
          if (err) throw err;
          res.sendStatus(200);
        });
      });

      // Route pour supprimer une tâche
      app.delete('/tasks/:id', (req, res) => {
        const { id } = req.params;
        connection.query('DELETE FROM tasks WHERE id = ?', [id], (err) => {
          if (err) throw err;
          res.sendStatus(200);
        });
      });

      app.listen(port, () => {
        console.log(`Serveur Node.js en cours d'exécution sur http://localhost:${port}`);
      });
    }
  });
};

connectWithRetry();