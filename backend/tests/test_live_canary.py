import requests
import sys

# Configure stdout to handle UTF-8 cleanly
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

BASE_URL = "https://arkive-ai-backend.onrender.com"

def test_canary():
    print("="*60)
    print("RUNNING 3 CANARY TESTS AGAINST LIVE DEPLOYMENT")
    print(f"Target URL: {BASE_URL}")
    print("="*60)

    # T-R01: Beijing Analytics (China, no EU office, EU clients) -> must return Provider, not Importer
    print("\nRunning T-R01: Beijing Analytics...")
    tr01_payload = {
        "organization_name": "Beijing Analytics",
        "involvement": "An organization established in Beijing, China, with no physical office or legal establishment inside the European Union. They supply AI predictive analytics models to enterprise clients located inside the European Union.",
        "system_origin": "Developed in-house in China by Beijing Analytics"
    }
    
    try:
        r1 = requests.post(f"{BASE_URL}/api/role/classify", json=tr01_payload, timeout=120)
        if r1.status_code != 200:
            print(f"[FAIL] T-R01 API failed with status {r1.status_code}: {r1.text}")
        else:
            res1 = r1.json()
            roles = res1.get("roles", [])
            primary_role = res1.get("primary_role", "")
            print(f"Response: {res1}")
            is_provider = "Provider" in roles or "Provider" == primary_role
            is_importer = "Importer" in roles or "Importer" == primary_role
            if is_provider and not is_importer:
                print("[PASS] T-R01: Returned Provider, not Importer.")
            else:
                print(f"[FAIL] T-R01: Roles: {roles}, Primary: {primary_role}")
    except Exception as e:
        print(f"[ERROR] T-R01 Error calling live URL: {e}")

    # T-R02: EuroTech (EU-established, brings in non-EU AI) -> must return Importer, not Distributor
    print("\nRunning T-R02: EuroTech...")
    tr02_payload = {
        "organization_name": "EuroTech",
        "involvement": "An organization legally established in Germany (EU). They import and place on the European Union market a medical diagnostics AI system developed by a US-based technology provider, under the US provider's trademark.",
        "system_origin": "Developed by US-based health tech provider (outside EU)"
    }
    
    try:
        r2 = requests.post(f"{BASE_URL}/api/role/classify", json=tr02_payload, timeout=120)
        if r2.status_code != 200:
            print(f"[FAIL] T-R02 API failed with status {r2.status_code}: {r2.text}")
        else:
            res2 = r2.json()
            roles = res2.get("roles", [])
            primary_role = res2.get("primary_role", "")
            print(f"Response: {res2}")
            is_importer = "Importer" in roles or "Importer" == primary_role
            is_distributor = "Distributor" in roles or "Distributor" == primary_role
            if is_importer and not is_distributor:
                print("[PASS] T-R02: Returned Importer, not Distributor.")
            else:
                print(f"[FAIL] T-R02: Roles: {roles}, Primary: {primary_role}")
    except Exception as e:
        print(f"[ERROR] T-R02 Error calling live URL: {e}")

    # T-K01: Employee keystroke monitoring -> must return High Risk, Annex III 4b, not biometric categorisation
    print("\nRunning T-K01: Employee keystroke monitoring...")
    tk01_payload = {
        "system_description": "An AI system that monitors employee productivity by tracking keystroke dynamics, mouse activity, active applications, and idle time on company computers.",
        "intended_purpose": "Assisting management in evaluating employee performance, behavioral compliance, and determining task allocation or potential promotion/termination.",
        "data_used": "Keystroke frequency and timing, mouse tracking coordinates, software usage logs, screen activity metrics."
    }
    
    try:
        r3 = requests.post(f"{BASE_URL}/api/risk-tier/classify", json=tk01_payload, timeout=120)
        if r3.status_code != 200:
            print(f"[FAIL] T-K01 API failed with status {r3.status_code}: {r3.text}")
        else:
            res3 = r3.json()
            risk_tier = res3.get("risk_tier", "")
            legal_basis = res3.get("legal_basis", "")
            annex_iii = res3.get("annex_iii_category", "")
            print(f"Response: {res3}")
            is_high = "High" in risk_tier
            is_4b = "4b" in legal_basis or "4b" in str(annex_iii)
            is_biometric = "1" in legal_basis or "1c" in legal_basis or "biometric" in str(annex_iii).lower() or "biometric" in risk_tier.lower()
            if is_high and is_4b and not is_biometric:
                print("[PASS] T-K01: Returned High Risk, Annex III 4b, not biometric categorisation.")
            else:
                print(f"[FAIL] T-K01: Tier: {risk_tier}, Legal Basis: {legal_basis}, Annex III: {annex_iii}")
    except Exception as e:
        print(f"[ERROR] T-K01 Error calling live URL: {e}")

if __name__ == "__main__":
    test_canary()
