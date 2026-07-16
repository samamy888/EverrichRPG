# Everrich RPG API

Clean Architecture solution targeting .NET 10:

- `EverrichRPG.Domain`: domain primitives only.
- `EverrichRPG.Application`: use-case and application service boundary.
- `EverrichRPG.Infrastructure`: EF Core, MySQL, migrations, and external adapters.
- `EverrichRPG.Api`: HTTP, health checks, logging, and composition root.
- `tests`: unit and in-memory integration test projects.

The schema intentionally contains no gameplay tables. Add new aggregates first in
the Domain project, configure persistence in Infrastructure, then create an EF
Core migration.
