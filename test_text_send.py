import urllib.request
import json

url = 'http://localhost:8082/api/v1/tickets/f6a681d5-1c05-4443-b9db-47c8f4f90db9/messages'
headers = {"Content-Type": "application/json"}
payload = {"content": "Olá, teste de mensagem de texto direta"}

req = urllib.request.Request(
    url, 
    data=json.dumps(payload).encode("utf-8"), 
    headers=headers, 
    method="POST"
)

try:
    with urllib.request.urlopen(req) as res:
        print("Success! Status:", res.status)
        print("Response:", res.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
