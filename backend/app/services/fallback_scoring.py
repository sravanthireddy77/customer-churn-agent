import re
from dataclasses import dataclass

from app.schemas.churn import ChurnAnalysisResponse, CustomerSignalInput


@dataclass(frozen=True)
class SignalFlags:
    usage_decline: int | None
    negative_sentiment: bool
    mixed_sentiment: bool
    has_complaints: bool
    repeated_complaints: bool
    has_billing: bool
    repeated_support: bool
    competitor_mention: bool
    downgrade_signal: bool
    high_value_or_tenured: bool


def run_fallback_analysis(customer: CustomerSignalInput) -> ChurnAnalysisResponse:
    flags = _extract_flags(customer)
    score = 0.10
    reasoning: list[str] = []

    if flags.usage_decline and flags.usage_decline > 40:
        score += 0.25
        reasoning.append(
            f"Usage has dropped {flags.usage_decline}% recently, showing a sharp decline in engagement."
        )
    elif flags.usage_decline and 20 <= flags.usage_decline <= 40:
        score += 0.15
        reasoning.append(
            f"Usage has dropped {flags.usage_decline}% recently, indicating reduced engagement."
        )
    elif customer.recent_usage:
        reasoning.append(f"Recent usage signal was reviewed: {customer.recent_usage}.")

    if flags.negative_sentiment:
        score += 0.15
        reasoning.append("Customer sentiment is negative, which increases churn risk.")
    elif flags.mixed_sentiment:
        score += 0.10
        reasoning.append("Customer sentiment is neutral to negative, suggesting emerging dissatisfaction.")

    if flags.has_complaints:
        score += 0.15
        reasoning.append(f"Customer complaints were reported: {_join_items(customer.complaints)}.")
    if flags.repeated_complaints:
        score += 0.10
        reasoning.append("Multiple complaints indicate recurring friction rather than a single issue.")
    if flags.has_billing:
        score += 0.15
        reasoning.append(f"Billing issues were found: {_join_items(customer.billing_issues)}.")
    if flags.repeated_support:
        score += 0.15
        reasoning.append(
            f"Support history suggests repeated or unresolved interactions: {_join_items(customer.support_history)}."
        )
    if flags.competitor_mention:
        score += 0.10
        reasoning.append("A competitor mention indicates active evaluation of alternatives.")
    if flags.downgrade_signal:
        score += 0.10
        reasoning.append("Downgrade or cancellation signals point to near-term retention risk.")

    if not reasoning:
        reasoning.append("No strong churn signals were found in usage, complaints, billing, or support history.")
    if customer.tenure_months and customer.tenure_months >= 24:
        reasoning.append(
            f"The customer has {customer.tenure_months} months of tenure, so proactive retention outreach may protect relationship value."
        )

    score = round(min(score, 1.0), 2)
    root_cause = _root_cause(customer, flags, score)
    recommendation = _recommendation(customer, flags, root_cause, score)
    follow_up_task = _follow_up_task(customer, score, root_cause)

    return ChurnAnalysisResponse(
        customer_id=customer.customer_id,
        churn_score=score,
        reasoning=reasoning,
        root_cause=root_cause,
        recommended_intervention=recommendation,
        follow_up_task=follow_up_task,
    )


def _extract_flags(customer: CustomerSignalInput) -> SignalFlags:
    combined = " ".join(
        [
            customer.recent_usage or "",
            customer.sentiment or "",
            " ".join(customer.complaints),
            " ".join(customer.billing_issues),
            " ".join(customer.support_history),
            str(customer.metadata),
        ]
    ).lower()
    usage_decline = _usage_decline_percent(customer.recent_usage or "")
    negative_sentiment = "negative" in (customer.sentiment or "").lower() or "frustrated" in (
        customer.sentiment or ""
    ).lower()
    mixed_sentiment = any(
        phrase in (customer.sentiment or "").lower()
        for phrase in ["neutral to negative", "neutral", "mixed", "concerned"]
    )
    repeated_support = len(customer.support_history) >= 2 or any(
        word in combined for word in ["unresolved", "repeated", "calls", "tickets", "branch complaint"]
    )
    return SignalFlags(
        usage_decline=usage_decline,
        negative_sentiment=negative_sentiment,
        mixed_sentiment=mixed_sentiment and not negative_sentiment,
        has_complaints=bool(customer.complaints),
        repeated_complaints=len(customer.complaints) >= 2,
        has_billing=bool(customer.billing_issues),
        repeated_support=repeated_support,
        competitor_mention="competitor" in combined or "switching to" in combined,
        downgrade_signal=any(word in combined for word in ["downgrade", "cancel", "cancellation"]),
        high_value_or_tenured=(customer.tenure_months or 0) >= 24
        or (customer.plan or "").lower() in {"enterprise", "premium checking", "unlimited 5g"},
    )


