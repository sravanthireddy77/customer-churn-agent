import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ClipboardPlus,
  Eye,
  FileCheck2,
  MailPlus,
  MessageSquareText,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Search,
  SearchCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  TimerReset,
  Users,
  Wand2,
  Zap,
} from "lucide-react";

import { useAnalyses, useCustomers, useRunAgent } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { RiskBadge } from "../components/RiskBadge";
import { useToast } from "../components/ToastProvider";
import { AgentRunResponse, ChurnAnalysisRecord, Customer, Domain } from "../types";
import {
  customerHealthScore,
  getEarlyWarnings,
  getRootCauseFactors,
  overallSentiment,
} from "../utils/featureInsights";
import { formatPercent, riskBar, riskLevel } from "../utils/risk";

const defaultGoal =
  "Find customers most likely to churn, explain the signals, recommend rescue actions, and prepare follow-up work for the retention team.";

const campaignTypes = [
  { value: "retention_email", label: "Retention email" },
  { value: "crm_task", label: "CRM task" },
  { value: "notify_account_manager", label: "Notify manager" },
  { value: "schedule_callback", label: "Schedule callback" },
  { value: "win_back_campaign", label: "Win-back campaign" },
];

const workflowSteps = [
  { id: 1, label: "Segment" },
  { id: 2, label: "Trigger" },
  { id: 3, label: "Offer" },
  { id: 4, label: "Message" },
  { id: 5, label: "Approval" },
];

const workflowSectionIds: Record<number, string> = {
  1: "workflow-segment",
  2: "workflow-trigger",
  3: "workflow-offer",
  4: "workflow-message",
  5: "workflow-approval",
};

const searchStopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "customer",
  "customers",
  "find",
  "for",
  "give",
  "me",
  "of",
  "risk",
  "show",
  "the",
  "with",
]);

type SpeechRecognitionResultLike = {
  0?: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type AnalysisSearchResult = {
  customer: Customer;
  analysis?: ChurnAnalysisRecord;
  healthScore: number | null;
  matchLabels: string[];
  matchScore: number;
};

type SearchScope = "risk" | "rootCause" | "sentiment" | "warnings";

const searchScopes: Array<{
  id: SearchScope;
  label: string;
}> = [
  { id: "risk", label: "Risk categories" },
  { id: "rootCause", label: "Root-cause analysis" },
  { id: "sentiment", label: "Sentiment signals" },
  { id: "warnings", label: "Early warnings" },
];

function actionTone(status: string) {
  if (status === "completed" || status === "queued")
    return "text-emerald-700 bg-emerald-50 ring-emerald-200 dark:text-emerald-200 dark:bg-emerald-900 dark:ring-emerald-700";
  if (status === "simulated")
    return "text-cyan-700 bg-cyan-50 ring-cyan-200 dark:text-cyan-200 dark:bg-cyan-900 dark:ring-cyan-700";
  return "text-slate-600 bg-slate-50 ring-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:ring-slate-600";
}

function isCanceledRequest(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string; message?: string };
  return (
    candidate.code === "ERR_CANCELED" ||
    candidate.name === "CanceledError" ||
    candidate.message === "canceled"
  );
}

function StopRunIcon() {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute h-5 w-5 animate-ping rounded-full bg-white/35" />
      <Square className="relative h-3.5 w-3.5 fill-current" />
    </span>
  );
}

function campaignLabel(value: string) {
  return campaignTypes.find((type) => type.value === value)?.label ?? value;
}

function latestByCustomer(analyses: ChurnAnalysisRecord[]) {
  return analyses.reduce<Record<string, ChurnAnalysisRecord>>((acc, analysis) => {
    const existing = acc[analysis.customer_id];
    if (!existing || new Date(analysis.created_at) > new Date(existing.created_at)) {
      acc[analysis.customer_id] = analysis;
    }
    return acc;
  }, {});
}

function queryTerms(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9$%.-]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !searchStopWords.has(term));
}

function domainsFromQuery(query: string): Domain[] {
  const domains: Domain[] = [];
  if (/\b(bank|banks|banking|financial|finance)\b/.test(query)) domains.push("Banking");
  if (/\b(telecom|telco|mobile|wireless)\b/.test(query)) domains.push("Telecom");
  if (/\b(saas|software|subscription)\b/.test(query)) domains.push("SaaS");
  return domains;
}

