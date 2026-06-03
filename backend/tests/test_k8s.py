from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "status" in response.json()
    assert response.json()["status"] == "online"

def test_cluster_status():
    response = client.get("/api/cluster/status")
    assert response.status_code == 200
    data = response.json()
    assert "connected" in data
    assert "namespaces" in data
    assert "dev" in data["namespaces"]

def test_cluster_resources():
    response = client.get("/api/cluster/resources?namespace=dev")
    assert response.status_code == 200
    data = response.json()
    assert "namespace" in data
    assert "deployments" in data
    assert "pods" in data
    assert "services" in data

def test_invalid_namespace():
    response = client.get("/api/cluster/resources?namespace=invalid-ns")
    assert response.status_code == 400

def test_gitops_endpoints():
    # Test status endpoint
    status_response = client.get("/api/gitops/status")
    assert status_response.status_code == 200
    assert "sync_status" in status_response.json()
    
    # Test drift simulation endpoint
    drift_response = client.post("/api/gitops/drift")
    assert drift_response.status_code == 200
    assert drift_response.json()["status"] == "success"
    
    # Test sync trigger
    sync_response = client.post("/api/gitops/sync")
    assert sync_response.status_code == 200
    assert sync_response.json()["status"] == "success"
