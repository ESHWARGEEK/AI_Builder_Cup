# ==============================================================================
# EKA Infrastructure — Terraform Root Module
# Provisions all GCP resources for the Enterprise Knowledge Assistant
# ==============================================================================

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }

  # Configure remote state in GCS (update bucket name after bootstrapping)
  backend "gcs" {
    bucket = "YOUR_TF_STATE_BUCKET"
    prefix = "eka/terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ==============================================================================
# Enable Required APIs
# ==============================================================================

locals {
  required_apis = [
    "run.googleapis.com",
    "aiplatform.googleapis.com",
    "discoveryengine.googleapis.com",
    "documentai.googleapis.com",
    "storage.googleapis.com",
    "firestore.googleapis.com",
    "alloydb.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudtrace.googleapis.com",
    "cloudbuild.googleapis.com",
    "eventarc.googleapis.com",
    "pubsub.googleapis.com",
    "iam.googleapis.com",
    "servicenetworking.googleapis.com",
    "vpcaccess.googleapis.com",
    "artifactregistry.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.required_apis)
  service            = each.value
  disable_on_destroy = false
}

# ==============================================================================
# VPC Network (private connectivity for AlloyDB + Cloud Run)
# ==============================================================================

resource "google_compute_network" "eka_vpc" {
  name                    = "eka-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "eka_subnet" {
  name          = "eka-subnet-${var.region}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.eka_vpc.id

  private_ip_google_access = true
}

resource "google_compute_global_address" "private_ip_range" {
  name          = "eka-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.eka_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.eka_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
  depends_on              = [google_project_service.apis]
}

# Serverless VPC Access for Cloud Run → AlloyDB private connectivity
resource "google_vpc_access_connector" "eka_connector" {
  name          = "eka-vpc-connector"
  region        = var.region
  network       = google_compute_network.eka_vpc.id
  ip_cidr_range = "10.8.0.0/28"
  min_instances = 2
  max_instances = 10
}

# ==============================================================================
# Artifact Registry
# ==============================================================================

resource "google_artifact_registry_repository" "eka_repo" {
  location      = var.region
  repository_id = "eka-images"
  description   = "EKA Docker image repository"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

# ==============================================================================
# Service Accounts (Workload Identity / Least Privilege)
# ==============================================================================

resource "google_service_account" "eka_backend_sa" {
  account_id   = "eka-backend-sa"
  display_name = "EKA Backend Service Account"
  description  = "Least-privilege SA for EKA backend Cloud Run service"
}

# IAM bindings — minimal required permissions
locals {
  backend_sa_roles = [
    "roles/aiplatform.user",
    "roles/discoveryengine.viewer",
    "roles/documentai.apiUser",
    "roles/storage.objectViewer",
    "roles/datastore.user",
    "roles/alloydb.client",
    "roles/secretmanager.secretAccessor",
    "roles/cloudtrace.agent",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ]
}

resource "google_project_iam_member" "backend_sa_roles" {
  for_each = toset(local.backend_sa_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.eka_backend_sa.email}"
}

# GCS bucket-specific write permission for invoice uploads
resource "google_storage_bucket_iam_member" "backend_invoice_writer" {
  bucket = google_storage_bucket.invoice_bucket.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.eka_backend_sa.email}"
}

# ==============================================================================
# Cloud Storage Buckets
# ==============================================================================

resource "google_storage_bucket" "invoice_bucket" {
  name          = "${var.project_id}-eka-invoices"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  cors {
    origin          = var.allowed_origins
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["Content-Type", "Authorization"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "docai_output_bucket" {
  name          = "${var.project_id}-eka-docai-output"
  location      = var.region
  force_destroy = false
  uniform_bucket_level_access = true
}

# ==============================================================================
# Firestore Database
# ==============================================================================

resource "google_firestore_database" "eka_db" {
  name        = "(default)"
  location_id = var.region == "us-central1" ? "nam5" : var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis]
}

# Firestore indexes for invoice dedup queries
resource "google_firestore_index" "invoice_hash_index" {
  collection = "invoices"

  fields {
    field_path = "document_hash"
    order      = "ASCENDING"
  }
  fields {
    field_path = "__name__"
    order      = "ASCENDING"
  }

  depends_on = [google_firestore_database.eka_db]
}

resource "google_firestore_index" "invoice_compound_index" {
  collection = "invoices"

  fields {
    field_path = "compound_hash"
    order      = "ASCENDING"
  }
  fields {
    field_path = "__name__"
    order      = "ASCENDING"
  }

  depends_on = [google_firestore_database.eka_db]
}

# ==============================================================================
# AlloyDB Cluster + Instance
# ==============================================================================

resource "google_alloydb_cluster" "eka_cluster" {
  cluster_id = "eka-alloydb-cluster"
  location   = var.region
  network_config {
    network = google_compute_network.eka_vpc.id
  }

  initial_user {
    user     = "eka_agent"
    password = random_password.alloydb_password.result
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

resource "google_alloydb_instance" "eka_primary" {
  cluster       = google_alloydb_cluster.eka_cluster.name
  instance_id   = "eka-primary"
  instance_type = "PRIMARY"

  machine_config {
    cpu_count = var.alloydb_cpu_count
  }

  depends_on = [google_alloydb_cluster.eka_cluster]
}

resource "random_password" "alloydb_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# ==============================================================================
# Secret Manager
# ==============================================================================

resource "google_secret_manager_secret" "alloydb_password" {
  secret_id = "eka-alloydb-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "alloydb_password" {
  secret      = google_secret_manager_secret.alloydb_password.id
  secret_data = random_password.alloydb_password.result
}

resource "google_secret_manager_secret" "google_chat_webhook" {
  secret_id = "eka-google-chat-webhook"
  replication { auto {} }
}

resource "google_secret_manager_secret" "sendgrid_api_key" {
  secret_id = "eka-sendgrid-api-key"
  replication { auto {} }
}

# ==============================================================================
# Vertex AI Search Data Store
# ==============================================================================

resource "google_discovery_engine_data_store" "policy_corpus" {
  provider              = google-beta
  location              = "global"
  data_store_id         = "eka-policy-corpus"
  display_name          = "EKA Corporate Policy Corpus"
  industry_vertical     = "GENERIC"
  content_config        = "CONTENT_REQUIRED"
  solution_types        = ["SOLUTION_TYPE_SEARCH"]
  create_advanced_site_search = false

  depends_on = [google_project_service.apis]
}

resource "google_discovery_engine_search_engine" "policy_search" {
  provider       = google-beta
  engine_id      = "eka-policy-search"
  collection_id  = "default_collection"
  location       = google_discovery_engine_data_store.policy_corpus.location
  display_name   = "EKA Policy Search Engine"
  data_store_ids = [google_discovery_engine_data_store.policy_corpus.data_store_id]

  search_engine_config {
    search_tier    = "SEARCH_TIER_ENTERPRISE"
    search_add_ons = ["SEARCH_ADD_ON_LLM"]
  }
}

# ==============================================================================
# Eventarc Trigger (Cloud Storage → Cloud Run)
# ==============================================================================

resource "google_eventarc_trigger" "invoice_upload_trigger" {
  name     = "eka-invoice-upload-trigger"
  location = var.region

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.storage.object.v1.finalized"
  }
  matching_criteria {
    attribute = "bucket"
    value     = google_storage_bucket.invoice_bucket.name
  }

  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.eka_backend.name
      region  = var.region
      path    = "/api/v1/invoices/eventarc"
    }
  }

  service_account = google_service_account.eka_backend_sa.email

  depends_on = [google_cloud_run_v2_service.eka_backend]
}

# ==============================================================================
# Cloud Run — Backend
# ==============================================================================

resource "google_cloud_run_v2_service" "eka_backend" {
  name     = "eka-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.eka_backend_sa.email

    vpc_access {
      connector = google_vpc_access_connector.eka_connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/eka-images/eka-backend:latest"

      resources {
        limits = {
          cpu    = "4"
          memory = "8Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      # Env vars from Secret Manager
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "VERTEX_SEARCH_DATA_STORE_ID"
        value = google_discovery_engine_data_store.policy_corpus.data_store_id
      }
      env {
        name  = "DOCAI_PROCESSOR_ID"
        value = var.docai_processor_id
      }
      env {
        name  = "GCS_INVOICE_BUCKET"
        value = google_storage_bucket.invoice_bucket.name
      }
      env {
        name  = "GCS_OUTPUT_BUCKET"
        value = google_storage_bucket.docai_output_bucket.name
      }
      env {
        name  = "ALLOYDB_CONNECTION_NAME"
        value = "${var.project_id}:${var.region}:${google_alloydb_cluster.eka_cluster.cluster_id}"
      }

      env {
        name = "ALLOYDB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.alloydb_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CHAT_WEBHOOK_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_chat_webhook.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SENDGRID_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.sendgrid_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "MODEL_ARMOR_ENABLED"
        value = "true"
      }
      env {
        name  = "ENVIRONMENT"
        value = "production"
      }

      liveness_probe {
        http_get {
          path = "/api/v1/health/live"
        }
        initial_delay_seconds = 15
        period_seconds        = 30
      }

      startup_probe {
        http_get {
          path = "/api/v1/health/ready"
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 10
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    max_instance_request_concurrency = 80
  }

  depends_on = [
    google_artifact_registry_repository.eka_repo,
    google_project_iam_member.backend_sa_roles,
  ]
}

# ==============================================================================
# Cloud Run — Frontend
# ==============================================================================

resource "google_cloud_run_v2_service" "eka_frontend" {
  name     = "eka-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/eka-images/eka-frontend:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://${google_cloud_run_v2_service.eka_backend.uri}"
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }
  }
}

# Make frontend publicly accessible
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.eka_frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ==============================================================================
# Outputs
# ==============================================================================

output "backend_url" {
  value = google_cloud_run_v2_service.eka_backend.uri
}

output "frontend_url" {
  value = google_cloud_run_v2_service.eka_frontend.uri
}

output "invoice_bucket" {
  value = google_storage_bucket.invoice_bucket.name
}

output "alloydb_connection_name" {
  value     = "${var.project_id}:${var.region}:${google_alloydb_cluster.eka_cluster.cluster_id}"
  sensitive = false
}

output "artifact_registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/eka-images"
}
