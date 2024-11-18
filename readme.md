# Application de Gestion de Tâches (Todo List) avec Docker

## Table des Matières
- [Application de Gestion de Tâches (Todo List) avec Docker](#application-de-gestion-de-tâches-todo-list-avec-docker)
  - [Table des Matières](#table-des-matières)
  - [Introduction](#introduction)
  - [Technologies Utilisées](#technologies-utilisées)
  - [Structure du Projet](#structure-du-projet)
  - [Configuration de l'Environnement](#configuration-de-lenvironnement)
    - [Prérequis](#prérequis)
    - [Variables d'Environnement](#variables-denvironnement)
  - [Démarrer le Projet](#démarrer-le-projet)
  - [API](#api)
    - [Obtenir toutes les tâches](#obtenir-toutes-les-tâches)
    - [Ajouter une nouvelle tâche](#ajouter-une-nouvelle-tâche)
  - [Tests](#tests)

## Introduction

Cette application de gestion de tâches permet à l'utilisateur d'ajouter et de lister des tâches dans une interface web simple. Elle utilise Node.js pour le backend, React pour le frontend et MySQL pour la persistance des données. L'application est containerisée avec Docker pour faciliter le déploiement et la gestion des dépendances.

## Technologies Utilisées

- **Backend** : Node.js avec Express.js
- **Frontend** : React
- **Base de Données** : MySQL
- **Containerisation** : Docker, Docker Compose et Docker Swarm

## Structure du Projet

```
rendu_18-11-2024/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── index.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── secrets/
│   ├── backend-password
│   ├── db-password
│   ├── db-root-password
├── docker-compose.yml
└── README.md
```

## Configuration de l'Environnement

### Prérequis

- **Docker** et **Docker Compose** installés sur votre machine.

### Variables d'Environnement

Le backend se connecte à la base de données MySQL à l'aide des variables d'environnement suivantes, définies dans le fichier `.env` :
- `DB_HOST`: Nom d'hôte de la base de données (par défaut `db`).
- `DB_USER`: Nom d'utilisateur de la base de données (par défaut `root`).
- `DB_PASSWORD`: Mot de passe de l'utilisateur de la base de données (par défaut `example`).
- `DB_NAME`: Nom de la base de données (par défaut `mydatabase`).

## Démarrer le Projet

1. Clonez le dépôt :

   ```bash
   git clone <URL_DU_DEPOT>
   cd todo-docker
   ```

2. Démarrez les conteneurs avec Docker Compose :

   ```bash
   docker-compose up --d
   ```

3. Accédez à l'application :

   - Frontend : [http://localhost:3000](http://localhost:3000)
   - Backend (API) : [http://localhost:5001/tasks](http://localhost:5001/tasks)

## API

### Obtenir toutes les tâches

**Endpoint**: `GET /tasks`

- Récupère la liste de toutes les tâches.

### Ajouter une nouvelle tâche

**Endpoint**: `POST /tasks`

- **Body**: `{ "title": "Titre de la tâche" }`
- Ajoute une nouvelle tâche à la liste.

## Tests

Pour tester l'application, vous pouvez utiliser un client HTTP (comme Postman) pour vérifier les points de terminaison de l'API. Vous pouvez également interagir directement avec l'interface utilisateur du frontend pour ajouter des tâches.