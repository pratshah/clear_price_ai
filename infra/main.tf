terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "clearprice-tfstate"
    prefix = "terraform/state"
  }
}

# ──────────────────────────────────────────────
# Variables
# ──────────────────────────────────────────────
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection URI"
  type        = string
  sensitive   = true
}

variable "google_maps_api_key" {
  description = "Google Maps API key (Geocoding + Maps JS)"
  type        = string
  sensitive   = true
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# ──────────────────────────────────────────────
# Provider
# ──────────────────────────────────────────────
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ──────────────────────────────────────────────
# Enable required APIs
# ──────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com",
    "maps-backend.googleapis.com",
    "geocoding-backend.googleapis.com",
    "places-backend.googleapis.com",
    "iam.googleapis.com",
    "cloudbuild.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}

# ──────────────────────────────────────────────
# Artifact Registry — Docker images
# ──────────────────────────────────────────────
resource "google_artifact_registry_repository" "clearprice" {
  repository_id = "clearprice"
  format        = "DOCKER"
  location      = var.region
  description   = "ClearPrice Docker images"
  depends_on    = [google_project_service.apis]
}

locals {
  registry = "${var.region}-docker.pkg.dev/${var.project_id}/clearprice"
}

# ──────────────────────────────────────────────
# Secret Manager — sensitive values
# ──────────────────────────────────────────────
resource "google_secret_manager_secret" "mongodb_uri" {
  secret_id = "mongodb-uri"
  replication { auto {} }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "mongodb_uri" {
  secret      = google_secret_manager_secret.mongodb_uri.id
  secret_data = var.mongodb_uri
}

resource "google_secret_manager_secret" "maps_api_key" {
  secret_id = "google-maps-api-key"
  replication { auto {} }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "maps_api_key" {
  secret      = google_secret_manager_secret.maps_api_key.id
  secret_data = var.google_maps_api_key
}

# ──────────────────────────────────────────────
# Service Account — Cloud Run services
# ──────────────────────────────────────────────
resource "google_service_account" "clearprice" {
  account_id   = "clearprice-sa"
  display_name = "ClearPrice Cloud Run Service Account"
}

resource "google_project_iam_member" "vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.clearprice.email}"
}

resource "google_secret_manager_secret_iam_member" "mongodb_access" {
  secret_id = google_secret_manager_secret.mongodb_uri.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.clearprice.email}"
}

resource "google_secret_manager_secret_iam_member" "maps_access" {
  secret_id = google_secret_manager_secret.maps_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.clearprice.email}"
}

# ──────────────────────────────────────────────
# Cloud Run — MCP Server
# ──────────────────────────────────────────────
resource "google_cloud_run_v2_service" "mcp_server" {
  name     = "clearprice-mcp"
  location = var.region

  template {
    service_account = google_service_account.clearprice.email

    containers {
      image = "${local.registry}/mcp-server:${var.image_tag}"

      resources {
        limits = { memory = "512Mi", cpu = "1" }
      }

      env {
        name = "MONGODB_URI"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mongodb_uri.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "MONGODB_DATABASE"
        value = "clearprice"
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "VERTEX_AI_LOCATION"
        value = var.region
      }

      env {
        name = "GOOGLE_MAPS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.maps_api_key.secret_id
            version = "latest"
          }
        }
      }

      ports { container_port = 8080 }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.clearprice,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "mcp_public" {
  location = google_cloud_run_v2_service.mcp_server.location
  name     = google_cloud_run_v2_service.mcp_server.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ──────────────────────────────────────────────
# Cloud Run — API (Hono.js)
# ──────────────────────────────────────────────
resource "google_cloud_run_v2_service" "api" {
  name     = "clearprice-api"
  location = var.region

  template {
    service_account = google_service_account.clearprice.email

    containers {
      image = "${local.registry}/api:${var.image_tag}"

      resources {
        limits = { memory = "1Gi", cpu = "1" }
      }

      env {
        name = "MONGODB_URI"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mongodb_uri.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "MONGODB_DATABASE"
        value = "clearprice"
      }

      env {
        name  = "MCP_SERVER_URL"
        value = google_cloud_run_v2_service.mcp_server.uri
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "VERTEX_AI_LOCATION"
        value = var.region
      }

      env {
        name = "GOOGLE_MAPS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.maps_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "ALLOWED_ORIGINS"
        value = "*"
      }

      ports { container_port = 8080 }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }

  depends_on = [
    google_cloud_run_v2_service.mcp_server,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "api_public" {
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ──────────────────────────────────────────────
# Cloud Run — Frontend (Next.js)
# ──────────────────────────────────────────────
resource "google_cloud_run_v2_service" "frontend" {
  name     = "clearprice-frontend"
  location = var.region

  template {
    service_account = google_service_account.clearprice.email

    containers {
      image = "${local.registry}/frontend:${var.image_tag}"

      resources {
        limits = { memory = "512Mi", cpu = "1" }
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = google_cloud_run_v2_service.api.uri
      }

      env {
        name = "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.maps_api_key.secret_id
            version = "latest"
          }
        }
      }

      ports { container_port = 3000 }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  depends_on = [
    google_cloud_run_v2_service.api,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ──────────────────────────────────────────────
# Outputs
# ──────────────────────────────────────────────
output "frontend_url" {
  description = "ClearPrice frontend URL"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "api_url" {
  description = "ClearPrice API URL"
  value       = google_cloud_run_v2_service.api.uri
}

output "mcp_server_url" {
  description = "ClearPrice MCP Server URL"
  value       = google_cloud_run_v2_service.mcp_server.uri
}

output "registry" {
  description = "Artifact Registry path"
  value       = local.registry
}
