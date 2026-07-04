# Floatline CAP

CAP-native credit and liquidity rails for autonomous agents on CROO.

Floatline helps agents decide who to hire, fund, or route work to before settlement clears. It exposes a cheap credit-scoring API for CROO agents and a working-capital quote service for agents that want to hire downstream CAP agents against paid order flow.

## Live Links

- CROO Agent Store: https://agent.croo.network/agents/d1f0a83a-569b-48f3-993d-cdc59d13564c
- Public repo: https://github.com/codeswithroh/floatline-cap
- License: MIT

## Hackathon Fit

- Tracks: DeFi / On-chain Ops Agents, Developer Tooling Agents
- Protocol: CROO Agent Protocol (CAP)
- Settlement: USDC on Base through CROO CAP escrow
- Current status: live on CROO Agent Store and callable through paid CAP orders

## Why This Needs CAP

Floatline makes credit decisions from commerce primitives that only exist in an agent transaction layer:

- agent identity and wallet
- service and order lifecycle
- paid order status
- on-chain payment and delivery receipts
- completion, volume, and online reputation

Without CAP, an agent credit provider would be trusting screenshots or private claims. With CAP, the risk decision is tied to verifiable agent identity, service calls, paid orders, and settlement receipts.

## Live Services

### `floatline.score`

- Service ID: `07bbb4e9-f29a-4e78-be41-f9eb93014744`
- Price: `0.05` USDC
- SLA: 10 minutes
- Purpose: score any CROO agent or wallet for short-term CAP credit exposure.

Request:

```json
{
  "agentId": "ec1bc7f5-4429-46d9-8d9f-72423dabfdf2"
}
```

Alternative request for caller-supplied metrics:

```json
{
  "walletAddress": "0x83e3821f79Ef3e2F9462FF43Bd71887c42Ef44f1",
  "completedOrders": 12,
  "failedOrders": 1,
  "totalVolumeUsdc": 25,
  "completionRate": 98,
  "onlineStatus": "online",
  "currentPaidOrders": 1
}
```

Response:

```json
{
  "agentId": "ec1bc7f5-4429-46d9-8d9f-72423dabfdf2",
  "walletAddress": "0xa16F422c4F815Ee89A0bE3fdf3A56cD7A165a9C2",
  "score": 20,
  "grade": "E",
  "maxRecommendedExposureUsdc": 0,
  "decision": "decline",
  "signals": [
    "online_status=online",
    "completion_rate=0%",
    "completed_orders=0",
    "total_volume_usdc=0",
    "current_paid_orders=0"
  ],
  "warnings": [
    "limited_order_history",
    "completion_rate_below_90",
    "no_recorded_volume"
  ],
  "source": "croo_public_agent"
}
```

### `floatline.advance.quote`

- Service ID: `5e22778b-63f4-406d-a0ac-33f6d18c8bf1`
- Price: `0.10` USDC
- SLA: 30 minutes
- Purpose: quote a small working-capital advance for an agent that wants to hire downstream CAP agents before its own paid order clears.

Request:

```json
{
  "borrowerAgentId": "agent_demo_borrower",
  "parentOrderId": "order_parent_001",
  "requestedAdvanceUsdc": 1,
  "expectedSettlementUsdc": 4,
  "completedOrders": 12,
  "failedOrders": 1,
  "currentPaidOrders": 1
}
```

Response:

```json
{
  "approved": true,
  "maxAdvanceUsdc": 1.6,
  "feeUsdc": 0.05,
  "repayUsdc": 1.05,
  "riskScore": 90,
  "reasons": [
    "risk_score=90",
    "repayment_coverage=4x",
    "completed_orders=12",
    "failed_orders=1"
  ]
}
```

## CAP Integration

The provider is implemented in `src/cap/provider.ts` with `@croo-network/sdk`.

SDK methods used:

- `new AgentClient(...)`
- `connectWebSocket()`
- `stream.on(EventType.NegotiationCreated, ...)`
- `stream.on(EventType.OrderPaid, ...)`
- `getNegotiation(...)`
- `acceptNegotiation(...)`
- `acceptNegotiationWithFundAddress(...)` for future fund-transfer services
- `rejectNegotiation(...)`
- `getOrder(...)`
- `deliverOrder(...)`
- `listOrders(...)` and `payOrder(...)` in the requester example

Runtime flow:

1. CROO emits `order_negotiation_created`.
2. Floatline fetches the negotiation and accepts it.
3. CROO creates the on-chain CAP order.
4. Requester pays in USDC through CAP.
5. CROO emits `order_paid`.
6. Floatline reads the original requirements, calculates the score or quote, and calls `deliverOrder`.
7. CROO records the delivery and settlement proof.

## Local Setup

Requirements:

- Node.js 20+
- CROO Agent Store SDK key
- A registered CROO agent with service IDs

Install:

```bash
npm install
```

Configure:

```bash
cp .env.example .env
```

Set at minimum:

```bash
CROO_SDK_KEY=croo_sk_replace_me
CROO_FLOATLINE_SCORE_SERVICE_ID=07bbb4e9-f29a-4e78-be41-f9eb93014744
CROO_FLOATLINE_ADVANCE_QUOTE_SERVICE_ID=5e22778b-63f4-406d-a0ac-33f6d18c8bf1
```

Run checks:

```bash
npm run typecheck
npm test
npm run build
```

Start the provider:

```bash
npm run provider
```

Production-style local runner:

```bash
scripts/run-provider.sh
```

## Requester Example

Create a real CAP negotiation against `floatline.score`:

```bash
npm run requester
```

By default this creates the negotiation but does not pay. To pay from the requester wallet bound to your SDK key:

```bash
FLOATLINE_PAY_ORDER=true npm run requester
```

## Tests

The test suite covers:

- deterministic advance quotes
- deterministic credit scoring
- CROO text requirement envelope parsing

```bash
npm test
```

## Current Limitations

- `floatline.score` is live and uses CROO public agent metrics when an `agentId` is supplied.
- `floatline.advance.quote` is live and deterministic, but does not transfer funds.
- `floatline.advance.execute` and `floatline.repay` are planned transaction-bearing services for the next milestone.
- The provider is framework-agnostic and keeps execution sovereign; it only depends on CROO CAP for commerce, orders, and settlement.

## CROO Resources

- CAP site: https://cap.croo.network/
- Docs: https://docs.croo.network/
- Node SDK: https://github.com/CROO-Network/node-sdk
- Agent Store: https://agent.croo.network/
- MCP config template: `mcp/croo.mcp.example.json`
