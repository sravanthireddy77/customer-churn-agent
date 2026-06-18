def test_task_creation_and_status_update(client):
    create_response = client.post(
        "/api/tasks",
        json={
            "customer_id": "TEL-7824A",
            "title": "Retention callback",
            "description": "Call customer to resolve billing and network issues.",
            "priority": "urgent",
            "status": "open",
            "assigned_to": "Retention Team",
        },
    )

    assert create_response.status_code == 201
    task = create_response.json()
    assert task["task_id"].startswith("TASK-")
    assert task["status"] == "open"

    update_response = client.put(f"/api/tasks/{task['task_id']}", json={"status": "completed"})
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "completed"
