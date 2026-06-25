from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Agentic Data Steward API",
    description="Back-end para automação, processamento e governança inteligente de dados.",
    version="1.0.0"
)

# Configuração de CORS para permitir que o React na raiz acesse a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, mude para a URL do seu front-end
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "project": "Agentic Data Steward"}

@app.get("/api/health")
def health_check():
    return {"message": "Pipeline de dados pronto para processamento."}