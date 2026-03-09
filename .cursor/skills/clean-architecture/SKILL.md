---
name: clean-architecture
description: Enforce clean architecture: domain has no external dependencies, application orchestrates use cases, infrastructure holds adapters; never mix infrastructure in domain. Use when designing features, adding modules, or refactoring code structure.
---

# Clean Architecture

When designing or implementing code, follow clean architecture. Dependencies point inward: infrastructure → application → domain. Domain is the center and has no outward dependencies.

## Layer rules

### Domain layer
- **No external dependencies.** No frameworks, no DB, no HTTP, no file system, no third-party libs.
- Contains: entities, value objects, domain interfaces (ports), and pure domain logic.
- Other layers depend on domain; domain does not depend on them.

### Application layer (use cases)
- **Orchestrates use cases.** One use case per application service or handler; it coordinates domain and infrastructure.
- Depends on domain only. Calls infrastructure through interfaces (ports) defined in domain or application.
- Contains: use case logic, application DTOs, port interfaces if not in domain.

### Infrastructure layer
- **Contains adapters.** Implements ports (repositories, gateways, external APIs, I/O).
- Depends on application/domain via interfaces. Contains all framework, DB, HTTP, and third-party wiring.
- Examples: REST controllers, Prisma repos, email senders, file storage.

## Never do
- **Do not mix infrastructure in domain.** No `import` of DB drivers, HTTP libs, or framework code in domain files. No repositories implementation in domain—only interfaces (ports) if needed there.
- Do not put use case orchestration in infrastructure (e.g. business logic in route handlers). Keep it in the application layer.
- Do not let domain depend on application or infrastructure.

## Dependency direction

```
Infrastructure → Application → Domain
     (adapters)    (use cases)   (entities, rules, ports)
```

Domain defines interfaces; application and infrastructure implement or use them. When adding a feature, add domain first, then application use case, then infrastructure adapters.

## Quick checklist
- [ ] Domain: no imports from app or infrastructure; no frameworks or I/O.
- [ ] Application: orchestrates use cases; depends only on domain (and port interfaces).
- [ ] Infrastructure: implements ports; contains all external adapters and wiring.
- [ ] No infrastructure code (DB, HTTP, libs) inside domain.
