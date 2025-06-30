# Déploiement Azure - Stack Todo Docker

Ce dossier contient l'infrastructure as code (IaC) pour déployer la stack Todo (backend Node.js, frontend React, PostgreSQL, Azure Blob) sur Microsoft Azure avec Terraform.

## Prérequis
- [Terraform](https://www.terraform.io/downloads.html)
- Un compte Azure avec droits suffisants
- Azure CLI (optionnel, pour vérifier l'abonnement)

## Déploiement

1. **Initialiser Terraform**
   ```bash
   cd infra
   terraform init
   ```

2. **Configurer les variables**
   - Modifie le fichier `terraform.tfvars` si besoin (images Docker, secrets, etc.)
   - Vérifie que `subscription_id` correspond à ton abonnement Azure

3. **Appliquer le plan Terraform**
   ```bash
   terraform apply
   ```
   - Accepte la création des ressources

4. **Récupérer les outputs**
   À la fin, Terraform affichera :
   - URL du frontend (FQDN Azure)
   - URL du backend (FQDN Azure)
   - FQDN PostgreSQL
   - Nom du storage account

   Tu peux aussi les retrouver à tout moment avec :
   ```bash
   terraform output
   ```

5. **Configurer les variables d'environnement des apps**

   - **Frontend** (`frontend/frontend/.env.production`) :
     ```env
     REACT_APP_API_URL=https://<backend_url>
     ```
   - **Backend** (`backend/.env.production`) :
     ```env
     DB_HOST=<postgres_fqdn>
     DB_USER=<user>
     DB_PASSWORD=<password>
     DB_NAME=<database>
     DB_PORT=5432
     JWT_SECRET=<jwt_secret>
     SESSION_SECRET=<session_secret>
     CLIENT_URL=https://<frontend_url>
     GOOGLE_CLIENT_ID=<google_client_id>
     GOOGLE_CLIENT_SECRET=<google_client_secret>
     ```

   > Remplace les valeurs par celles affichées dans les outputs Terraform et dans `terraform.tfvars`.

6. **(Optionnel) Relancer le build/déploiement des apps**

---

## Astuces
- Pour changer d'abonnement Azure, modifie la variable `subscription_id` dans `terraform.tfvars`.
- Pour détruire l'infra :
  ```bash
  terraform destroy
  ```

---

**Contact** : Pour toute question, contactes l'auteur du projet ou ouvre une issue. 