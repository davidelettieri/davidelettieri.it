---
title:  Use cilium service mesh on AKS
date: 2024-03-21 18:00:00 +0100
tags: [aks, cilium, gateway-api, k8s, service-mesh]
---

:::warning

On 2025-08-02 I updated the repo corresponding to this post to use updated versions of Kubernetes, Cilium and Gateway API. The post is not updated accordingly. I did follow again the procedure explained here to confirm that everything is still working as expected. Most notable change is that we don't need experimental channel of Gateway API except for one resource, as described in Cilium v1.17.0 docs.

:::

Azure BYOCNI configuration allows the use of [cilium](https://cilium.io/) as CNI, in addition to that it is possible to configure [cilium service mesh](https://docs.cilium.io/en/stable/network/servicemesh/#servicemesh-root).

Cilium service mesh has several functionalities such as ingress controller, gateway api, mtls etc... my objective here is to use [k8s gateway api](https://gateway-api.sigs.k8s.io/). In order to enable cilium service mesh we have to replace kube-proxy with cilium itself, to do so we need to enable the kube proxy configuration feature on aks, which is currently in preview.

Cilium supports gateway api v1 from version 1.15, which is the one that I'm installing today. In particular I will install gateway api v1 experimental channel. This will allow to configure the underlying infrastructure (an azure load balancer) if needed. 

<!-- truncate -->

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

```bash title="Install preview kube proxy configuration feature"
az feature register --namespace "Microsoft.ContainerService" --name "KubeProxyConfigurationPreview"
```

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

We need to deploy 2 resources, the resource group and the AKS cluster. The AKS cluster will create an additional resource group and some resources inside that. This is expected and it's not related to the kind of deployment we are doing. We could, if needed, create some of the required resources instead of letting all of them be managed by AKS. One example is the vnet, we could deploy a vnet before deploying AKS and then have the cluster inside that vnet. That would give us much greater control, we could add a firewall, a NAT gateway, decide CIDR for nodes and pods, etc... This is a supported scenario and it could be necessary to do so based on cluster requirements.

I'm deploying the minimum amount of resources needed to have cilium service mesh working, which is a resource group and an aks cluster. The cluster itself will manage the underlying network.

In the repo a parameter file is provided with some default option, you can tweak some names and the sku of the vm and the load balancer. My objective here is to keep cost at a minimum. I wouldn't suggest to use those values for a production deployment.

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


```bash title="Disable kube proxy"
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

# sample output
🔮 Auto-detected Kubernetes kind: AKS
ℹ️  Using Cilium version 1.15.2
🔮 Auto-detected cluster name: cilium-service-mesh-aks
✅ Derived Azure subscription ID <subscription_id> from subscription Pay-As-You-Go
✅ Detected Azure AKS cluster in BYOCNI mode (no CNI plugin pre-installed)
🔮 Auto-detected kube-proxy has not been installed
ℹ️  Cilium will fully replace all functionalities of kube-proxy
```

Using `cilium status` we can monitor the progress of the deployment of cilium. Please be aware that it might take some time to have everything working. I was a bit worried to be honest because it took a long time, however in the end all worked as expected. I think the deployment time can be reduced having more powerful vms and possibly a standard load balancer.

When all the deployments are green validate that all is working correctly:

```bash title="Execute cilium test suite"
cilium connectivity test
...
✅ All 43 tests (184 actions) successful, 18 tests skipped, 0 scenarios skipped.
```

## Cilium service mesh gateway api HTTP sample

As an additional validation we can run the [HTTP sample found on cilium docs](https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/http/), I won't replicate the sample from cilium docs. A couple of commands will install everything that is needed, please check cilium docs to understand how to check that everything is working correctly.

```bash title="Install sample app and gateway"
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.11/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/1.15.2/examples/kubernetes/gateway/basic-http.yaml
```

### Some screenshots to display the outcome from the AKS dashboard point of view

Note here the (obfuscated) public ip address automatically attached to the service  
<img src="/img/services.png" alt="Kubernetes services created by the sample" />

The useful CRD section in AKS dashboard showing all the resources installed by us (gateway api) and by cilium
<img src="/img/crd.png" alt="Custom resource definitions" />

Instances of the resources deployed by the `basic-http.yaml` file
<img src="/img/gateway.png" alt="The deployed gateway" />
<img src="/img/http-route.png" alt="The deployed http route" />

## Azure annotations

Using the experimental channel of gateway API we can use the `infrastructure` object in the gateway definition to pass annotation to the load balancer service that is created. All the available annotations can be found [here](https://cloud-provider-azure.sigs.k8s.io/topics/loadbalancer/#loadbalancer-annotations).

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
spec:
  ...
  infrastructure:
    annotations:
      service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

## Final remarks

If you need to run a kubernetes cluster with restricted network at vnet level (not k8s network policies level) please be aware that cilium has some requirements https://docs.cilium.io/en/stable/operations/system_requirements/#firewall-rules, if you have any kind of connectivity world->aks or pod->pod you will need more than that. Be aware and test everything before making the decision of using cilium.