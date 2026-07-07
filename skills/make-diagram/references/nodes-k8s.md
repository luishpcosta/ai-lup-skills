# Nós Kubernetes (diagrams.k8s.*)

Todas as classes de nós K8s da lib `diagrams`, agrupadas por módulo. Importe como `from diagrams.k8s.<modulo> import <Classe>`.

Módulos: chaos, clusterconfig, compute, controlplane, ecosystem, group, infra, network, others, podconfig, rbac, storage

## k8s.chaos
- ChaosMesh
- LitmusChaos
## k8s.clusterconfig
- HPA (alias: HorizontalPodAutoscaler)
- Limits (alias: LimitRange)
- Quota
## k8s.compute
- Cronjob
- Deploy (alias: Deployment)
- DS (alias: DaemonSet)
- Job
- Pod
- RS (alias: ReplicaSet)
- STS (alias: StatefulSet)
## k8s.controlplane
- API (alias: APIServer)
- CCM
- CM (alias: ControllerManager)
- KProxy (alias: KubeProxy)
- Kubelet
- Sched (alias: Scheduler)
## k8s.ecosystem
- ExternalDns
- Helm
- Krew
- Kustomize
## k8s.group
- NS (alias: Namespace)
## k8s.infra
- ETCD
- Master
- Node
## k8s.network
- Ep (alias: Endpoint)
- Ing (alias: Ingress)
- Netpol (alias: NetworkPolicy)
- SVC (alias: Service)
## k8s.others
- CRD
- PSP
## k8s.podconfig
- CM (alias: ConfigMap)
- Secret
## k8s.rbac
- CRole (alias: ClusterRole)
- CRB (alias: ClusterRoleBinding)
- Group
- RB (alias: RoleBinding)
- Role
- SA (alias: ServiceAccount)
- User
## k8s.storage
- PV (alias: PersistentVolume)
- PVC (alias: PersistentVolumeClaim)
- SC (alias: StorageClass)
- Vol (alias: Volume)
