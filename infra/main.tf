############################################################
# 1. Groupe de ressources Azure
############################################################
resource "azurerm_resource_group" "todo" {
  name     = var.resource_group_name
  location = var.location
}

############################################################
# 2. Réseau (VNet, Subnets, DNS privé)
############################################################
resource "azurerm_virtual_network" "todo" {
  name                = "todo-vn"
  location            = azurerm_resource_group.todo.location
  resource_group_name = azurerm_resource_group.todo.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "todo_psql_subnet" {
  name                 = "psql-subnet"
  resource_group_name  = azurerm_resource_group.todo.name
  virtual_network_name = azurerm_virtual_network.todo.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "psql-delegation"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
  private_endpoint_network_policies             = "Disabled"
  private_link_service_network_policies_enabled = true
}

resource "azurerm_subnet" "todo_aca_subnet" {
  name                 = "aca-subnet"
  resource_group_name  = azurerm_resource_group.todo.name
  virtual_network_name = azurerm_virtual_network.todo.name
  address_prefixes     = ["10.0.20.0/23"]
  private_endpoint_network_policies             = "Disabled"
  private_link_service_network_policies_enabled = true
}

resource "azurerm_private_dns_zone" "todo" {
  name                = "todo.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.todo.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "todo" {
  name                  = "todoVnetZone.com"
  private_dns_zone_name = azurerm_private_dns_zone.todo.name
  virtual_network_id    = azurerm_virtual_network.todo.id
  resource_group_name   = azurerm_resource_group.todo.name
  depends_on            = [azurerm_subnet.todo_psql_subnet]
}

############################################################
# 3. Base de données PostgreSQL managée
############################################################
resource "azurerm_postgresql_flexible_server" "todo" {
  name                          = "todo-psqlflexibleserver"
  resource_group_name           = azurerm_resource_group.todo.name
  location                      = azurerm_resource_group.todo.location
  version                       = "16"
  delegated_subnet_id           = azurerm_subnet.todo_psql_subnet.id
  private_dns_zone_id           = azurerm_private_dns_zone.todo.id
  public_network_access_enabled = false
  administrator_login           = "psqladmin"
  administrator_password        = var.backend_env["DB_PASSWORD"]
  zone                          = "1"
  storage_mb                    = 32768
  storage_tier                  = "P4"
  sku_name                      = "B_Standard_B1ms"
  depends_on                    = [azurerm_private_dns_zone_virtual_network_link.todo]
}

resource "azurerm_postgresql_flexible_server_database" "mydatabase" {
  name      = var.backend_env["DB_NAME"]
  server_id = azurerm_postgresql_flexible_server.todo.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

############################################################
# 4. Stockage Azure Blob
############################################################
resource "azurerm_storage_account" "todo-docker" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.todo.name
  location                 = azurerm_resource_group.todo.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  public_network_access_enabled = false
}

resource "azurerm_storage_container" "todo-docker" {
  name                  = "blob"
  storage_account_id    = azurerm_storage_account.todo-docker.id
  container_access_type = "private"
}

############################################################
# 5. Environnement Container Apps
############################################################
resource "azurerm_container_app_environment" "todo_env" {
  name                     = "aca-todo-env"
  location                 = azurerm_resource_group.todo.location
  resource_group_name      = azurerm_resource_group.todo.name
  infrastructure_subnet_id = azurerm_subnet.todo_aca_subnet.id
}

############################################################
# 6. Applications (Containers Docker)
############################################################
# 6.1 Frontend React
resource "azurerm_container_app" "todo_frontend" {
  name                         = "todo-frontend"
  resource_group_name          = azurerm_resource_group.todo.name
  container_app_environment_id = azurerm_container_app_environment.todo_env.id
  revision_mode                = "Single"
  max_inactive_revisions       = 0

  registry {
    server               = "docker.io"
    username            = var.dockerhub_user
    password_secret_name = "dockerhub-password"
  }

  secret {
    name  = "dockerhub-password"
    value = var.dockerhub_password
  }

  template {
    min_replicas = 1
    max_replicas = 3
    container {
      name   = "todo-frontend"
      image  = var.dockerhub_frontend_image
      cpu    = 0.5
      memory = "1.0Gi"
      env {
        name  = "REACT_APP_API_URL"
        value = "https://${azurerm_container_app.todo_api.ingress[0].fqdn}"
      }
      env {
         name  = "NODE_ENV"
         value = "production"
      }
    }
  }
  ingress {
    external_enabled = true
    target_port      = 80
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}

# 6.2 Backend Express.js
resource "azurerm_container_app" "todo_api" {
  name                         = "todo-api"
  resource_group_name          = azurerm_resource_group.todo.name
  container_app_environment_id = azurerm_container_app_environment.todo_env.id
  revision_mode                = "Single"
  max_inactive_revisions       = 0

  registry {
    server               = "docker.io"
    username             = var.dockerhub_user
    password_secret_name = "dockerhub-password"
  }

  secret {
    name  = "dockerhub-password"
    value = var.dockerhub_password
  }

  template {
    min_replicas = 1
    max_replicas = 5
    container {
      name   = "todo-api"
      image  = var.dockerhub_backend_image
      cpu    = 0.5
      memory = "1.0Gi"
      env {
        name  = "DB_HOST"
        value = azurerm_postgresql_flexible_server.todo.fqdn
      }
      env {
        name  = "DB_USER"
        value = var.backend_env["DB_USER"]
      }
      env {
        name  = "DB_PASSWORD"
        value = var.backend_env["DB_PASSWORD"]
      }
      env {
        name  = "DB_NAME"
        value = azurerm_postgresql_flexible_server_database.mydatabase.name
      }
      env {
        name  = "DB_PORT"
        value = var.backend_env["DB_PORT"]
      }
      env {
        name  = "DB_SSL"
        value = "true"
      }
      env {
        name  = "JWT_SECRET"
        value = var.backend_env["JWT_SECRET"]
      }
      env {
        name  = "SESSION_SECRET"
        value = var.backend_env["SESSION_SECRET"]
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT_NAME"
        value = var.backend_env["AZURE_STORAGE_ACCOUNT_NAME"]
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT_KEY"
        value = var.backend_env["AZURE_STORAGE_ACCOUNT_KEY"]
      }
      env {
        name  = "AZURE_STORAGE_CONTAINER_NAME"
        value = var.backend_env["AZURE_STORAGE_CONTAINER_NAME"]
      }
      env {
        name  = "GOOGLE_CLIENT_ID"
        value = var.backend_env["GOOGLE_CLIENT_ID"]
      }
      env {
        name  = "GOOGLE_CLIENT_SECRET"
        value = var.backend_env["GOOGLE_CLIENT_SECRET"]
      }
      dynamic "env" {
        for_each = var.backend_env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }
  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}