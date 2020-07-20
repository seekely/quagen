# Provisioning Quagen on Digital Ocean

This guide walks through all the steps to provision Quagen on Digital
Ocean. Human intervention frequently required!

## Prerequisites

- [Digital Ocean][digitalocean] account with a read/write API token.
- [kubectl][kubectl] installed and in the path.
- [doctl][doctl] installed and in the path.
- [Terraform][terraform] installed and in the path.

## Provisioning

After installing the above prerequisites, open a shell and run the following:

1. Export a slew of settings into the environment.

        export DO_API_TOKEN="<value>"
        export LETSENCRYPT_EMAIL="<value>"
        export QUAGEN_APP_SECRET="<value>"
        export QUAGEN_DB_NAME="<value>"
        export QUAGEN_DB_PORT="<value>"
        export QUAGEN_DB_USER="<value>"
        export QUAGEN_DOCKER_HUB="<value>"
        export QUAGEN_DOMAIN="<value>"
        export TF_VAR_do_api_token=$DO_API_TOKEN
        export TF_VAR_db_name="$QUAGEN_DB_NAME"
        export TF_VAR_db_user="$QUAGEN_DB_USER"

2.  Create K8s cluster and database on Digital Ocean.

        cd quagen

        terraform init deploy/terraform/digitalocean
        terraform apply -state=instance/terraform.tfstate deploy/terraform/digitalocean

        export QUAGEN_DB_HOST="<captured_from_terraform_output>"
        export QUAGEN_DB_PORT="<captured_from_terraform_output>"
        export QUAGEN_DB_PASSWORD=<captured_from_terraform_output>

3.  Deploy Quagen to the K8s cluster.

        cd quagen

        doctl auth init
        doctl kubernetes cluster kubeconfig save quagen-<cluster>

        cat deploy/k8/ingress.yaml | envsubst | kubectl apply -f -
        cat deploy/k8/deployment.yaml | envsubst | kubectl apply -f -

4.  The last step will have created a load balancer in Digital Ocean. Set your
    selected domain name to point to the public IP address of the load balancer.
    When this has resolved, you should be able to navigate to `http://your_domain_name`
    and see Quagen.

5.  Now let's setup SSL

        kubectl create namespace cert-manager
        cat deploy/k8/ssl.yaml | envsubst | kubectl apply -f - 

    **NOTE:** I've noticed the above might fail with `Internal error occurred: failed
    calling webhook "webhook.cert-manager.io"`, but waiting a couple of minutes
    and trying again seems to work.

6.  Navigating to `https://your_domain_name` should now work and any attempt at `http`
    should redirect to `https`!

## Quick diagnostics

A few helpful commands to run to check how everything is doing:

    kubectl get pod
    kubectl get svc --namespace=ingress-nginx
    kubectl describe ingress
    kubectl describe certificate
    kubectl logs <pod>

## Destroy

To blow (most) everything back up,

    terraform destroy -var "do_api_token=$env:DO_API_TOKEN"

**NOTE:** The K8s deployment will have created a load balancer that Terraform
will not know about. This will need to be removed out of band.

[digitalocean]: https://digitalocean.com
[kubectl]: https://kubernetes.io/docs/tasks/tools/install-kubectl/
[doctl]: https://github.com/digitalocean/doctl
[terraform]: https://www.terraform.io/
