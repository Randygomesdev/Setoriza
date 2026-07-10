import urllib.request
import uuid

boundary = '------Boundary' + str(uuid.uuid4())
filename = 'test_audio.webm'
content_type = 'audio/webm'
file_data = b'DUMMY WEBM DATA CONTENT'

body = []
# file field
body.append(f'--{boundary}'.encode('utf-8'))
body.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode('utf-8'))
body.append(f'Content-Type: {content_type}'.encode('utf-8'))
body.append(b'')
body.append(file_data)

# caption field
body.append(f'--{boundary}'.encode('utf-8'))
body.append('Content-Disposition: form-data; name="caption"'.encode('utf-8'))
body.append(b'')
body.append('Test caption from python script'.encode('utf-8'))

body.append(f'--{boundary}--'.encode('utf-8'))
body.append(b'')

payload = b'\r\n'.join(body)

url = 'http://localhost:8082/api/v1/tickets/f6a681d5-1c05-4443-b9db-47c8f4f90db9/messages/media'
req = urllib.request.Request(url, data=payload, method='POST')
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')

try:
    with urllib.request.urlopen(req) as res:
        print("Success! Status:", res.status)
        print("Response:", res.read().decode('utf-8'))
except Exception as e:
    if hasattr(e, 'read'):
        print("HTTP Error:", e.code)
        print("Response detail:", e.read().decode('utf-8'))
    else:
        print("Error:", e)
