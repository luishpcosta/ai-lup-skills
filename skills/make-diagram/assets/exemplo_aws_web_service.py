# Template mínimo de diagrama AWS — copie, renomeie e adapte.
# Gere com: python3 scripts/generate_diagram.py <este_arquivo>.py --output-dir <destino>
from diagrams import Cluster, Diagram
from diagrams.aws.compute import ECS
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB, Route53

with Diagram("Web Service", show=False):
    dns = Route53("dns")
    lb = ELB("lb")

    with Cluster("Services"):
        svcs = [ECS("web1"), ECS("web2")]

    dns >> lb >> svcs >> RDS("userdb")
