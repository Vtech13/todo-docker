############################################################
# 1. Groupe de ressources Azure
############################################################
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

############################################################
# 2. Réseau (VNet, Subnets, DNS privé)
############################################################
resource "azurerm_virtual_network" "todo-docker" {
  name                = "todo-docker-vn"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "todo-docker_psql_subnet" {
  name                 = "psql-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.todo-docker.name
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

resource "azurerm_subnet" "todo-docker_aca_subnet" {
  name                 = "aca-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.todo-docker.name
  address_prefixes     = ["10.0.20.0/23"]
  private_endpoint_network_policies             = "Disabled"
  private_link_service_network_policies_enabled = true
}

resource "azurerm_private_dns_zone" "todo-docker" {
  name                = "todo-docker.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "todo-docker" {
  name                  = "todo-dockerVnetZone.com"
  private_dns_zone_name = azurerm_private_dns_zone.todo-docker.name
  virtual_network_id    = azurerm_virtual_network.todo-docker.id
  resource_group_name   = azurerm_resource_group.rg.name
  depends_on            = [azurerm_subnet.todo-docker_psql_subnet]
}

############################################################
# 3. Base de données PostgreSQL managée
############################################################
resource "azurerm_postgresql_flexible_server" "todo-docker" {
  name                          = "todo-docker-psqlflexibleserver"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  version                       = "16"
  delegated_subnet_id           = azurerm_subnet.todo-docker_psql_subnet.id
  private_dns_zone_id           = azurerm_private_dns_zone.todo-docker.id
  public_network_access_enabled = false
  administrator_login           = "psqladmin"
  administrator_password        = var.postgres_password
  zone                          = "1"
  storage_mb                    = 32768
  storage_tier                  = "P4"
  sku_name                      = "B_Standard_B1ms"
  depends_on                    = [azurerm_private_dns_zone_virtual_network_link.todo-docker]
}

############################################################
# 4. Stockage Azure Blob
############################################################
resource "azurerm_storage_account" "todo-docker" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
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
# 5. Environnement Container Apps Azure
############################################################
resource "azurerm_container_app_environment" "todo-docker_env" {
  name                     = "aca-todo-docker-env"
  location                 = azurerm_resource_group.rg.location
  resource_group_name      = azurerm_resource_group.rg.name
  infrastructure_subnet_id = azurerm_subnet.todo-docker_aca_subnet.id
}

############################################################
# 6. Applications (Containers Docker)
############################################################
# 6.1 Frontend React
resource "azurerm_container_app" "todo-docker_frontend" {
  name                         = "todo-docker-frontend"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.todo-docker_env.id
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
      name   = "todo-docker-frontend"
      image  = var.dockerhub_frontend_image
      cpu    = 0.5
      memory = "1.0Gi"
      env {
        name  = "REACT_APP_API_URL"
        value = "https://${azurerm_container_app.todo-docker_api.ingress[0].fqdn}"
      }
      dynamic "env" {
        for_each = var.frontend_env
        content {
          name  = env.key
          value = env.value
        }
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
resource "azurerm_container_app" "todo-docker_api" {
  name                         = "todo-docker-api"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.todo-docker_env.id
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
    max_replicas = 5
    container {
      name   = "todo-docker-api"
      image  = var.dockerhub_backend_image
      cpu    = 0.5
      memory = "1.0Gi"
      env {
        name  = "DB_HOST"
        value = var.backend_env["DB_HOST"]
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
        value = var.backend_env["DB_NAME"]
      }
      env {
        name  = "DB_PORT"
        value = var.backend_env["DB_PORT"]
      }
      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }
      env {
        name  = "SESSION_SECRET"
        value = var.backend_env["SESSION_SECRET"]
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
        for_each = { for k, v in var.backend_env : k => v if !contains(["DB_HOST","DB_USER","DB_PASSWORD","DB_NAME","DB_PORT","SESSION_SECRET","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"], k) }
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }
  depends_on = [azurerm_container_app_environment.todo-docker_env]
  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}