def _usage_decline_percent(text: str) -> int | None:
    lowered = text.lower()
    if not any(word in lowered for word in ["down", "declin", "drop", "reduced", "decrease"]):
        return None
    match = re.search(r"(\d{1,3})\s*%", lowered)
    if not match:
        return None
    return min(int(match.group(1)), 100)


def _root_cause(customer: CustomerSignalInput, flags: SignalFlags, score: float) -> str:
    complaints = " ".join(customer.complaints).lower()
    billing = " ".join(customer.billing_issues).lower()
    domain = customer.domain

    if domain == "Telecom":
        if flags.has_billing and any(word in complaints for word in ["slow", "dropped", "network", "speed"]):
            return "Service reliability and billing dissatisfaction"
        if any(word in complaints for word in ["slow", "dropped", "network", "speed"]):
            return "Service performance dissatisfaction"
        if flags.has_billing:
            return "Billing dispute or account charge dissatisfaction"
    if domain == "Banking":
        if any(word in complaints + billing for word in ["fee", "overdraft", "maintenance"]):
            return "Fee and account-cost dissatisfaction"
        if "app" in complaints:
            return "Digital banking experience frustration"
    if domain == "SaaS":
        if any(word in complaints for word in ["missing", "feature", "roadmap"]):
            return "Product feature-fit and adoption risk"
        if flags.repeated_support:
            return "Support responsiveness frustration"
        if flags.usage_decline:
            return "Declining product adoption"
    if flags.usage_decline:
        return "Declining engagement"
    if score <= 0.25:
        return "No material churn risk detected"
    return "Multiple unresolved customer experience issues"


def _recommendation(
    customer: CustomerSignalInput, flags: SignalFlags, root_cause: str, score: float
) -> str:
    white_glove = " Include white-glove support because this is a high-value or long-tenured customer." if flags.high_value_or_tenured else ""
    if customer.domain == "Telecom":
        if flags.has_billing and "Service" in root_cause:
            return (
                "Offer a 2-month 30% bill credit, correct the billing issue, and schedule priority network diagnostics. "
                "Send an empathetic apology and confirm proactive troubleshooting." + white_glove
            )
        if flags.has_billing:
            return (
                "Apologize for the billing issue, correct the charge, and offer a targeted credit or refund after account review."
                + white_glove
            )
        if "Service performance" in root_cause:
            return (
                "Schedule priority technical support, run device and network diagnostics, and offer a temporary service credit."
                + white_glove
            )
        return "Recommend plan optimization, service education, and a discounted bundle to rebuild engagement." + white_glove
    if customer.domain == "Banking":
        if "Fee" in root_cause:
            return (
                "Offer a fee review with a relationship manager, waive eligible fees, and recommend a better-fit account tier."
                + white_glove
            )
        if "Digital" in root_cause:
            return "Schedule a digital support session and escalate app issues to a specialist with a clear resolution timeline." + white_glove
        return "Offer a financial wellness consultation and product education tailored to recent account behavior." + white_glove
    if customer.domain == "SaaS":
        if "feature" in root_cause.lower():
            return (
                "Schedule a roadmap call, propose a workaround, and offer beta access if available. Pair this with customer success outreach."
                + white_glove
            )
        if "support" in root_cause.lower():
            return "Escalate to senior support with an SLA-backed response and have the success manager own the recovery plan." + white_glove
        if flags.usage_decline:
            return "Run an onboarding refresh, schedule team training, and assign a success manager to restore adoption." + white_glove
        return "Offer enablement resources and a success check-in to keep adoption healthy." + white_glove
    if score <= 0.25:
        return "Continue standard engagement and monitor for new churn signals."
    return "Create a personalized retention outreach plan based on the highest-risk signals."


def _follow_up_task(customer: CustomerSignalInput, score: float, root_cause: str) -> str | None:
    if score <= 0.50:
        return None
    if score >= 0.76:
        return f"Create priority callback for {customer.customer_id} within 2 business days to address {root_cause.lower()}."
    return f"Schedule retention follow-up for {customer.customer_id} this week to address {root_cause.lower()}."


def _join_items(items: list[str]) -> str:
    return ", ".join(items) if items else "none"
