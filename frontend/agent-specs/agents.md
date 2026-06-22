# Frontend Agent Specification

## Product

Customer Churn Rescue is a frontend for retention teams working across Telecom, Banking, and SaaS customers. The UI helps users identify churn risk, inspect reasoning, create follow-up work, and simulate outreach from one operational workspace.

## Primary Users

- Customer success managers who need to triage at-risk accounts quickly.
- Account managers who need a concise rescue plan for individual customers.
- Retention leads who need domain-level summaries and follow-up task visibility.

## Core User Goals

- Run a churn rescue agent against all customers or a selected customer scope.
- Review reasoning before root cause and recommendations.
- Inspect customer records, churn scores, and domain risk summaries.
- Analyze one customer or a CSV batch.
- Create and update follow-up tasks.
- Simulate outreach campaign events without leaving the app.

## Main Screens

### Agent Page

The default page. It includes:

- Agent goal text area.
- Domain scope selector.
- Max customer limit.
- Outreach simulation selector.
- Toggles for creating tasks, triggering outreach, and including low-risk customers.
- Customer scope checklist.
- Agent run result with reasoning trace, domain summaries, customer rescue plans, and action ledger.

The customer scope checklist should use a custom checkbox presentation. Unchecked boxes should remain white with a subtle outline; checked boxes should use the cyan accent color.

### Dashboard

Shows retention health at a glance:

- Total customers.
- High-risk customer count.
- Average churn score.
- Open follow-up task count.
- Churn distribution chart.
- Root-cause breakdown chart.
- Recent high-risk customers table.

### Customers

Shows a searchable customer table with:

- Customer ID, name, domain, plan, usage, sentiment, signal counts, churn score, root cause, recommended action, and status.
- Filters for search, domain, and risk level.
- Links to customer detail pages.

### Customer Detail

Shows a single customer profile, latest churn analysis, and follow-up tasks. Users can:

- Run or refresh churn analysis.
- Create a follow-up task from the latest recommendation.
- Trigger a simulated retention email campaign.

### Analyze Customer

Manual form for one customer signal payload. It returns churn score, reasoning, root cause, recommendation, and JSON output.

### Batch Analysis

Allows CSV upload or sample records, then runs churn analysis across multiple customers.

### Tasks

Displays the retention work queue and allows task status updates.

## Data Contract

The frontend talks to the backend through `src/api/hooks.ts`, using the Axios client in `src/api/client.ts`.

Default API base URL:

```text
http://localhost:8000/api
```

Key frontend data types live in `src/types.ts`:

- `Customer`
- `CustomerSignalInput`
- `ChurnAnalysis`
- `ChurnAnalysisRecord`
- `Task`
- `CampaignEvent`
- `AgentRunRequest`
- `AgentRunResponse`

## Design Expectations

- Keep the app operational and dense enough for repeated use.
- Avoid marketing-page layouts and oversized decorative sections.
- Use Tailwind utilities and the existing component classes in `src/index.css` and `src/styles/`.
- Use `lucide-react` icons for actions and status cues.
- Keep cards reserved for panels, repeated records, and result sections.
- Keep text readable in both light and dark modes.
- Avoid native checkbox styling for compact scope lists when it creates dark unchecked boxes.

## Success Criteria

- The default Agent page loads without console errors.
- Customer data loads from the backend at `localhost:8000`.
- Running the rescue agent returns visible reasoning and recommendations.
- Customer scope selection is clear and visually stable.
- The frontend passes `npm run build`.
