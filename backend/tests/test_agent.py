def test_agent_run_analyzes_and_creates_actions(client):
    client.post(
        "/api/customers",
        json={
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
        },
    )

    response = client.post(
        "/api/agent/run",
        json={
            "goal": "Rescue critical churn accounts and create work for the retention team.",
            "customer_ids": ["TEL-7824A"],
            "create_tasks": True,
            "trigger_campaigns": False,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["reasoning_trace"]
    assert data["customer_outcomes"][0]["analysis"]["reasoning"]
    assert data["created_tasks"]
    assert data["summary"].startswith("Analyzed 1 customers")