function removeDomainTerms(terms: string[]) {
  const domainTerms = new Set([
    "bank",
    "banks",
    "banking",
    "financial",
    "finance",
    "telecom",
    "telco",
    "mobile",
    "wireless",
    "saas",
    "software",
    "subscription",
  ]);
  return terms.filter((term) => !domainTerms.has(term));
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function buildAnalysisSearchResults(
  query: string,
  customers: Customer[],
  analyses: Record<string, ChurnAnalysisRecord>,
  activeScopes: SearchScope[],
): AnalysisSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  const terms = queryTerms(normalizedQuery);
  if ((!normalizedQuery || terms.length === 0) && activeScopes.length === 0) return [];
  const domainFilters = domainsFromQuery(normalizedQuery);
  const searchTerms = domainFilters.length ? removeDomainTerms(terms) : terms;
  const searchableCustomers = domainFilters.length
    ? customers.filter((customer) => domainFilters.includes(customer.domain))
    : customers;
  const scopes = activeScopes.length
    ? activeScopes
    : (["risk", "rootCause", "sentiment", "warnings"] satisfies SearchScope[]);

  return searchableCustomers
    .map((customer) => {
      const analysis = analyses[customer.customer_id];
      const warnings = getEarlyWarnings(customer, analysis);
      const rootCauseFactors = getRootCauseFactors(customer, analysis).filter((factor) => factor.active);
      const sentiment = overallSentiment(customer);
      const risk = riskLevel(analysis?.churn_score);
      const healthScore = customerHealthScore(analysis?.churn_score);
      const baseText = [
        customer.customer_id,
        customer.name,
        customer.domain,
        customer.plan ?? "",
        customer.recent_usage ?? "",
      ].join(" ");
      const riskText = [
        `${risk} risk`,
        formatPercent(analysis?.churn_score),
        healthScore !== null ? `${healthScore} health score` : "",
      ].join(" ");
      const rootCauseText = [
        sentiment,
        analysis?.root_cause ?? "",
        analysis?.recommended_intervention ?? "",
        ...(analysis?.reasoning ?? []),
        ...rootCauseFactors.flatMap((factor) => [factor.label, factor.evidence]),
      ].join(" ");
      const sentimentText = [
        sentiment,
        customer.sentiment ?? "",
        customer.complaints.join(" "),
        customer.support_history.join(" "),
      ].join(" ");
      const warningText = [
        ...warnings.flatMap((warning) => [warning.title, warning.detail, warning.severity]),
      ].join(" ");
      const scopedText: Record<SearchScope, string> = {
        risk: riskText,
        rootCause: rootCauseText,
        sentiment: sentimentText,
        warnings: warningText,
      };
      const searchable = [
        baseText,
        ...scopes.map((scope) => scopedText[scope]),
      ]
        .join(" ")
        .toLowerCase();

      let matchScore =
        searchTerms.length > 0
          ? searchTerms.reduce((score, term) => score + (searchable.includes(term) ? 1 : 0), 0)
          : 0;
      const matchLabels: string[] = [];

      if (includesAny(customer.domain.toLowerCase(), terms)) {
        if (searchTerms.length === 0) {
          matchScore += 2;
        }
        matchLabels.push(customer.domain);
      }

      if (scopes.includes("risk") && searchTerms.includes("critical") && risk === "Critical") {
        matchScore += 4;
        matchLabels.push("Critical Risk");
      } else if (scopes.includes("risk") && searchTerms.includes("high") && risk === "High") {
        matchScore += 4;
        matchLabels.push("High Risk");
      } else if (scopes.includes("risk") && searchTerms.includes("medium") && risk === "Medium") {
        matchScore += 3;
        matchLabels.push("Medium Risk");
      } else if (scopes.includes("risk") && searchTerms.includes("low") && risk === "Low") {
        matchScore += 3;
        matchLabels.push("Low Risk");
      } else if (scopes.includes("risk") && includesAny(`${risk} risk`.toLowerCase(), searchTerms)) {
        matchScore += 2;
        matchLabels.push(`${risk} Risk`);
      }

      if (scopes.includes("sentiment") && includesAny(sentiment.toLowerCase(), searchTerms)) {
        matchScore += 2;
        matchLabels.push(sentiment);
      }

      if (scopes.includes("rootCause")) {
        rootCauseFactors.forEach((factor) => {
          if (searchTerms.length === 0 || includesAny(`${factor.label} ${factor.evidence}`.toLowerCase(), searchTerms)) {
            matchScore += searchTerms.length === 0 ? 1 : 2;
            matchLabels.push(factor.label);
          }
        });
      }

      if (scopes.includes("warnings")) {
        warnings.forEach((warning) => {
          if (searchTerms.length === 0 || includesAny(`${warning.title} ${warning.detail} ${warning.severity}`.toLowerCase(), searchTerms)) {
            matchScore += warning.severity === "critical" ? 3 : 2;
            matchLabels.push(warning.title);
          }
        });
      }

      if (scopes.includes("rootCause") && analysis && includesAny(`${analysis.root_cause} ${analysis.recommended_intervention}`.toLowerCase(), searchTerms)) {
        matchScore += 2;
        matchLabels.push("Analysis match");
      }

      if (searchTerms.length === 0 && scopes.includes("risk") && analysis) {
        matchScore += analysis.churn_score > 0.75 ? 4 : analysis.churn_score > 0.5 ? 3 : 1;
        matchLabels.push(`${risk} Risk`);
      }

      if (searchTerms.length === 0 && scopes.includes("sentiment") && sentiment !== "Neutral") {
        matchScore += sentiment === "Escalation required" ? 4 : 2;
        matchLabels.push(sentiment);
      }

      return {
        customer,
        analysis,
        healthScore,
        matchLabels: Array.from(new Set(matchLabels)).slice(0, 5),
        matchScore,
      };
    })
    .filter((result) => result.matchScore > 0)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return (b.analysis?.churn_score ?? 0) - (a.analysis?.churn_score ?? 0);
    })
    .slice(0, 6);
}

