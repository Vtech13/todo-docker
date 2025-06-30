variable "resource_group_name" {
  default = "rg-kerno"
}

variable "location" {
  default = "swedencentral"
}

variable "dockerhub_user" {
  description = "Nom d'utilisateur Docker Hub pour les images."
  type        = string
}

variable "dockerhub_password" {
  description = "Mot de passe Docker Hub pour l'authentification."
  type        = string
  sensitive   = true
}

variable "dockerhub_frontend_image" {
  description = "Nom de l'image Docker du frontend sur Docker Hub."
  type        = string
}

variable "dockerhub_backend_image" {
  description = "Nom de l'image Docker du backend sur Docker Hub."
  type        = string
}

variable "frontend_env" {
  description = "Variables d'environnement pour le frontend (map)."
  type        = map(string)
  default     = {}
}

variable "backend_env" {
  description = "Variables d'environnement pour le backend (map)."
  type        = map(string)
  default     = {}
}

variable "postgres_password" {
  description = "PostgreSQL admin password."
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret JWT pour le backend."
  type        = string
}

variable "storage_account_name" {
  description = "Nom du compte de stockage Azure."
  type        = string
}

variable "subscription_id" {
  description = "ID de l'abonnement Azure"
  type        = string
}