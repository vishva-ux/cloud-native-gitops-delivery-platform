import os

class Settings:
    PROJECT_NAME: str = "Cloud-Native GitOps Delivery Platform API"
    ALLOWED_NAMESPACES: list[str] = ["dev", "staging", "prod", "argocd", "monitoring"]
    
    # GitOps Configurations
    GIT_REPO_URL: str = os.getenv("GIT_REPO_URL", "https://github.com/vishva-ux/cloud-native-gitops-delivery-platform")
    
    # DB Configurations (Postgres)
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgrespassword")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "gitops_db")

settings = Settings()
