import json
from groq import Groq

# ─────────────────────────────────────────────
# PARTE A: A FERRAMENTA (sua função Python)
# ─────────────────────────────────────────────

def calcular_tempo_de_chegada(distancia: float, velocidade_media: float) -> dict:
    if velocidade_media <= 0:
        return {"erro": "Velocidade média deve ser maior que zero."}
    tempo_em_minutos = (distancia / velocidade_media) * 60
    return {"tempo_em_minutos": tempo_em_minutos}
