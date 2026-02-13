# TestOps Platform — Architecture Diagram

This diagram shows the end-to-end architecture of the unified AI Testing Platform.

```mermaid
flowchart TB
    %% =========================
    %% Entry Channels
    %% =========================
    subgraph CH[User & Channel Layer]
        UI[Web UI / React E2E Studio]
        TG[Telegram]
        WA[WhatsApp]
        APIClient[External API Clients]
    end

    %% =========================
    %% API & Control Plane
    %% =========================
    subgraph CP[Control Plane]
        APIGW[FastAPI Gateway\napp/api/server.py]
        Auth[Auth + RBAC + Tenant Guard]
        Workflow[Workflow Orchestrator\napp/api/workflows.py]
        ChannelRegistry[Channel Registry\napp/channels/*]
    end

    %% =========================
    %% Agentic Intelligence Layer
    %% =========================
    subgraph AI[Agentic Intelligence Layer]
        AgentSvc[Agent Service\napp/agent/service.py]
        Registry[Agent Registry]
        A1[Playwright Agent]
        A2[API Agent]
        A3[Security Agent]
        A4[Accessibility Agent]
        A5[Non-Functional Agent]
        Planner[WorldClass Strategy Planner]
        Policy[Policy + Governance Engine]
        Doctor[Doctor (Recommendation Engine)]
    end

    %% =========================
    %% Execution & Healing
    %% =========================
    subgraph EX[Execution, Queue & Self-Healing]
        Queue[Queue Executor\nWave1/Wave3/V31/V3 backends]
        Runner[Execution Runners\nWeb/API/Mobile]
        Heal[Self-Healing Engine\nAI Locator Repair]
        Eval[Evaluation Harness]
        Promotion[Promotion Gates\nRisk/Approval/Contract]
    end

    %% =========================
    %% Data & Observability
    %% =========================
    subgraph OBS[Data, Artifacts & Observability]
        TestData[Test Data Manager]
        Artifacts[Artifacts Store\nReports/Screenshots/SARIF/Logs]
        Trace[Traceability Matrix]
        Telemetry[Telemetry + LogBus + Exporters]
        Analytics[Executive Analytics\nTrends + Maturity]
    end

    %% =========================
    %% External Integrations
    %% =========================
    subgraph INT[Enterprise Integrations]
        Jira[Jira]
        TestRail[TestRail]
        CI[CI/CD Pipelines]
        Repos[Git Repositories]
        Tooling[Security & Quality Tooling\nSemgrep, Bandit, Trivy, ZAP, etc.]
    end

    %% Flows
    UI --> APIGW
    TG --> ChannelRegistry --> APIGW
    WA --> ChannelRegistry
    APIClient --> APIGW

    APIGW --> Auth
    APIGW --> Workflow
    Workflow --> AgentSvc

    AgentSvc --> Registry
    Registry --> A1
    Registry --> A2
    Registry --> A3
    Registry --> A4
    Registry --> A5
    AgentSvc --> Planner
    AgentSvc --> Policy
    AgentSvc --> Doctor

    A1 --> Queue
    A2 --> Queue
    A3 --> Queue
    A4 --> Queue
    A5 --> Queue

    Queue --> Runner
    Runner --> Heal
    Heal --> Runner
    Runner --> Eval
    Eval --> Promotion

    Runner --> Artifacts
    Runner --> TestData
    Runner --> Telemetry

    Artifacts --> Analytics
    Trace --> Analytics
    Telemetry --> Analytics

    Runner --> Tooling
    Workflow --> Jira
    Workflow --> TestRail
    Queue --> CI
    CI --> Repos

    Analytics --> UI
    Artifacts --> UI
```

## Layer Intent (Quick Read)
- **Channel + UI layer:** where users initiate runs and receive results.
- **Control plane:** API, workflow state, auth, and multi-channel routing.
- **Agentic layer:** specialized testing agents + strategy/policy/doctor modules.
- **Execution layer:** queued execution, self-healing, evaluation, and promotion gates.
- **Observability layer:** artifacts, telemetry, traceability, analytics, executive maturity.
- **Integrations:** Jira/TestRail/CI and external tooling ecosystem.
