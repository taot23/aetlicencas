import requests

cnpj = "00000000000191"  # CNPJ da Receita Federal
chave_api = "e9735f5ad81244b8182d7f8085205fc0"
url = f"https://portaldatransparencia.gov.br/api-de-dados/cnpj?cnpj={cnpj}"

headers = {"chave-api-dados": chave_api}
response = requests.get(url, headers=headers)

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print(response.json())
else:
    print("Erro:", response.status_code)
    print("Resposta:", response.text)

# Testar com outro CNPJ de exemplo
cnpj2 = "10280806000134"
url2 = f"https://portaldatransparencia.gov.br/api-de-dados/cnpj?cnpj={cnpj2}"
response2 = requests.get(url2, headers=headers)

print(f"\nStatus Code para CNPJ {cnpj2}: {response2.status_code}")
if response2.status_code == 200:
    print(response2.json())
else:
    print("Erro:", response2.status_code)
    print("Resposta:", response2.text)