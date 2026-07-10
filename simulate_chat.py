import json
import urllib.request
import time

GATEWAY_URL = "http://localhost:8080"
TICKET_SERVICE_URL = "http://localhost:8082"

def post_json(url, data, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, res.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 500, str(e)

def register_client():
    print("\n--- 1. Cadastrando Cliente de Teste ---")
    client_payload = {
        "companyName": "Incorporate Testes LTDA",
        "cnpj": "12.345.678/0001-90"
    }
    url = f"{TICKET_SERVICE_URL}/api/v1/clients"
    status, response = post_json(url, client_payload)
    if status in (200, 201):
        print(f"✅ Cliente cadastrado com sucesso! (Status: {status})")
    elif status == 409:
        print("ℹ️ Cliente já cadastrado no sistema.")
    else:
        print(f"❌ Erro ao cadastrar cliente: Status {status}, Resposta: {response}")

def simulate_message(sender, name, text):
    print(f"\n--- Simulando mensagem de '{name}' ({sender}): \"{text}\" ---")
    payload = {
        "event": "messages.upsert",
        "instance": "setoriza",
        "sender": sender,
        "data": {
            "key": {
                "remoteJid": f"{sender}@s.whatsapp.net",
                "fromMe": False,
                "id": f"MOCK_MSG_{int(time.time())}"
            },
            "pushName": name,
            "messageType": "conversation",
            "message": {
                "conversation": text
            }
        }
    }
    url = f"{GATEWAY_URL}/api/v1/webhooks/evolution"
    status, response = post_json(url, payload)
    if status == 200:
        print(f"✅ Webhook enviado com sucesso! (Status: {status})")
    else:
        print(f"❌ Erro no webhook: Status {status}, Resposta: {response}")

def main():
    print("====================================================")
    print(" Simulador de Mensagens e Fluxo de Chat - Setoriza  ")
    print("====================================================")
    
    register_client()
    
    sender_number = "5511999998888"
    sender_name = "Randy Gomes Dev"
    
    input("\nPressione ENTER para enviar a mensagem inicial de contato ('Olá')...")
    simulate_message(sender_number, sender_name, "Olá, bom dia! Gostaria de falar com o suporte.")
    print("🤖 O chatbot do Setoriza deve ter criado um ticket temporário de identificação e solicitado o CNPJ da empresa.")
    
    input("\nPressione ENTER para enviar o CNPJ correto ('12.345.678/0001-90')...")
    simulate_message(sender_number, sender_name, "12.345.678/0001-90")
    print("🤖 O chatbot deve ter reconhecido a 'Incorporate Testes LTDA', vinculado o contato, promovido o ticket para Triagem e retornado a lista de setores.")
    
    input("\nPressione ENTER para escolher o setor '1' (Fiscal)...")
    simulate_message(sender_number, sender_name, "1")
    print("🤖 O chatbot deve ter encaminhado o ticket para o setor Fiscal e alterado o status para AGUARDANDO_ATENDIMENTO.")
    
    print("\n====================================================")
    print("🎉 Fluxo simulado com sucesso! Abra o painel de atendimento para visualizar o novo ticket.")
    print("====================================================")

if __name__ == "__main__":
    main()
