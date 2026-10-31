const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware pour analyser les requêtes JSON et les formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Servir les fichiers statiques (HTML, CSS, JS, images, manifest, sw.js) depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 3. Connexion et initialisation de la base de données SQLite (cremerie.db)
const dbPath = path.resolve(__dirname, 'cremerie.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur d\'ouverture de la base de données :', err.message);
  } else {
    console.log('Connecté à la base de données SQLite (cremerie.db).');
  }
});

// Création automatique de la table des utilisateurs et d'un compte admin par défaut si vide
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (!err) {
      db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
        if (row && row.count === 0) {
          // Compte par défaut modifiable : admin / 1234
          db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ['admin', '1234'], (err) => {
            if (!err) console.log('Utilisateur administrateur par défaut créé (admin / 1234).');
          });
        }
      });
    }
  });
});

// 4. Routes de l'application

// Route racine : redirige ou affiche directement la page de connexion
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route de connexion (POST /login)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
    
    if (row) {
      // Connexion réussie
      res.json({ success: true, redirect: '/dashboard.html' });
    } else {
      // Identifiants incorrects
      res.status(401).json({ success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }
  });
});

// 5. Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});