function buildOfferPackage(
  domain: Domain | "all",
  campaignType: string,
  createTasks: boolean,
  triggerCampaigns: boolean,
) {
  const base =
    domain === "Banking"
      ? [
          "6-month fee review",
          "relationship manager callback",
          "priority complaint closure",
        ]
      : domain === "Telecom"
        ? [
            "network diagnostics slot",
            "temporary bill credit",
            "priority service callback",
          ]
        : domain === "SaaS"
          ? [
              "success enablement session",
              "adoption review",
              "plan optimization offer",
            ]
          : [
              "targeted retention offer",
              "success manager callback",
              "priority support review",
            ];

  if (triggerCampaigns) {
    base.push(campaignLabel(campaignType).toLowerCase());
  }

  if (createTasks) {
    base.push("follow-up task queue");
  }

  return base.slice(0, 5);
}

function buildMessageDraft(
  variant: number,
  customerName: string,
  offerPackage: string[],
) {
  const firstOffer = offerPackage[0] ?? "a targeted rescue package";
  const secondOffer = offerPackage[1] ?? "priority support";

  if (variant === 1) {
    return {
      label: "Email draft",
      subject: "We're here to help",
      body: `Hi ${customerName},\nwe noticed recent friction in your experience and want to resolve it quickly. Your rescue package includes ${firstOffer} and ${secondOffer}.\n\nReply here and the retention team will pick this up today.`,
    };
  }

  if (variant === 2) {
    return {
      label: "Manager note",
      subject: "Priority rescue callback",
      body: `${customerName} is ready for white-glove outreach. Lead with empathy, acknowledge the churn signal, and offer ${firstOffer} before asking for a callback window.`,
    };
  }

  return {
    label: "SMS draft",
    subject: "Quick support check-in",
    body: `Hi ${customerName}, we prepared ${firstOffer} for your account. Can our retention team contact you today to close this out?`,
  };
}

