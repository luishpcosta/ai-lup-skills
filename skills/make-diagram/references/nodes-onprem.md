# Nós On-Premises (diagrams.onprem.*)

Classes para tecnologias auto-hospedadas/open-source (nginx, kafka, postgres, redis, prometheus...). Importe como `from diagrams.onprem.<modulo> import <Classe>`.

Módulos: aggregator, analytics, auth, cd, certificates, ci, client, compute, container, database, dns, etl, gitops, groupware, iac, identity, inmemory, logging, messaging, mlops, monitoring, network, proxmox, queue, registry, search, security, storage, tracing, vcs, workflow

## onprem.aggregator
- Fluentd
- Vector
## onprem.analytics
- Beam
- Databricks
- Dbt
- Dremio
- Flink
- Hadoop
- Hive
- Metabase
- Norikra
- Powerbi (alias: PowerBI)
- Presto
- Singer
- Spark
- Storm
- Superset
- Tableau
- Trino
## onprem.auth
- Boundary
- BuzzfeedSso
- Oauth2Proxy
## onprem.cd
- Spinnaker
- TektonCli
- Tekton
## onprem.certificates
- CertManager
- LetsEncrypt
## onprem.ci
- Circleci (alias: CircleCI)
- Concourseci (alias: ConcourseCI)
- Droneci (alias: DroneCI)
- GithubActions
- Gitlabci (alias: GitlabCI)
- Jenkins
- Teamcity (alias: TC)
- Travisci (alias: TravisCI)
- Zuulci (alias: ZuulCI)
## onprem.client
- Client
- User
- Users
## onprem.compute
- Nomad
- Server
## onprem.container
- Containerd
- Crio
- Docker
- Firecracker
- Gvisor
- K3S
- Lxc (alias: LXC)
- Rkt (alias: RKT)
## onprem.database
- Cassandra
- Clickhouse (alias: ClickHouse)
- Cockroachdb (alias: CockroachDB)
- Couchbase
- Couchdb (alias: CouchDB)
- Dgraph
- Druid
- Duckdb
- Hbase (alias: HBase)
- Influxdb (alias: InfluxDB)
- Janusgraph (alias: JanusGraph)
- Mariadb (alias: MariaDB)
- Mongodb (alias: MongoDB)
- Mssql (alias: MSSQL)
- Mysql (alias: MySQL)
- Neo4J
- Oracle
- Postgresql (alias: PostgreSQL)
- Qdrant (alias: Qdrant)
- Scylla
## onprem.dns
- Coredns
- Powerdns
## onprem.etl
- Embulk
## onprem.gitops
- Argocd (alias: ArgoCD)
- Flagger
- Flux
## onprem.groupware
- Nextcloud
## onprem.iac
- Ansible
- Atlantis
- Awx
- Pulumi
- Puppet
- Terraform
## onprem.identity
- Dex
## onprem.inmemory
- Aerospike
- Hazelcast
- Memcached
- Redis
## onprem.logging
- Fluentbit (alias: FluentBit)
- Graylog
- Loki
- Rsyslog (alias: RSyslog)
- SyslogNg
## onprem.messaging
- Centrifugo
## onprem.mlops
- Mlflow
- Polyaxon
## onprem.monitoring
- Cortex
- Datadog
- Dynatrace
- Grafana
- Humio
- Mimir
- Nagios
- Newrelic
- PrometheusOperator
- Prometheus
- Sentry
- Splunk
- Thanos
- Zabbix
## onprem.network
- Ambassador
- Apache
- Bind9
- Caddy
- CiscoRouter
- CiscoSwitchL2
- CiscoSwitchL3
- Consul
- Envoy
- Etcd (alias: ETCD)
- Glassfish
- Gunicorn
- Haproxy (alias: HAProxy)
- Internet
- Istio
- Jbossas
- Jetty
- Kong
- Linkerd
- Mikrotik
- Nginx
- Ocelot
- OpenServiceMesh (alias: OSM)
- Opnsense (alias: OPNSense)
- Pfsense (alias: PFSense)
- Pomerium
- Powerdns
- Tomcat
- Traefik
- Tyk
- Vyos (alias: VyOS)
- Wildfly
- Yarp
- Zookeeper
## onprem.proxmox
- Pve (alias: ProxmoxVE)
## onprem.queue
- Activemq (alias: ActiveMQ)
- Celery
- Emqx (alias: EMQX)
- Kafka
- Nats
- Rabbitmq (alias: RabbitMQ)
- Zeromq (alias: ZeroMQ)
## onprem.registry
- Harbor
- Jfrog
## onprem.search
- Solr
## onprem.security
- Bitwarden
- Trivy
- Vault
## onprem.storage
- CephOsd (alias: CEPH_OSD)
- Ceph (alias: CEPH)
- Glusterfs
- Portworx
## onprem.tracing
- Jaeger
- Tempo
## onprem.vcs
- Git
- Gitea
- Github
- Gitlab
- Svn
## onprem.workflow
- Airflow
- Digdag
- Kubeflow (alias: KubeFlow)
- Nifi (alias: NiFi)
