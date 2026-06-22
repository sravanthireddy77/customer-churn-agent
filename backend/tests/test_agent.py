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
    assert data["domain_risk_summary"][0]["domain"] == "Telecom"
    assert data["domain_risk_summary"][0]["at_risk_customers"][0]["customer_id"] == "TEL-7824A"
    assert data["summary"].startswith("Analyzed 1 customers")


def test_agent_run_identifies_at_risk_users_by_domain(client):
    customers = [
        {
            "customer_id": "TEL-9001A",
            "name": "Casey Morgan",
            "domain": "Telecom",
            "recent_usage": "down 55% in past 2 months",
            "complaints": ["Slow network", "Dropped calls"],
            "billing_issues": ["Unexpected roaming charge"],
            "sentiment": "Negative",
            "support_history": ["4 calls in 6 weeks"],
            "plan": "Unlimited 5G",
            "tenure_months": 30,
        },
        {
            "customer_id": "BNK-9002B",
            "name": "Riley Patel",
            "domain": "Banking",
            "recent_usage": "down 35% in past quarter",
            "complaints": ["Mobile app failures", "Maintenance fee concerns"],
            "billing_issues": ["Overdraft fee dispute"],
            "sentiment": "Negative",
            "support_history": ["Repeated branch complaint"],
            "plan": "Premium Checking",
            "tenure_months": 42,
        },
        {
            "customer_id": "SAA-9003C",
            "name": "Brightline Ops",
            "domain": "SaaS",
            "recent_usage": "Usage up 20% in past quarter",
            "complaints": [],
            "billing_issues": [],
            "sentiment": "Positive",
            "support_history": ["1 resolved ticket"],
            "plan": "Growth",
            "tenure_months": 8,
        },
    ]
    for customer in customers:
        client.post("/api/customers", json=customer)

    response = client.post(
        "/api/agent/run",
        json={
            "goal": "Identify at-risk users across every domain for retention owners.",
            "max_customers": 10,
            "create_tasks": False,
            "trigger_campaigns": False,
        },
    )

    assert response.status_code == 200
    data = response.json()
    domain_summary = {summary["domain"]: summary for summary in data["domain_risk_summary"]}

    assert set(domain_summary) == {"Telecom", "Banking", "SaaS"}
    assert domain_summary["Telecom"]["at_risk_customers"][0]["customer_id"] == "TEL-9001A"
    assert domain_summary["Banking"]["at_risk_customers"][0]["customer_id"] == "BNK-9002B"
    assert domain_summary["SaaS"]["at_risk_customers"] == []
    assert domain_summary["SaaS"]["top_risk_customer"] is None
