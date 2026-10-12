variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Primary GCP region"
  type        = string
  default     = "us-central1"
}

variable "docai_processor_id" {
  description = "Document AI Invoice Parser processor ID"
  type        = string
}

variable "alloydb_cpu_count" {
  description = "AlloyDB primary instance CPU count"
  type        = number
  default     = 4
}

variable "allowed_origins" {
  description = "Allowed CORS origins for GCS CORS config"
  type        = list(string)
  default     = []
}
