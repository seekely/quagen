variable "cluster" {
  description = "Cluster name appended to all DO Quagen created resources"
  type        = string
  default     = "production"
}

variable "db_name" {
  description = "Quagen database name"
  type        = string
  default     = "quagen"
}

variable "db_user" {
  description = "Quagen database user name"
  type        = string
  default     = "quagen"
}

variable "do_api_token" {
  description = "Digital Ocean Personal access token"
  type        = string
}

variable "do_region" {
  description = "Digital Ocean region (e.g. `fra1` => Frankfurt)"
  type        = string
  default     = "sfo2"
}

variable "do_k8s_node_type" {
  description = "Digital Ocean Kubernetes default node pool type (e.g. `s-1vcpu-2gb` => 1vCPU, 2GB RAM)"
  type        = string
  default     = "s-2vcpu-2gb"
}

variable "do_k8s_node_count" {
  description = "Digital Ocean Kubernetes default node pool size (e.g. `2`)"
  type        = number
  default     = 3
}

variable "do_db_node_type" {
  description = "Digital Ocean DB default node pool type (e.g. `s-1vcpu-2gb` => 1vCPU, 2GB RAM)"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "do_db_node_count" {
  description = "Digital Ocean DB default node pool type (e.g. `s-1vcpu-2gb` => 1vCPU, 2GB RAM)"
  type        = number
  default     = 1
}
