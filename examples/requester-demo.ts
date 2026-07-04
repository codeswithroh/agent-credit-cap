import "dotenv/config";
import { AgentClient } from "@croo-network/sdk";

const apiUrl = process.env.CROO_API_URL ?? "https://api.croo.network";
const wsUrl = process.env.CROO_WS_URL ?? "wss://api.croo.network/ws";
const sdkKey = process.env.CROO_SDK_KEY ?? process.env.CROO_API_KEY;
const serviceId = process.env.CROO_FLOATLINE_SCORE_SERVICE_ID;
const targetAgentId = process.env.CROO_TARGET_AGENT_ID ?? "d1f0a83a-569b-48f3-993d-cdc59d13564c";

if (!sdkKey) throw new Error("CROO_SDK_KEY is required");
if (!serviceId) throw new Error("CROO_FLOATLINE_SCORE_SERVICE_ID is required");

const client = new AgentClient({ baseURL: apiUrl, wsURL: wsUrl }, sdkKey);
const requirements = JSON.stringify({ agentId: targetAgentId });

const negotiation = await client.negotiateOrder({
  serviceId,
  requirements,
  metadata: JSON.stringify({ example: "floatline-score-requester" }),
});

console.log("Negotiation created", {
  negotiationId: negotiation.negotiationId,
  serviceId: negotiation.serviceId,
  status: negotiation.status,
  requirements,
});

if (process.env.FLOATLINE_PAY_ORDER !== "true") {
  console.log("Set FLOATLINE_PAY_ORDER=true to pay the accepted order from this requester wallet.");
  process.exit(0);
}

let accepted = negotiation;
for (let attempt = 0; attempt < 30 && accepted.status !== "accepted"; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  accepted = await client.getNegotiation(negotiation.negotiationId);
}

if (accepted.status !== "accepted") {
  throw new Error(`Negotiation was not accepted in time: ${accepted.status}`);
}

const orders = await client.listOrders({ role: "requester", status: "created", pageSize: 10 });
const order = orders.find((candidate) => candidate.negotiationId === negotiation.negotiationId);
if (!order) throw new Error("Accepted order was not found");

await client.payOrder(order.orderId);
console.log("Order paid", { orderId: order.orderId });
