def test_churn_analysis_returns_required_schema(client):
    payload = {
        "customer_id": "TEL-7824A",
        "name": "Jordan Lee",
        "domain": "Telecom",
        "recent_usage": "down 45% in past 3 months",
        "complaints": ["Slow data speeds", "Dropped calls"],
        "billing_issues": ["Overcharged $30 last cycle"],
        "sentiment": "Negative in last support call",
        "support_history": ["3 calls in 2 months"],
        "plan": "Unlimited 5G",
        "tenure_months": 18,
    }

    response = client.post("/api/churn/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {
        "customer_id",
        "churn_score",
        "reasoning",
        "root_cause",
        "recommended_intervention",
        "follow_up_task",
    }
    assert data["customer_id"] == "TEL-7824A"
    assert 0 <= data["churn_score"] <= 1
    assert data["reasoning"]
    assert data["root_cause"]
    assert data["recommended_intervention"]


def test_batch_analysis_persists_results(client):
    response = client.post(
        "/api/churn/analyze-batch",
        json={
            "customers": [
                {
                    "customer_id": "SAA-2209D",
                    "name": "Northstar Analytics",
                    "domain": "SaaS",
                    "recent_usage": "Usage up 20% in past quarter",
                    "complaints": [],
                    "billing_issues": [],
                    "sentiment": "Positive",
                    "support_history": ["1 resolved ticket"],
                    "plan": "Growth",
                    "tenure_months": 9,
                }
            ]
        },
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    results = client.get("/api/churn/results/SAA-2209D")
    assert results.status_code == 200
