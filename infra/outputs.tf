output "frontend_url" {
  description = "URL publique du frontend (FQDN Azure)"
  value       = azurerm_container_app.todo-docker_frontend.latest_revision_fqdn
}

output "backend_url" {
  description = "URL publique du backend (FQDN Azure)"
  value       = azurerm_container_app.todo-docker_api.latest_revision_fqdn
}

output "postgres_fqdn" {
  description = "FQDN de la base PostgreSQL Azure"
  value       = azurerm_postgresql_flexible_server.todo-docker.fqdn
}

output "storage_account_name" {
  description = "Nom du compte de stockage Azure Blob"
  value       = azurerm_storage_account.todo-docker.name
} 