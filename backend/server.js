const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const multer = require('multer');
const upload = multer();
const { uploadBlob, getBlobSasUrl, listBlobs, deleteBlob } = require('./src/services/azureBlobService');

dotenv.config();

// Vérification des variables d'environnement critiques
['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'SESSION_SECRET'].forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`La variable d'environnement ${key} n'est pas définie !`);
  }
});

const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true en production avec HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Configuration de Passport pour OAuth2 Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
    if (rows.length > 0) {
      return done(null, rows[0]);
    } else {
      const newUser = {
        google_id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0].value
      };
      const insertRes = await pool.query(
        'INSERT INTO users (google_id, email, name, avatar) VALUES ($1, $2, $3, $4) RETURNING *',
        [newUser.google_id, newUser.email, newUser.name, newUser.avatar]
      );
      return done(null, insertRes.rows[0]);
    }
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});

let pool;

const connectWithRetry = () => {
  pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  pool.connect()
    .then(async client => {
      client.release();
      console.log('Connecté à la base de données PostgreSQL');

      // Créer la table des utilisateurs
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          avatar VARCHAR(500),
          google_id VARCHAR(255) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Créer la table des tâches
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          user_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Créer la table des fichiers utilisateurs
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_files (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          blob_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      setupRoutes();
    })
    .catch(err => {
      console.error('Erreur de connexion à la base de données:', err);
      setTimeout(connectWithRetry, 5000);
    });
};

// Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
};

// Middleware pour vérifier l'authentification (session ou token)
const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
        return next();
      } else {
        // Token invalide, on renvoie 401 et on arrête tout
        return res.status(401).json({ error: 'Authentification requise' });
      }
    });
    return; // On ne continue pas plus loin, la réponse sera envoyée dans le callback
  }

  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ error: 'Authentification requise' });
};

function setupRoutes() {
  // Routes d'authentification classique

  // Inscription
  app.post('/auth/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, mot de passe et nom requis' });
      }
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (rows.length > 0) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertRes = await pool.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *',
        [email, hashedPassword, name]
      );
      const user = insertRes.rows[0];
      const token = jwt.sign(
        { id: user.id, email, name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.status(201).json({
        message: 'Compte créé avec succès',
        token,
        user: { id: user.id, email, name }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Connexion
  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
      }
      const user = rows[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
      }
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({
        message: 'Connexion réussie',
        token,
        user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Routes OAuth2 Google

  // Redirection vers Google
  app.get('/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  // Callback Google
  app.get('/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login' }),
      (req, res) => {
        // Générer un JWT pour l'utilisateur Google
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email, name: req.user.name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Rediriger vers la racine du frontend avec le token
        res.redirect(`${process.env.CLIENT_URL}/?token=${token}`);
      }
  );

  // Déconnexion
  app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
      }
      res.json({ message: 'Déconnexion réussie' });
    });
  });

  // Route pour obtenir les informations de l'utilisateur connecté
  app.get('/auth/me', isAuthenticated, (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar
      }
    });
  });

  // Routes des tâches (protégées)

  // Obtenir toutes les tâches de l'utilisateur connecté
  app.get('/tasks', isAuthenticated, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [req.user.id]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la récupération des tâches' });
    }
  });

  // Ajouter une nouvelle tâche
  app.post('/tasks', isAuthenticated, async (req, res) => {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }
    try {
      const insertRes = await pool.query(
        'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
        [title, req.user.id]
      );
      const task = insertRes.rows[0];
      res.json(task);
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la création de la tâche' });
    }
  });

  // Mettre à jour une tâche
  app.put('/tasks/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { title, completed } = req.body;
    try {
      const updateRes = await pool.query(
        'UPDATE tasks SET title = $1, completed = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
        [title, completed, id, req.user.id]
      );
      if (updateRes.rowCount === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
      }
      res.json({ message: 'Tâche mise à jour avec succès' });
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  });

  // Supprimer une tâche
  app.delete('/tasks/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
      const deleteRes = await pool.query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (deleteRes.rowCount === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
      }
      res.json({ message: 'Tâche supprimée avec succès' });
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Upload de fichier vers Azure Blob Storage
  app.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'Aucun fichier envoyé' });
      const blobName = await uploadBlob(file.originalname, file.buffer);

      // Lier le fichier à l'utilisateur
      await pool.query(
        'INSERT INTO user_files (user_id, blob_name) VALUES ($1, $2)',
        [req.user.id, blobName]
      );

      const url = getBlobSasUrl(blobName);
      res.json({ url, name: blobName });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Nouvelle route pour lister les fichiers avec liens SAS
  app.get('/files', isAuthenticated, async (req, res) => {
    try {
      // Récupère les blobs liés à l'utilisateur
      const { rows } = await pool.query(
        'SELECT blob_name FROM user_files WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
      const files = rows.map(row => ({
        name: row.blob_name,
        url: getBlobSasUrl(row.blob_name)
      }));
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Supprimer un fichier
  app.delete('/files/:name', isAuthenticated, async (req, res) => {
    try {
      const blobName = decodeURIComponent(req.params.name);
      // Supprime le lien dans la table user_files
      await pool.query(
        'DELETE FROM user_files WHERE user_id = $1 AND blob_name = $2',
        [req.user.id, blobName]
      );
      await deleteBlob(blobName);
      res.json({ message: 'Fichier supprimé' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Serveur Node.js en cours d'exécution sur http://localhost:${port}`);
  });
}

connectWithRetry();