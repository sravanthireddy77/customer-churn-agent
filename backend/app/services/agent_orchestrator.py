from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.repositories.campaign_events import CampaignEventRepository
from app.repositories.churn_analyses import ChurnAnalysisRepository
from app.repositories.customers import CustomerRepository
from app.repositories.tasks import TaskRepository
from app.schemas.agent import (
    AgentAction,
    AgentCustomerOutcome,
    AgentRunRequest,
    AgentRunResponse,
    DomainRiskCustomer,
    DomainRiskSummary,
    RiskLevel,
)
from app.schemas.campaign import CampaignEventRead, CampaignTriggerRequest
from app.schemas.churn import CustomerSignalInput
from app.schemas.customer import Domain
from app.schemas.task import TaskRead
from app.services.campaigns import enqueue_campaign_event
from app.services.churn_agent import ChurnRescueAgent
from app.services.tasks import new_task_id, task_from_analysis


class ChurnRescueOrchestrator:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.customers = CustomerRepository(db)
        self.analyses = ChurnAnalysisRepository(db)
        self.tasks = TaskRepository(db)
        self.campaigns = CampaignEventRepository(db)
        self.agent = ChurnRescueAgent()

    async def run(self, request: AgentRunRequest) -> AgentRunResponse:
        selected_customers = self._select_customers(request)
        reasoning_trace = [
            f"Received goal: {request.goal}",
            self._selection_reasoning(request, selected_customers),
            "Inspecting usage, complaints, billing, sentiment, support history, plan, tenure, and metadata for each selected customer.",
            "Running churn analysis before choosing root causes, recommendations, tasks, or outreach actions.",
        ]
        outcomes: list[AgentCustomerOutcome] = []
        actions: list[AgentAction] = []
        created_tasks: list[TaskRead] = []
        campaign_events: list[CampaignEventRead] = []

        for customer in selected_customers:
            signal_input = self._to_signal_input(customer)
            analysis = await self.agent.analyze(signal_input)
            self.analyses.create(analysis)
            risk_level = _risk_level(analysis.churn_score)
            actionable = request.include_low_risk or analysis.churn_score > 0.50

            actions.append(
                AgentAction(
                    action_type="analyze_customer",
                    customer_id=customer.customer_id,
                    status="completed",
                    detail=f"Generated {risk_level} churn score {analysis.churn_score:.2f}.",
                )
            )

            action_summary = "Monitor customer; no immediate intervention required."
            if actionable and request.create_tasks and analysis.follow_up_task:
                task = self.tasks.create(
                    task_from_analysis(analysis, assigned_to=request.assigned_to),
                    task_id=new_task_id(),
                )
                created_tasks.append(TaskRead.model_validate(task))
                actions.append(
                    AgentAction(
                        action_type="create_task",
                        customer_id=customer.customer_id,
                        status="completed",
                        detail=f"Created follow-up task {task.task_id}.",
                    )
                )
                action_summary = f"Created follow-up task {task.task_id}."
            elif actionable and request.create_tasks:
                actions.append(
                    AgentAction(
                        action_type="create_task",
                        customer_id=customer.customer_id,
                        status="skipped",
                        detail="No follow-up task was generated for this analysis.",
                    )
                )

            if actionable and request.trigger_campaigns:
                campaign_payload = CampaignTriggerRequest(
                    customer_id=customer.customer_id,
                    campaign_type=request.campaign_type,
                    payload={
                        "goal": request.goal,
                        "risk_level": risk_level,
                        "churn_score": analysis.churn_score,
                        "root_cause": analysis.root_cause,
                        "recommended_intervention": analysis.recommended_intervention,
                    },
                )
                event = self.campaigns.create(campaign_payload, status="simulated")
                if enqueue_campaign_event(event.id, campaign_payload):
                    event.status = "queued"
                    self.db.commit()
                    self.db.refresh(event)
                campaign_events.append(CampaignEventRead.model_validate(event))
                actions.append(
                    AgentAction(
                        action_type="trigger_campaign",
                        customer_id=customer.customer_id,
                        status=event.status if event.status in {"queued", "simulated"} else "simulated",
                        detail=f"Prepared {request.campaign_type.replace('_', ' ')} event.",
                    )
                )
                if action_summary.startswith("Monitor"):
                    action_summary = f"Prepared {request.campaign_type.replace('_', ' ')} outreach."

            if not actionable:
                actions.append(
                    AgentAction(
                        action_type="monitor",
                        customer_id=customer.customer_id,
                        status="completed",
                        detail="Risk is below action threshold; continue monitoring.",
                    )
                )

            outcomes.append(
                AgentCustomerOutcome(
                    customer_id=customer.customer_id,
                    name=customer.name,
                    domain=customer.domain,  # type: ignore[arg-type]
                    risk_level=risk_level,
                    analysis=analysis,
                    action_summary=action_summary,
                )
            )

        outcomes.sort(key=lambda outcome: outcome.analysis.churn_score, reverse=True)
        reasoning_trace.append(self._ranking_reasoning(outcomes))
        domain_risk_summary = self._domain_risk_summary(outcomes)
        reasoning_trace.append(self._domain_risk_reasoning(domain_risk_summary))
        return AgentRunResponse(
            status="completed",
            goal=request.goal,
            reasoning_trace=reasoning_trace,
            customer_outcomes=outcomes,
            domain_risk_summary=domain_risk_summary,
            actions=actions,
            created_tasks=created_tasks,
            campaign_events=campaign_events,
            summary=self._summary(outcomes, domain_risk_summary, created_tasks, campaign_events),
            next_steps=self._next_steps(outcomes, domain_risk_summary, request),
        )

    def _select_customers(self, request: AgentRunRequest) -> list[Customer]:
        all_customers = self.customers.list(domain=request.domain)
        if request.customer_ids:
            requested_ids = set(request.customer_ids)
            all_customers = [customer for customer in all_customers if customer.customer_id in requested_ids]
        return all_customers[: request.max_customers]

    def _selection_reasoning(
        self, request: AgentRunRequest, selected_customers: list[Customer]
    ) -> str:
        scope = "all domains"
        if request.domain:
            scope = f"{request.domain} customers"
        if request.customer_ids:
            scope = f"{len(request.customer_ids)} explicitly selected customers"
        return f"Selected {len(selected_customers)} customer records from {scope} for this run."

    def _ranking_reasoning(self, outcomes: list[AgentCustomerOutcome]) -> str:
        if not outcomes:
            return "No customer records were available, so no risk ranking could be produced."
        top = outcomes[0]
        return (
            f"Ranked customers by churn score after analysis; {top.name} has the highest current risk "
            f"at {top.analysis.churn_score:.2f} due to {top.analysis.root_cause.lower()}."
        )

    def _domain_risk_summary(self, outcomes: list[AgentCustomerOutcome]) -> list[DomainRiskSummary]:
        domain_order: dict[str, int] = {"Telecom": 0, "Banking": 1, "SaaS": 2}
        summaries: list[DomainRiskSummary] = []
        domains = sorted({outcome.domain for outcome in outcomes}, key=lambda domain: domain_order[domain])

        for domain in domains:
            domain_outcomes = [outcome for outcome in outcomes if outcome.domain == domain]
            at_risk_outcomes = [
                outcome for outcome in domain_outcomes if outcome.risk_level in {"high", "critical"}
            ]
            at_risk_customers = [
                DomainRiskCustomer(
                    customer_id=outcome.customer_id,
                    name=outcome.name,
                    risk_level=outcome.risk_level,
                    churn_score=outcome.analysis.churn_score,
                    root_cause=outcome.analysis.root_cause,
                    recommended_intervention=outcome.analysis.recommended_intervention,
                )
                for outcome in at_risk_outcomes
            ]
            average_score = round(
                sum(outcome.analysis.churn_score for outcome in domain_outcomes) / len(domain_outcomes),
                2,
            )

            summaries.append(
                DomainRiskSummary(
                    domain=domain,  # type: ignore[arg-type]
                    customers_analyzed=len(domain_outcomes),
                    at_risk_count=len(at_risk_customers),
                    critical_count=sum(
                        1 for outcome in domain_outcomes if outcome.risk_level == "critical"
                    ),
                    high_count=sum(1 for outcome in domain_outcomes if outcome.risk_level == "high"),
                    average_churn_score=average_score,
                    top_risk_customer=at_risk_customers[0] if at_risk_customers else None,
                    at_risk_customers=at_risk_customers,
                )
            )

        return summaries

    def _domain_risk_reasoning(self, summaries: list[DomainRiskSummary]) -> str:
        if not summaries:
            return "No domain-level at-risk user summary could be produced."
        at_risk_domains = [summary for summary in summaries if summary.at_risk_count]
        if not at_risk_domains:
            return "Grouped analyzed users by domain; no high or critical at-risk users were identified."
        highest_domain = max(at_risk_domains, key=lambda summary: summary.at_risk_count)
        return (
            "Grouped analyzed users by domain using high and critical churn scores as the at-risk threshold; "
            f"{highest_domain.domain} currently has the most at-risk users "
            f"({highest_domain.at_risk_count})."
        )

    def _summary(
        self,
        outcomes: list[AgentCustomerOutcome],
        domain_risk_summary: list[DomainRiskSummary],
        created_tasks: list[TaskRead],
        campaign_events: list[CampaignEventRead],
    ) -> str:
        critical = sum(1 for outcome in outcomes if outcome.risk_level == "critical")
        high = sum(1 for outcome in outcomes if outcome.risk_level == "high")
        domains_with_risk = sum(1 for summary in domain_risk_summary if summary.at_risk_count)
        return (
            f"Analyzed {len(outcomes)} customers. Found {critical} critical and {high} high-risk customers. "
            f"At-risk users appear in {domains_with_risk} domains. "
            f"Created {len(created_tasks)} follow-up tasks and prepared {len(campaign_events)} outreach events."
        )

    def _next_steps(
        self,
        outcomes: list[AgentCustomerOutcome],
        domain_risk_summary: list[DomainRiskSummary],
        request: AgentRunRequest,
    ) -> list[str]:
        if not outcomes:
            return ["Add or import customer records, then run the agent again."]
        steps = [
            "Review the reasoning for each high-risk customer before outreach.",
            "Prioritize critical-risk customers for same-day retention follow-up.",
        ]
        if any(summary.at_risk_count for summary in domain_risk_summary):
            steps.append("Use the domain risk summary to coordinate owners for each at-risk customer group.")
        if not request.create_tasks:
            steps.append("Enable task creation on the next run to convert recommendations into work items.")
        if not request.trigger_campaigns:
            steps.append("Enable outreach simulation to prepare retention emails or CRM events.")
        return steps

    def _to_signal_input(self, customer: Customer) -> CustomerSignalInput:
        return CustomerSignalInput(
            customer_id=customer.customer_id,
            name=customer.name,
            domain=customer.domain,  # type: ignore[arg-type]
            recent_usage=customer.recent_usage,
            complaints=customer.complaints or [],
            billing_issues=customer.billing_issues or [],
            sentiment=customer.sentiment,
            support_history=customer.support_history or [],
            plan=customer.plan,
            tenure_months=customer.tenure_months,
            metadata=customer.metadata_json or {},
        )


def _risk_level(score: float) -> RiskLevel:
    if score <= 0.25:
        return "low"
    if score <= 0.50:
        return "moderate"
    if score <= 0.75:
        return "high"
    return "critical"
