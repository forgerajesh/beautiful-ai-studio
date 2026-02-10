# SECQ Architecture

## Component view

```mermaid
flowchart TB
  A[targets.yaml] --> B[Config Loader]
  B --> C[Execution Engine]
  C --> D[Check Registry]
  D --> E1[TLS Check]
  D --> E2[Security Headers Check]
  D --> E3[Open Redirect Check]
  D --> E4[Secrets Scan Check]

  C --> F1[JSON Reporter]
  C --> F2[HTML Reporter]
  C --> F3[JUnit Reporter]
```

## Runtime flow

```mermaid
sequenceDiagram
  participant U as User/CI
  participant R as secq.py
  participant C as Engine
  participant K as Checks
  participant O as Reporters

  U->>R: run SECQ
  R->>C: load config + run checks
  C->>K: execute per target/check
  K-->>C: findings (PASS/FAIL/ERROR)
  C->>O: write JSON/HTML/JUnit
  O-->>R: artifact paths
  R-->>U: summary + exit code
```

## Security model
- No hardcoded credentials in code
- Externalize secrets via env/secret manager
- Read-only testing identity where possible
- Controlled scan targets and allowlists

## Scalability model
- Add threaded/async execution per target
- Add adapter model for authenticated/API/internal checks
- Add distributed execution for large estate scans

## Quality model
- Deterministic checks first (policy + headers + cert + static)
- Stateful checks optional (auth flows)
- Fail-fast mode for critical checks in CI
