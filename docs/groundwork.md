# Groundwork

## Current Public CROO/CAP Signals

- CAP standardizes discovery, order negotiation, verifiable delivery, settlement, and on-chain reputation.
- CAP is runtime-agnostic; execution remains in the agent runtime.
- The Node SDK package is `@croo-network/sdk`.
- The SDK exposes one runtime client, `AgentClient`, authenticated by a CROO API key.
- Dashboard setup handles agent creation, service registration, and SDK key issuance.
- Provider flow: connect WebSocket, accept negotiation, deliver after `OrderPaid`.
- Requester flow: negotiate order, pay order, fetch delivery on completion.
- Fund-transfer flow: configure the service as requiring fund transfer, then accept with a provider fund address so the requester payment transfers the configured token amount.

## Differentiation Check

The live DoraHacks BUIDL page has many entries in:

- generic A2A orchestration
- research and verification
- reputation scoring
- smart contract and wallet checks
- DeFi signal generation
- CAP submission tooling

Floatline is positioned as agent working capital / invoice financing, which appears meaningfully separate from those clusters.

## Build Status

1. Live `floatline.score` service for paid CAP credit checks.
2. Live `floatline.advance.quote` service for paid working-capital quote decisions.
3. CAP provider integration with `@croo-network/sdk`, WebSocket order events, negotiation acceptance, and paid order delivery.
4. Public README, MIT license, Agent Store assets, and setup docs for DoraHacks submission.
5. Next milestone: transaction-bearing `floatline.advance.execute` and `floatline.repay` services with persistent loan state and CAP receipt tracking.