export function AgentPage() {
  const { showToast } = useToast();
  const customersQuery = useCustomers();
  const analysesQuery = useAnalyses();
  const runAgent = useRunAgent();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [goal, setGoal] = useState(defaultGoal);
  const [domain, setDomain] = useState<Domain | "all">("all");
  const [maxCustomers, setMaxCustomers] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createTasks, setCreateTasks] = useState(true);
  const [triggerCampaigns, setTriggerCampaigns] = useState(false);
  const [includeLowRisk, setIncludeLowRisk] = useState(false);
  const [campaignType, setCampaignType] = useState("retention_email");
  const [searchTerm, setSearchTerm] = useState("");
  const [region, setRegion] = useState("India");
  const [activeStep, setActiveStep] = useState(3);
  const [messageVariant, setMessageVariant] = useState(1);
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);
  const [previewAudience, setPreviewAudience] = useState(false);
  const [analysisSearchQuery, setAnalysisSearchQuery] = useState("");
  const [activeSearchScopes, setActiveSearchScopes] = useState<SearchScope[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<AgentRunResponse | null>(null);

  const customers = customersQuery.data ?? [];
  const analysisMap = useMemo(
    () => latestByCustomer(analysesQuery.data ?? []),
    [analysesQuery.data],
  );
  const scopedCustomers = useMemo(
    () =>
      customers.filter(
        (customer) => domain === "all" || customer.domain === domain,
      ),
    [customers, domain],
  );
  const visibleCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return scopedCustomers;

    return scopedCustomers.filter((customer) =>
      [
        customer.customer_id,
        customer.name,
        customer.domain,
        customer.plan ?? "",
        customer.sentiment ?? "",
        customer.recent_usage ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [scopedCustomers, searchTerm]);
  const selectedCustomers = customers.filter((customer) =>
    selectedIds.includes(customer.customer_id),
  );
  const previewCustomer =
    selectedCustomers[0] ??
    visibleCustomers[0] ??
    scopedCustomers[0] ??
    customers[0];
  const offerPackage = useMemo(
    () =>
      buildOfferPackage(domain, campaignType, createTasks, triggerCampaigns),
    [campaignType, createTasks, domain, triggerCampaigns],
  );
  const messageDraft = buildMessageDraft(
    messageVariant,
    previewCustomer?.name ?? "{{customer_name}}",
    offerPackage,
  );
  const audienceCount =
    selectedIds.length || Math.min(scopedCustomers.length, maxCustomers);
  const saveImpact = includeLowRisk
    ? { label: "Balanced", width: "58%" }
    : selectedIds.length > 0 || domain !== "all"
      ? { label: "High", width: "78%" }
      : { label: "Strong", width: "70%" };
  const analysisSearchResults = useMemo(
    () => buildAnalysisSearchResults(analysisSearchQuery, customers, analysisMap, activeSearchScopes),
    [activeSearchScopes, analysisMap, analysisSearchQuery, customers],
  );
  const shouldShowSearchResults = analysisSearchQuery.trim().length > 0 || activeSearchScopes.length > 0;

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const toggleCustomer = (customerId: string) => {
    setSelectedIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId],
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await runAgent.mutateAsync({
        goal,
        domain: domain === "all" ? null : domain,
        customer_ids: selectedIds.length ? selectedIds : null,
        max_customers: maxCustomers,
        create_tasks: createTasks,
        trigger_campaigns: triggerCampaigns,
        campaign_type: campaignType,
        assigned_to: "Retention Team",
        include_low_risk: includeLowRisk,
      });
      setResult(response);
      setActiveStep(5);
      showToast("Agent run completed");
    } catch (error) {
      if (isCanceledRequest(error)) {
        showToast("Rescue run stopped");
        return;
      }
      showToast("Agent run failed");
    }
  };

  const stopAgentRun = () => {
    runAgent.cancel();
  };

  const clearAgentQuery = () => {
    setGoal(defaultGoal);
    setDomain("all");
    setMaxCustomers(10);
    setSelectedIds([]);
    setCreateTasks(true);
    setTriggerCampaigns(false);
    setIncludeLowRisk(false);
    setCampaignType("retention_email");
    setSearchTerm("");
    setRegion("India");
    setActiveStep(3);
    setMessageVariant(1);
    setApprovalSubmitted(false);
    setPreviewAudience(false);
    setAnalysisSearchQuery("");
    setActiveSearchScopes([]);
    setResult(null);
    showToast("Agent query cleared");
  };

  const submitApproval = () => {
    setApprovalSubmitted(true);
    setActiveStep(5);
    showToast("Campaign approval submitted");
  };

  const generateVariant = () => {
    setMessageVariant((current) => (current === 3 ? 1 : current + 1));
    setActiveStep(4);
    showToast("Message variant generated");
  };

  const selectVisibleCustomers = () => {
    setSelectedIds(
      visibleCustomers
        .slice(0, maxCustomers)
        .map((customer) => customer.customer_id),
    );
    setActiveStep(1);
  };

  const selectSearchResult = (customerId: string) => {
    setSelectedIds((current) =>
      current.includes(customerId) ? current : [...current, customerId],
    );
    setActiveStep(1);
    showToast("Customer added to rescue scope");
  };

  const selectAllSearchResults = () => {
    if (analysisSearchResults.length === 0) return;
    setSelectedIds((current) =>
      Array.from(
        new Set([
          ...current,
          ...analysisSearchResults.map((searchResult) => searchResult.customer.customer_id),
        ]),
      ),
    );
    setActiveStep(1);
    showToast("Search results added to rescue scope");
  };

  const startVoiceSearch = () => {
    const SpeechRecognition =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("Voice search is not supported in this browser");
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      showToast("Voice search could not hear a query");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) =>
        event.results[index]?.[0]?.transcript?.trim() ?? "",
      )
        .filter(Boolean)
        .join(" ");

      if (transcript) {
        setAnalysisSearchQuery(transcript);
        showToast("Voice query captured");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceSearch = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const toggleSearchScope = (scope: SearchScope) => {
    setActiveSearchScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
  };

  const clearSearchScopes = () => {
    setActiveSearchScopes([]);
  };

  const goToWorkflowStep = (stepId: number) => {
    setActiveStep(stepId);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(workflowSectionIds[stepId]);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    });
  };

  if (customersQuery.isLoading) {
    return <LoadingState label="Loading agent workspace" />;
  }

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={submit}>
        <section className="agent-enter flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="agent-pill bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900">
              <Bot className="h-3.5 w-3.5" />
              Churn Rescue AI Agent
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-slate-50">
              Rescue Campaign Builder
            </h1>
            <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
              Create targeted retention journeys with AI-generated offers,
              tasks, outreach, and approval routing.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <label className="relative min-w-0 flex-1 xl:w-72">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                className="field field-icon rounded-full py-3"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search customer / segment"
              />
            </label>
            {runAgent.isPending ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700"
                onClick={stopAgentRun}
              >
                <StopRunIcon />
                Stop Rescue
              </button>
            ) : (
              <button
                className="btn-primary rounded-full px-5"
                disabled={goal.trim().length < 5}
              >
                <Play className="h-4 w-4" />
                Run Rescue
              </button>
            )}
          </div>
        </section>

        <section className="flex gap-3 overflow-x-auto pb-1">
          {workflowSteps.map((step) => {
            const isActive = step.id === activeStep;
            const isComplete = step.id < activeStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToWorkflowStep(step.id)}
                aria-current={isActive ? "step" : undefined}
                className={`relative inline-flex min-w-36 shrink-0 items-center justify-center overflow-hidden rounded-full px-5 py-2.5 text-sm font-black transition hover:-translate-y-0.5 ${
                  isActive
                    ? "bg-orange-500 text-white"
                    : isComplete
                      ? "bg-blue-600 text-white"
                      : "bg-slate-300 text-white dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {isActive && <span className="agent-scan-bar" />}
                <span className="relative">{step.label}</span>
              </button>
            );
          })}
        </section>

        <section className="panel agent-enter p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="agent-pill bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900">
                <SearchCheck className="h-3.5 w-3.5" />
                Risk & Analysis Search
              </div>
              <h2 className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">
                Ask for customers by risk, root cause, or sentiment
              </h2>
            </div>
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={selectAllSearchResults}
              disabled={analysisSearchResults.length === 0}
            >
              <Target className="h-4 w-4" />
              Select Matches
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                className="field field-icon py-3 pr-4"
                value={analysisSearchQuery}
                onChange={(event) => setAnalysisSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                placeholder="Try: critical banking customers with billing disputes"
              />
            </label>
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isListening
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop voice
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Voice search
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
            {searchScopes.map((scope) => {
              const isActive = activeSearchScopes.includes(scope.id);

              return (
                <button
                  key={scope.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => toggleSearchScope(scope.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {isActive && <Check className="h-3.5 w-3.5" />}
                  {scope.label}
                </button>
              );
            })}
            {activeSearchScopes.length > 0 && (
              <button
                type="button"
                onClick={clearSearchScopes}
                className="rounded-full px-3 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                Clear filters
              </button>
            )}
          </div>

          {shouldShowSearchResults && (
            <div className="mt-5">
              {analysesQuery.isLoading ? (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Loading latest churn analyses...
                </p>
              ) : analysisSearchResults.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No matches found for the selected query and signal filters.
                </div>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {analysisSearchResults.map((searchResult) => {
                    const { customer, analysis, healthScore, matchLabels } = searchResult;
                    const warnings = getEarlyWarnings(customer, analysis);
                    const activeRootCauses = getRootCauseFactors(customer, analysis).filter(
                      (factor) => factor.active,
                    );

                    return (
                      <article
                        key={customer.customer_id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-black text-slate-950 dark:text-slate-50">
                              {customer.name}
                            </p>
                            <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                              {customer.customer_id} / {customer.domain}
                            </p>
                          </div>
                          <RiskBadge score={analysis?.churn_score} />
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              Health
                            </p>
                            <p className="mt-1 font-black text-slate-900 dark:text-slate-50">
                              {healthScore ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              Sentiment
                            </p>
                            <p className="mt-1 font-black text-slate-900 dark:text-slate-50">
                              {overallSentiment(customer)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              Alerts
                            </p>
                            <p className="mt-1 font-black text-orange-700 dark:text-orange-300">
                              {warnings.length}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(matchLabels.length ? matchLabels : activeRootCauses.map((factor) => factor.label).slice(0, 3)).map((label) => (
                            <span
                              key={label}
                              className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                            >
                              {label}
                            </span>
                          ))}
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {analysis?.root_cause ?? "Pending churn analysis"}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                          {analysis?.recommended_intervention ??
                            "Run the agent to generate reasoning and an intervention."}
                        </p>

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            className="btn-primary px-3 py-2"
                            onClick={() => selectSearchResult(customer.customer_id)}
                          >
                            <Check className="h-4 w-4" />
                            Add to scope
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="grid gap-6 min-[1400px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,0.9fr)]">
          <section
            id="workflow-segment"
            tabIndex={-1}
            className="panel agent-card-motion agent-enter agent-enter-delay-1 scroll-mt-6 p-6 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">
                  Audience
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {audienceCount} customers queued from {scopedCustomers.length}{" "}
                  in scope
                </p>
              </div>
              <span className="agent-pill bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950 dark:text-cyan-200 dark:ring-cyan-900">
                <Users className="h-3.5 w-3.5" />
                Live
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Industry segment
                <select
                  className="field mt-2"
                  value={domain}
                  onChange={(event) =>
                    setDomain(event.target.value as Domain | "all")
                  }
                >
                  <option value="all">All industries</option>
                  <option value="Telecom">Telecom customers</option>
                  <option value="Banking">Banking customers</option>
                  <option value="SaaS">SaaS customers</option>
                </select>
              </label>
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Risk level
                <select
                  className="field mt-2"
                  value={includeLowRisk ? "all" : "at_risk"}
                  onChange={(event) =>
                    setIncludeLowRisk(event.target.value === "all")
                  }
                >
                  <option value="at_risk">High and critical</option>
                  <option value="all">Include low risk</option>
                </select>
              </label>
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Customer cap
                <input
                  className="field mt-2"
                  type="number"
                  min={1}
                  max={100}
                  value={maxCustomers}
                  onChange={(event) =>
                    setMaxCustomers(
                      Math.min(
                        100,
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    )
                  }
                />
              </label>
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Region
                <input
                  className="field mt-2"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                />
              </label>
              <label className="sm:col-span-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                Channel
                <select
                  className="field mt-2"
                  value={campaignType}
                  onChange={(event) => setCampaignType(event.target.value)}
                >
                  {campaignTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              id="workflow-trigger"
              tabIndex={-1}
              className="mt-5 scroll-mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 outline-none focus:ring-2 focus:ring-blue-200 dark:border-blue-900 dark:bg-blue-950/30 dark:focus:ring-blue-900"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="agent-label">Trigger logic</p>
                  <h3 className="mt-1 text-base font-black text-slate-950 dark:text-slate-50">
                    Run when churn risk enters the rescue queue
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    The agent uses the selected segment, risk setting, customer
                    cap, and customer picks to decide which accounts to analyze.
                  </p>
                </div>
                <span className="agent-pill bg-white text-blue-700 ring-blue-100 dark:bg-slate-900 dark:text-blue-200 dark:ring-blue-900">
                  <TimerReset className="h-3.5 w-3.5" />
                  {includeLowRisk ? "All risk" : "At-risk"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    Audience trigger
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {selectedIds.length
                      ? `${selectedIds.length} selected accounts`
                      : `${audienceCount} auto-scoped accounts`}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    Action trigger
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {createTasks ? "Create follow-up tasks" : "Monitor only"}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    Outreach trigger
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {triggerCampaigns
                      ? campaignLabel(campaignType)
                      : "Draft preview only"}
                  </p>
                </div>
              </div>
            </div>

            <label className="mt-5 block text-sm font-bold text-slate-600 dark:text-slate-300">
              Agent goal
              <textarea
                className="field mt-2 min-h-28"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Describe the rescue campaign objective."
              />
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="grid min-h-16 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="flex min-w-0 items-center gap-2">
                  <ClipboardPlus className="h-4 w-4 shrink-0 text-blue-600" />
                  Tasks
                </span>
                <input
                  className="h-4 w-4 shrink-0"
                  type="checkbox"
                  checked={createTasks}
                  onChange={(event) => setCreateTasks(event.target.checked)}
                />
              </label>
              <label className="grid min-h-16 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="flex min-w-0 items-center gap-2">
                  <MailPlus className="h-4 w-4 shrink-0 text-blue-600" />
                  Outreach
                </span>
                <input
                  className="h-4 w-4 shrink-0"
                  type="checkbox"
                  checked={triggerCampaigns}
                  onChange={(event) =>
                    setTriggerCampaigns(event.target.checked)
                  }
                />
              </label>
              <label className="grid min-h-16 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:col-span-2 xl:col-span-1">
                <span className="flex min-w-0 items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                  Low risk
                </span>
                <input
                  className="h-4 w-4 shrink-0"
                  type="checkbox"
                  checked={includeLowRisk}
                  onChange={(event) => setIncludeLowRisk(event.target.checked)}
                />
              </label>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="agent-label">Customer scope</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selectedIds.length
                      ? `${selectedIds.length} selected`
                      : "Using automatic segment"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary px-3 py-2"
                    onClick={selectVisibleCustomers}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2"
                    onClick={clearAgentQuery}
                    disabled={runAgent.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
                {visibleCustomers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No customers match this segment.
                  </div>
                ) : (
                  visibleCustomers.map((customer) => (
                    <label
                      key={customer.customer_id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                    >
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={selectedIds.includes(customer.customer_id)}
                        onChange={() => toggleCustomer(customer.customer_id)}
                      />
                      <span
                        aria-hidden="true"
                        className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-400 bg-white text-transparent transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200 dark:border-slate-400 dark:bg-white"
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-950 dark:text-slate-50">
                          {customer.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {customer.customer_id} / {customer.domain} /{" "}
                          {customer.plan ?? "No plan"}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </section>

          <section
            id="workflow-offer"
            tabIndex={-1}
            className="panel agent-card-motion agent-enter agent-enter-delay-2 scroll-mt-6 p-6 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">
                  AI Recommended Offer
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {domain === "all"
                    ? "Cross-domain rescue package"
                    : `${domain} rescue package`}
                </p>
              </div>
              <span className="agent-pill bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950 dark:text-orange-200 dark:ring-orange-900">
                <Zap className="h-3.5 w-3.5" />
                Offer
              </span>
            </div>

            <div className="mt-7">
              <p className="agent-label">Offer package</p>
              <ul className="mt-3 space-y-2 text-lg font-semibold leading-6 text-slate-950 dark:text-slate-50">
                {offerPackage.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-blue-600">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <p className="agent-label">Expected save impact</p>
                <span className="text-sm font-black text-emerald-600">
                  {saveImpact.label}
                </span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-3 rounded-full bg-emerald-500"
                  style={{ width: saveImpact.width }}
                />
              </div>
            </div>

            <div className="mt-8">
              <p className="agent-label">Compliance</p>
              <span
                className={`mt-3 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                  approvalSubmitted
                    ? "bg-emerald-500 text-white"
                    : "bg-orange-500 text-white"
                }`}
              >
                {approvalSubmitted ? "Submitted" : "Needs approval"}
              </span>
            </div>

            <div className="mt-8 space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <Target className="h-4 w-4 text-blue-600" />
                  Segment
                </span>
                <span className="text-right text-slate-500 dark:text-slate-400">
                  {domain === "all" ? "All industries" : domain} /{" "}
                  {region || "Global"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <Send className="h-4 w-4 text-blue-600" />
                  Channel
                </span>
                <span className="text-right text-slate-500 dark:text-slate-400">
                  {campaignLabel(campaignType)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <FileCheck2 className="h-4 w-4 text-blue-600" />
                  Work queue
                </span>
                <span className="text-right text-slate-500 dark:text-slate-400">
                  {createTasks ? "Tasks on" : "Monitor only"}
                </span>
              </div>
            </div>
          </section>

          <section
            id="workflow-message"
            tabIndex={-1}
            className="panel agent-card-motion agent-enter agent-enter-delay-3 scroll-mt-6 p-6 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">
                  Message Preview
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {previewCustomer?.customer_id ?? "No audience selected"}
                </p>
              </div>
              <span className="agent-pill bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-900">
                <MessageSquareText className="h-3.5 w-3.5" />v{messageVariant}
              </span>
            </div>

            <div className="mt-7 min-h-72 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-black text-blue-600">
                {messageDraft.label}
              </p>
              <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Subject: {messageDraft.subject}
              </p>
              <p className="mt-5 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-300">
                {messageDraft.body}
              </p>
            </div>

            {previewAudience && (
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
                <p className="text-xs font-black uppercase tracking-normal text-blue-700 dark:text-blue-200">
                  Audience preview
                </p>
                <div className="mt-3 space-y-2">
                  {(selectedCustomers.length
                    ? selectedCustomers
                    : visibleCustomers.slice(0, 3)
                  )
                    .slice(0, 3)
                    .map((customer) => (
                      <div
                        key={customer.customer_id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {customer.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {customer.customer_id}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div
              id="workflow-approval"
              tabIndex={-1}
              className="mt-6 grid scroll-mt-6 gap-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            >
              <button
                type="button"
                className="btn-tertiary"
                onClick={generateVariant}
              >
                <Wand2 className="h-4 w-4" />
                Generate Variants
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPreviewAudience((current) => !current)}
              >
                <Eye className="h-4 w-4" />
                Preview Audience
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submitApproval}
              >
                <ShieldCheck className="h-4 w-4" />
                Submit Approval
              </button>
            </div>
          </section>
        </div>
      </form>

      {runAgent.isPending && (
        <section className="panel overflow-hidden p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Sparkles className="h-5 w-5 animate-pulse text-blue-700" />
              Agent is inspecting signals, scoring churn risk, and preparing
              actions.
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700"
              onClick={stopAgentRun}
            >
              <StopRunIcon />
              Stop Rescue
            </button>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950">
            <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-blue-600" />
          </div>
        </section>
      )}

      {result ? (
        <AgentRunResult result={result} />
      ) : (
        <section className="panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-cyan-300 dark:bg-slate-800">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-slate-50">
                  Agent run console
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Awaiting rescue execution.
                </p>
              </div>
            </div>
            <span className="agent-pill bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              {audienceCount} queued
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

function AgentRunResult({ result }: { result: AgentRunResponse }) {
  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-800 dark:text-cyan-200">
              {result.run_id}
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">
              Agent reasoning trace
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {result.goal}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:ring-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        </div>
        <ol className="mt-5 space-y-3">
          {result.reasoning_trace.map((step, index) => (
            <li
              key={`${step}-${index}`}
              className="flex gap-3 text-sm text-slate-700 dark:text-slate-300"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                {index + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="panel p-5">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <p className="mt-3 text-2xl font-bold">
            {result.customer_outcomes.length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Customers analyzed
          </p>
        </section>
        <section className="panel p-5">
          <ClipboardPlus className="h-5 w-5 text-cyan-700" />
          <p className="mt-3 text-2xl font-bold">
            {result.created_tasks.length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tasks created
          </p>
        </section>
        <section className="panel p-5">
          <MailPlus className="h-5 w-5 text-cyan-700" />
          <p className="mt-3 text-2xl font-bold">
            {result.campaign_events.length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Outreach events
          </p>
        </section>
      </div>

      <DomainRiskMap summaries={result.domain_risk_summary} />

      <section className="panel p-5">
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
          Conclusion
        </h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {result.summary}
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {result.next_steps.map((step) => (
            <div
              key={step}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
            Customer rescue plans
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Reasoning appears before root cause and recommended intervention.
          </p>
        </div>
        {result.customer_outcomes.map((outcome) => (
          <article key={outcome.customer_id} className="panel p-5">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {outcome.customer_id}
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">
                  {outcome.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {outcome.domain}
                </p>
              </div>
              <RiskBadge score={outcome.analysis.churn_score} />
            </div>

            <div className="mt-5 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-2 rounded-full ${riskBar(outcome.analysis.churn_score)}`}
                style={{ width: formatPercent(outcome.analysis.churn_score) }}
              />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Reasoning
                </h4>
                <ol className="mt-3 space-y-2">
                  {outcome.analysis.reasoning.map((reason, index) => (
                    <li
                      key={`${reason}-${index}`}
                      className="flex gap-3 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {index + 1}
                      </span>
                      {reason}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Root cause
                  </h4>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    {outcome.analysis.root_cause}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Recommended intervention
                  </h4>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    {outcome.analysis.recommended_intervention}
                  </p>
                </div>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900 dark:border-cyan-700 dark:bg-cyan-900 dark:text-cyan-100">
                  {outcome.action_summary}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
            Agent action ledger
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-900">
              {result.actions.map((action, index) => (
                <tr
                  key={`${action.customer_id}-${action.action_type}-${index}`}
                  className="text-sm"
                >
                  <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {action.customer_id}
                  </td>
                  <td className="px-5 py-4 capitalize text-slate-700 dark:text-slate-300">
                    {action.action_type.replace("_", " ")}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${actionTone(action.status)}`}
                    >
                      {action.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {action.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DomainRiskMap({
  summaries,
}: {
  summaries: AgentRunResponse["domain_risk_summary"];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
          At-risk users by domain
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          High and critical churn scores are grouped so each domain owner can
          act on the right accounts.
        </p>
      </div>

      {summaries.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {summaries.map((summary) => (
            <article key={summary.domain} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-slate-50">
                    {summary.domain}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {summary.at_risk_count} of {summary.customers_analyzed}{" "}
                    users at risk
                  </p>
                </div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:ring-orange-700">
                  {summary.critical_count} critical / {summary.high_count} high
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Average churn score</span>
                  <span>{formatPercent(summary.average_churn_score)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={`h-2 rounded-full ${riskBar(summary.average_churn_score)}`}
                    style={{
                      width: formatPercent(summary.average_churn_score),
                    }}
                  />
                </div>
              </div>

              {summary.top_risk_customer ? (
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                    Highest risk
                  </p>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {summary.top_risk_customer.name}
                      </p>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {summary.top_risk_customer.customer_id}
                      </p>
                    </div>
                    <RiskBadge score={summary.top_risk_customer.churn_score} />
                  </div>
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                    {summary.top_risk_customer.root_cause}
                  </p>
                </div>
              ) : (
                <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No high or critical at-risk users identified in this domain.
                </p>
              )}

              {summary.at_risk_customers.length > 1 && (
                <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                    Additional at-risk users
                  </p>
                  {summary.at_risk_customers.slice(1).map((customer) => (
                    <div
                      key={customer.customer_id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {customer.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {customer.customer_id}
                        </p>
                      </div>
                      <RiskBadge score={customer.churn_score} />
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No domain risk summary available" />
      )}
    </section>
  );
}
