from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app, Counter, Histogram
import time

from app.config import settings
from app.k8s_client import k8s_client

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API querying real Kubernetes clusters directly, demonstrating GitOps automation.",
    version="1.0.0"
)

# CORS middleware configuration for React Dashboard integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For portfolio/dev, allow all origins. Can be restricted to Vite port.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus Metrics Setup
REQUEST_COUNT = Counter(
    "gitops_platform_http_requests_total",
    "Total HTTP requests processed",
    ["method", "endpoint", "http_status"]
)
REQUEST_LATENCY = Histogram(
    "gitops_platform_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["endpoint"]
)

# Expose metrics endpoint at /metrics for Prometheus scrapers
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.middleware("http")
async def monitor_requests(request, call_next):
    start_time = time.time()
    endpoint = request.url.path
    method = request.method
    
    # Process request
    response = await call_next(request)
    
    # Record metrics
    duration = time.time() - start_time
    status_code = str(response.status_code)
    
    if not endpoint.startswith("/metrics"):
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, http_status=status_code).inc()
        REQUEST_LATENCY.labels(endpoint=endpoint).observe(duration)
        
    return response

# API Core Endpoints

@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "k8s_connected": not k8s_client.mock_mode
    }

@app.get("/api/cluster/status")
def get_cluster_status():
    """
    Returns high-level status of the Kubernetes cluster, including active namespaces and connectivity mode.
    """
    try:
        namespaces = k8s_client.get_namespaces()
        return {
            "connected": not k8s_client.mock_mode,
            "mode": "Live Cluster Connection" if not k8s_client.mock_mode else "Sandbox Mock Mode (No Cluster Detected)",
            "namespaces": namespaces
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cluster/resources")
def get_cluster_resources(namespace: str = Query("dev", description="Target Kubernetes namespace")):
    """
    Retrieves real deployments, services, pods, and HPAs in the specified namespace.
    """
    if namespace not in settings.ALLOWED_NAMESPACES:
        raise HTTPException(status_code=400, detail=f"Namespace '{namespace}' is not managed by this platform.")
    
    try:
        deployments = k8s_client.get_deployments(namespace)
        pods = k8s_client.get_pods(namespace)
        services = k8s_client.get_services(namespace)
        hpas = k8s_client.get_hpas(namespace)
        
        return {
            "namespace": namespace,
            "deployments": deployments,
            "pods": pods,
            "services": services,
            "hpas": hpas
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cluster/logs")
def get_pod_logs(namespace: str, pod: str):
    """
    Fetches the container logs from the specified pod in real time.
    """
    try:
        logs = k8s_client.get_pod_logs(namespace, pod)
        return {"pod": pod, "logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/gitops/status")
def get_gitops_status():
    """
    Fetches GitOps sync state, drift detection indicators, and active Git commits compared with the cluster.
    """
    try:
        return k8s_client.get_gitops_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/gitops/drift")
def simulate_gitops_drift():
    """
    Simulates out-of-sync cluster drift manually by scaling replicas or changing configuration settings.
    """
    try:
        return k8s_client.simulate_drift()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/gitops/sync")
def reconcile_gitops():
    """
    Triggers ArgoCD reconciliation / cluster self-healing to restore the git configurations.
    """
    try:
        return k8s_client.trigger_self_heal()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rollouts")
def get_progressive_rollouts(namespace: str = Query("prod")):
    """
    Lists Argo Rollouts (Canary / Blue-Green) deployed in the specified namespace.
    """
    try:
        return k8s_client.get_rollouts(namespace)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rollouts/promote")
def promote_progressive_rollout(namespace: str, name: str):
    """
    Promotes the next step of an Argo Rollout Canary, or locks in a Blue-Green deployment.
    """
    try:
        return k8s_client.promote_rollout(namespace, name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rollouts/abort")
def abort_progressive_rollout(namespace: str, name: str):
    """
    Aborts a progressive rollout and triggers immediate rollback to stable.
    """
    try:
        return k8s_client.abort_rollout(namespace, name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
