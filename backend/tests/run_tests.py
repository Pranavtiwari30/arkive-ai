import sys
import os
import json
import time
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

# Add backend dir to path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from services.role_classifier import classify_role
from services.risk_classifier import classify_risk_tier

def run_role_tests():
    print("="*50)
    print("RUNNING ROLE CLASSIFICATION TESTS")
    print("="*50)
    
    # Placeholder for the 30 role tests
    role_tests = [
        {
            "name": "Non-EU entity supplying to EU",
            "input": {
                "name": "US Tech Inc",
                "involvement": "Developed an AI system in the US and supplies it directly to users in France.",
                "origin": "Developed in-house"
            },
            "expected_role": "Provider"
        },
        {
            "name": "EU entity importing non-EU system",
            "input": {
                "name": "Euro AI Importers GmbH",
                "involvement": "Imports a facial recognition system from China and places it on the EU market under the Chinese company's name.",
                "origin": "Third-party outside EU"
            },
            "expected_role": "Importer"
        }
    ]
    
    passed = 0
    for idx, test in enumerate(role_tests, 1):
        print(f"Test {idx}/{len(role_tests)}: {test['name']}")
        result = classify_role(
            name=test["input"]["name"],
            involvement=test["input"]["involvement"],
            origin=test["input"]["origin"]
        )
        
        # Check if expected role is in the result's roles array or primary_role
        is_pass = False
        if "roles" in result and test["expected_role"] in result["roles"]:
            is_pass = True
        elif "primary_role" in result and test["expected_role"] in result["primary_role"]:
            is_pass = True
            
        if is_pass:
            print(f"✅ PASS")
            passed += 1
        else:
            print(f"❌ FAIL - Expected {test['expected_role']}, Got {result.get('roles', result.get('primary_role', 'Unknown'))}")
        time.sleep(1) # rate limiting
        
    print(f"\nRole Tests Summary: {passed}/{len(role_tests)} Passed")
    return passed == len(role_tests)

def run_risk_tests():
    print("\n" + "="*50)
    print("RUNNING RISK CLASSIFICATION TESTS")
    print("="*50)
    
    # Placeholder for the 48 risk tests
    risk_tests = [
        {
            "name": "CV screening tool",
            "input": {
                "description": "An AI system that scans resumes and ranks candidates.",
                "purpose": "To automate the recruitment process and filter job applications.",
                "data": "Resumes, cover letters, and candidate metadata."
            },
            "expected_tier": "High"
        },
        {
            "name": "Customer service chatbot",
            "input": {
                "description": "A chatbot on a retail website.",
                "purpose": "Answering basic customer FAQs.",
                "data": "Customer text queries and product catalog."
            },
            "expected_tier": "Limited"
        }
    ]
    
    passed = 0
    for idx, test in enumerate(risk_tests, 1):
        print(f"Test {idx}/{len(risk_tests)}: {test['name']}")
        result = classify_risk_tier(
            description=test["input"]["description"],
            purpose=test["input"]["purpose"],
            data=test["input"]["data"]
        )
        
        if "risk_tier" in result and test["expected_tier"] in result["risk_tier"]:
            print(f"✅ PASS")
            passed += 1
        else:
            print(f"❌ FAIL - Expected {test['expected_tier']}, Got {result.get('risk_tier', 'Unknown')}")
        time.sleep(1) # rate limiting
        
    print(f"\nRisk Tests Summary: {passed}/{len(risk_tests)} Passed")
    return passed == len(risk_tests)

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
    
    print("Initializing test suite against EU AI Act rules...")
    role_ok = run_role_tests()
    risk_ok = run_risk_tests()
    
    if role_ok and risk_ok:
        print("\n✅ ALL TESTS PASSED.")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED.")
        sys.exit(1)
