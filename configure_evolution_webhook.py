import json
import urllib.request

EVOLUTION_URL = "http://localhost:8085"
API_KEY = "setoriza_api_key_12345"
INSTANCE_NAME = "setoriza"
WEBHOOK_URL = "http://localhost:8080/api/v1/webhooks/evolution"

def configure_webhook():
    print(f"--- Configurando Webhook na Evolution API (Instância: {INSTANCE_NAME}) ---")
    
    url = f"{EVOLUTION_URL}/webhook/set/{INSTANCE_NAME}"
    payload = {
        "webhook": {
            "enabled": True,
            "url": WEBHOOK_URL,
            "byEvents": False,
            "events": [
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE"
            ],
            "headers": {
                "apikey": API_KEY
            }
        }
    }
    
    headers = {
        "apikey": API_KEY,
        "Content-Type": "application/json"
    }
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode("utf-8"), 
        headers=headers, 
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            print(f"✅ Webhook configurado com sucesso! (Status: {res.status})")
            print("Resposta:", res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"❌ Erro ao configurar webhook: Status {e.code}")
        print("Resposta:", e.read().decode("utf-8"))
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")

if __name__ == "__main__":
    configure_webhook()
