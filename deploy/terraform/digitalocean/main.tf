data "digitalocean_kubernetes_versions" "grab" {}


# Create K8s cluster from the latest version available
resource "digitalocean_kubernetes_cluster" "quagen-k8s" {
  name    = "quagen-${var.cluster}"
  region  = var.do_region
  version = data.digitalocean_kubernetes_versions.grab.latest_version
  node_pool {
    name       = "quagen-${var.cluster}"
    size       = var.do_k8s_node_type
    node_count = var.do_k8s_node_count
  }
}

# Create Postgres database/user
resource "digitalocean_database_cluster" "quagen-db-cluster" {
  name       = "quagen-${var.cluster}"
  region     = var.do_region
  engine     = "pg"
  version    = "11"
  size       = var.do_db_node_type
  node_count =  var.do_db_node_count
}

resource "digitalocean_database_firewall" "quagen-db-fw" {
  cluster_id = digitalocean_database_cluster.quagen-db-cluster.id

  rule {
    type  = "k8s"
    value = digitalocean_kubernetes_cluster.quagen-k8s.id
  }
}

resource "digitalocean_database_db" "quagen-db" {
  cluster_id = digitalocean_database_cluster.quagen-db-cluster.id
  name       = var.db_name
}

resource "digitalocean_database_user" "quagen-db-user" {
  cluster_id = digitalocean_database_cluster.quagen-db-cluster.id
  name       = var.db_user
}

