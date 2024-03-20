---
title:  Use cilium service mesh on AKS
date: 2024-03-31 18:00:00 +0100
tags: [aks, cilium, gateway-api, k8s]
---

Azure BYOCNI configuration allows the use of [cilium](https://cilium.io/) as CNI, in addition it is possible to configure [cilium service mesh](https://docs.cilium.io/en/stable/network/servicemesh/#servicemesh-root).

<!-- truncate -->

Cilium service mesh has several functionalities such as ingress controller, gateway api, mtls etc... my objective here is to use [k8s gateway api](https://gateway-api.sigs.k8s.io/). In order to do so we need to enable the kube proxy configuration feature on aks, which is currently in preview.

Cilium supports gateway api v1 from version 1.15, which is the one that I'm installing today. In particular I will install gateway api v1 experimental channel. This will allow to configure the underlying infrastructure (the azure load balancer) if needed. 

## The repo

[This github repo](https://github.com/davidelettieri/aks-cilium-service-mesh) contains the bicep files I used to deploy and all the commands required to perform the full installation. I will go through the different steps.

The repo contains a devcontainer definition, which has:
- kubectl
- az cli
- cilium cli
- bicep and bicep vs code extension

Please login with `az` before performing any step.

## Enable preview feature

We need to enable [kube proxy configuration](https://learn.microsoft.com/en-us/azure/aks/configure-kube-proxy). This step requires some time, I suggest to do this at the beginning and while we wait we can proceed with infrastructure deployment.

To check progress on this run

```bash title="Check feature registration status"
az feature show --namespace "Microsoft.ContainerService" --name "KubeProxyConfigurationPreview"
```

What do want to see is

```bash title="Feature is registered"
{
  "id": "/subscriptions/<subscription-id>/providers/Microsoft.Features/providers/Microsoft.ContainerService/features/KubeProxyConfigurationPreview",
  "name": "Microsoft.ContainerService/KubeProxyConfigurationPreview",
  "properties": {
    "state": "Registered"
  },
  "type": "Microsoft.Features/providers/features"
}
```

## Infrastructure deployment

We need to deploy 2 resources, the resource group and the AKS cluster. The AKS cluster will create an additional resource group and some resources inside that. This is expected and it's not related to the kind of deployment we are doing. We could, if needed, create some resources instead of letting all of them be managed by AKS. One example is the vnet, we could deploy a vnet before deploying AKS and the have the cluster inside that vnet. That would give us much greater control, we could add a firewall, a NAT gateway etc... It is a supported scenario and it could be necessary to do so based on cluster requirements.

I'm deploying the minimum amount of resources needed to have cilium service mesh working, which is a resource group and an aks cluster. The cluster itself will manage the underlying network.

There is a parameter file, you can tweak some names and sku of vm and load balancer. My objective here is to keep cost at a minimum. I wouldn't suggest to use those values for a production deployment.

```bash title="Deploy AKS"
az deployment sub create \
    --name aks-cilium-service-mesh \
    --template-file bicep/main.bicep \
    --parameters bicep/main.bicepparam \
    --location westeurope

az aks get-credentials --resource-group "$rgName" --name "$aksName"
```

The last line in the sample will create a context for kubectl so that we can access the cluster later on.

## Disable kube proxy

Verify that the feature has been registered

```bash title="Check feature registration status"
az feature show --namespace "Microsoft.ContainerService" --name "KubeProxyConfigurationPreview"
```

If so proceed with 


```bash title="Deploy AKS"
az provider register --namespace Microsoft.ContainerService
az aks update -g "$rgName" -n "$aksName" --kube-proxy-config kube-proxy.json
```

The configuration file is quite simple:

```json title="kube-proxy.json"
{
  "enabled": false
}
```

## Install gateway api

We need to install the custom resources of gateway api **before** installing cilium. We want the experimental channel in order to have the [`infrastructure` field](https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.GatewayInfrastructure) in the Gateway definition. This will allow us to use azure annotations to configure the load balancer.

```bash title="Install gateway api with kubectl"
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/experimental-install.yaml
```

## Install cilium

Now we are ready to install cilium with the required options to enable service mesh functionality

```bash
cilium install --version 1.15.2 \
    --set azure.resourceGroup="$rgName" \
    --set kubeProxyReplacement=true \
    --set gatewayAPI.enabled=true
```

Using `cilium status` we can monitor the progress of the deployment of cilium. Please be aware that it might take some time to have everything working. I was a bit worried to be honest because it took a long time, however in the end all worked as expected. I think the deployment time can be reduced having more powerful vms and possibly a standard load balancer.

When all the deployments are green validate that all is working correctly:

```bash title="Execute cilium test suite"
cilium connectivity test

...

✅ All 43 tests (184 actions) successful, 18 tests skipped, 0 scenarios skipped.
```
