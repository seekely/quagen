output "db_host" {
  value = "${digitalocean_database_cluster.quagen-db-cluster.host}"
}

output "db_password" {
  value = "${digitalocean_database_user.quagen-db-user.password}"
}

output "db_role" {
  value = "${digitalocean_database_user.quagen-db-user.role}"
}