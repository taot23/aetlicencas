import requests
import json

# Teste 1: Portal da Transparência
def test_transparencia():
    print("\n===== TESTE PORTAL DA TRANSPARÊNCIA =====")
    cnpj = "00000000000191"
    chave_api = "e9735f5ad81244b8182d7f8085205fc0"
    url = f"https://portaldatransparencia.gov.br/api-de-dados/cnpj?cnpj={cnpj}"
    
    headers = {
        "chave-api-dados": chave_api,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Resposta JSON: {json.dumps(data, indent=2)}")
            except:
                print("A resposta não é um JSON válido")
                print(f"Primeiros 200 caracteres da resposta: {response.text[:200]}...")
        else:
            print(f"Erro: {response.status_code}")
            print(f"Primeiros 200 caracteres da resposta: {response.text[:200]}...")
    except Exception as e:
        print(f"Erro ao fazer requisição: {e}")

# Teste 2: API Gov.br
def test_govbr():
    print("\n===== TESTE API GOV.BR =====")
    cnpj = "00000000000191"
    
    # Obter token
    print("1. Tentando obter token...")
    token_url = "https://h-apigateway.conectagov.estaleiro.serpro.gov.br/oauth2/jwt-token"
    
    # Valores simulados para testes
    client_id = "client-id-test"
    client_secret = "client-secret-test"
    
    import base64
    auth_header = "Basic " + base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    
    token_headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": auth_header
    }
    
    token_params = {
        "grant_type": "client_credentials"
    }
    
    try:
        token_response = requests.post(token_url, headers=token_headers, data=token_params)
        print(f"Status token: {token_response.status_code}")
        
        if token_response.status_code == 200:
            try:
                token_data = token_response.json()
                token = token_data.get("access_token")
                print(f"Token obtido com sucesso: {token[:10]}...")
                
                # Consultar CNPJ com o token
                print("\n2. Consultando CNPJ com o token...")
                cnpj_url = f"https://h-apigateway.conectagov.estaleiro.serpro.gov.br/api-cnpj-empresa/v2/empresa/{cnpj}"
                
                cnpj_headers = {
                    "Accept": "application/json",
                    "Authorization": f"Bearer {token}",
                    "x-cpf-usuario": "00000000000"
                }
                
                cnpj_response = requests.get(cnpj_url, headers=cnpj_headers)
                print(f"Status CNPJ: {cnpj_response.status_code}")
                
                if cnpj_response.status_code == 200:
                    try:
                        cnpj_data = cnpj_response.json()
                        print(f"Dados CNPJ: {json.dumps(cnpj_data, indent=2)}")
                    except:
                        print("A resposta não é um JSON válido")
                        print(f"Primeiros 200 caracteres da resposta: {cnpj_response.text[:200]}...")
                else:
                    print(f"Erro ao consultar CNPJ: {cnpj_response.status_code}")
                    print(f"Primeiros 200 caracteres da resposta: {cnpj_response.text[:200]}...")
            except:
                print("A resposta do token não é um JSON válido")
                print(f"Primeiros 200 caracteres da resposta: {token_response.text[:200]}...")
        else:
            print(f"Erro ao obter token: {token_response.status_code}")
            print(f"Primeiros 200 caracteres da resposta: {token_response.text[:200]}...")
    except Exception as e:
        print(f"Erro ao fazer requisição do token: {e}")

if __name__ == "__main__":
    print("TESTANDO APIS DE CONSULTA CNPJ")
    test_transparencia()
    test_govbr()