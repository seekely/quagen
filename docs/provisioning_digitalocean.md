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

1.  Create K8s cluster and database on Digital Ocean.

        export DO_API_TOKEN=<digital_ocean_api_token>
        cd quagen/deploy/terraform/digitalocean

        terraform init
        terraform apply -var "do_api_token=$DO_API_TOKEN"
        export QUAGEN_DB_PASSWORD=<captured_from_terraform_output>

2.  Deploy Quagen to the K8s cluster.

        doctl auth init
        doctl kubernetes cluster kubeconfig save quagen-production

        cd quagen/deploy/k8
        kubectl apply -f deployment.yaml
        kubectl apply -f ingress.yaml

3.  The last step will have created a load balancer in Digital Ocean. Set your
    selected domain name to point to the public IP address of the load balancer.
    When this has resolved, you should be able to navigate to `http://your_domain_name`
    and see Quagen.

4.  Now let's setup SSL

        kubectl create namespace cert-manager
        kubectl apply -f ssl.yaml

5.  Navigating to `https://your_domain_name` should now work and any attempt at `http`
    should redirect to `https`!

## Quick diagnostics

A few helpful commands to run to check how everything is doing:

    kubectl get pod
    kubectl get svc --namespace=ingress-nginx
    kubectl describe ingress
    kubectl describe certificate

## Destroy

To blow (most) everything back up,

    terraform destroy -var "do_api_token=$env:DO_API_TOKEN"

[digitalocean]: https://digitalocean.com
[kubectl]: https://kubernetes.io/docs/tasks/tools/install-kubectl/
[doctl]: https://github.com/digitalocean/doctl
[terraform]: https://www.terraform.io/
