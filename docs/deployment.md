

1. Export a slew of settings into the environment.

        export DO_API_TOKEN="<value>"
        export LETSENCRYPT_EMAIL="<value>"
        export QUAGEN_APP_SECRET="<value>"
        export QUAGEN_DB_NAME="<value>"
        export QUAGEN_DB_PORT="<value>"
        export QUAGEN_DB_USER="<value>"
        export QUAGEN_DOCKER_HUB="<value>"
        export QUAGEN_DOMAIN="<value>"

2. Build and push the containers 

3. Run the deployment

        cat deploy/k8/deployment.yaml | envsubst | kubectl apply -f -
