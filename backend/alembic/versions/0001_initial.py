"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-15 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("domain", sa.String(length=32), nullable=False),
        sa.Column("plan", sa.String(length=255), nullable=True),
        sa.Column("tenure_months", sa.Integer(), nullable=True),
        sa.Column("recent_usage", sa.Text(), nullable=True),
        sa.Column("sentiment", sa.String(length=255), nullable=True),
        sa.Column("complaints", sa.JSON(), nullable=False),
        sa.Column("billing_issues", sa.JSON(), nullable=False),
        sa.Column("support_history", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("customer_id", name="uq_customers_customer_id"),
    )
    op.create_index(op.f("ix_customers_customer_id"), "customers", ["customer_id"], unique=False)
    op.create_index(op.f("ix_customers_domain"), "customers", ["domain"], unique=False)
    op.create_index(op.f("ix_customers_id"), "customers", ["id"], unique=False)

    op.create_table(
        "churn_analyses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.String(length=64), nullable=False),
        sa.Column("churn_score", sa.Float(), nullable=False),
        sa.Column("reasoning", sa.JSON(), nullable=False),
        sa.Column("root_cause", sa.Text(), nullable=False),
        sa.Column("recommended_intervention", sa.Text(), nullable=False),
        sa.Column("follow_up_task", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_churn_analyses_customer_id"),
        "churn_analyses",
        ["customer_id"],
        unique=False,
    )
    op.create_index(op.f("ix_churn_analyses_id"), "churn_analyses", ["id"], unique=False)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.String(length=64), nullable=False),
        sa.Column("customer_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(length=32), nullable=False),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("assigned_to", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", name="uq_tasks_task_id"),
    )
    op.create_index(op.f("ix_tasks_customer_id"), "tasks", ["customer_id"], unique=False)
    op.create_index(op.f("ix_tasks_id"), "tasks", ["id"], unique=False)
    op.create_index(op.f("ix_tasks_task_id"), "tasks", ["task_id"], unique=False)

    op.create_table(
        "campaign_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.String(length=64), nullable=False),
        sa.Column("campaign_type", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_campaign_events_customer_id"),
        "campaign_events",
        ["customer_id"],
        unique=False,
    )
    op.create_index(op.f("ix_campaign_events_id"), "campaign_events", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_campaign_events_id"), table_name="campaign_events")
    op.drop_index(op.f("ix_campaign_events_customer_id"), table_name="campaign_events")
    op.drop_table("campaign_events")
    op.drop_index(op.f("ix_tasks_task_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_customer_id"), table_name="tasks")
    op.drop_table("tasks")
    op.drop_index(op.f("ix_churn_analyses_id"), table_name="churn_analyses")
    op.drop_index(op.f("ix_churn_analyses_customer_id"), table_name="churn_analyses")
    op.drop_table("churn_analyses")
    op.drop_index(op.f("ix_customers_id"), table_name="customers")
    op.drop_index(op.f("ix_customers_domain"), table_name="customers")
    op.drop_index(op.f("ix_customers_customer_id"), table_name="customers")
    op.drop_table("customers")
