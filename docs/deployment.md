# Deploying a New Version

Deploy a new version of Quagen to a Kubernetes cluster. This assumes you have
already run an initial provision and deployment.

1. If unset or changed, export a slew of settings into the environment.

        export DO_API_TOKEN="<value>"
        export LETSENCRYPT_EMAIL="<value>"
        export QUAGEN_APP_SECRET="<value>"
        export QUAGEN_DB_NAME="<value>"
        export QUAGEN_DB_PORT="<value>"
        export QUAGEN_DB_USER="<value>"
        export QUAGEN_DOCKER_HUB="<value>"
        export QUAGEN_DOMAIN="<value>"

2. Build and push the containers

        cd quagen
        
        docker build -f deploy/docker/worker/Dockerfile -t <docker_hub>/quagen:worker .
        docker push <docker_hub>/quagen:worker

        docker build -f deploy/docker/web/Dockerfile -t <docker_hub>/quagen:web .
        docker push <docker_hub>/quagen:web

3. Run the deployment

        kubectl delete job quagen-migrator
        cat deploy/k8/deployment.yaml | envsubst | kubectl apply -f -
        kubectl rollout restart deployment/quagen-web
        kubectl rollout restart deployment/quagen-worker

