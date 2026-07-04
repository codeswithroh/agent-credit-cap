import "dotenv/config";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";
import type { Order } from "@croo-network/sdk";
import { CreditQuoteRequestSchema } from "../credit/schema.js";
import { quoteCredit } from "../credit/quote.js";

const apiUrl = process.env.CROO_API_URL ?? "https://api.croo.network";
const wsUrl = process.env.CROO_WS_URL ?? "wss://api.croo.network/ws";
const sdkKey = process.env.CROO_SDK_KEY ?? process.env.CROO_API_KEY;
const fundAddress = process.env.FLOATLINE_FUND_ADDRESS;

if (!sdkKey) {
  throw new Error("CROO_SDK_KEY is required");
}

const client = new AgentClient({ baseURL: apiUrl, wsURL: wsUrl, logger: createRedactingLogger() }, sdkKey);
const stream = await client.connectWebSocket();
const keepAlive = setInterval(() => {
  console.log("Floatline provider heartbeat", { at: new Date().toISOString() });
}, 60_000);

console.log("Floatline provider connected to CROO", { apiUrl, wsUrl });

stream.on(EventType.NegotiationCreated, async (event) => {
  if (!event.negotiation_id) return;

  try {
    const negotiation = await client.getNegotiation(event.negotiation_id);

    if (negotiation.fundAmount && negotiation.fundToken) {
      if (!fundAddress) {
        await client.rejectNegotiation(event.negotiation_id, "FLOATLINE_FUND_ADDRESS is required for fund-transfer services");
        return;
      }

      await client.acceptNegotiationWithFundAddress(event.negotiation_id, fundAddress);
      console.log("Accepted fund-transfer negotiation", { negotiationId: event.negotiation_id });
      return;
    }

    const result = await client.acceptNegotiation(event.negotiation_id);
    console.log("Accepted negotiation", {
      negotiationId: event.negotiation_id,
      orderId: result.order.orderId,
      serviceId: result.order.serviceId,
    });
  } catch (error) {
    console.error("Failed to accept negotiation", { negotiationId: event.negotiation_id, error });
  }
});

stream.on(EventType.OrderPaid, async (event) => {
  if (!event.order_id) return;

  try {
    const order = await client.getOrder(event.order_id);
    const requirements = await readRequirements(order);
    const request = CreditQuoteRequestSchema.parse(JSON.parse(requirements));
    const quote = quoteCredit(request);

    const result = await client.deliverOrder(event.order_id, {
      deliverableType: DeliverableType.Text,
      deliverableText: JSON.stringify(quote),
    });

    console.log("Delivered quote", {
      orderId: event.order_id,
      txHash: result.txHash,
      approved: quote.approved,
      riskScore: quote.riskScore,
    });
  } catch (error) {
    console.error("Failed to deliver quote", { orderId: event.order_id, error });

    await client.deliverOrder(event.order_id, {
      deliverableType: DeliverableType.Text,
      deliverableText: JSON.stringify({
        approved: false,
        error: "INVALID_REQUIREMENTS",
        message: error instanceof Error ? error.message : "Unable to parse quote requirements",
      }),
    });
  }
});

process.on("SIGINT", () => {
  clearInterval(keepAlive);
  stream.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  clearInterval(keepAlive);
  stream.close();
  process.exit(0);
});

async function readRequirements(order: Order): Promise<string> {
  const negotiation = await client.getNegotiation(order.negotiationId);
  const requirements = negotiation.requirements;

  if (typeof requirements !== "string") {
    throw new Error("Order requirements must be a JSON string");
  }

  return requirements;
}

function createRedactingLogger() {
  return {
    info: logWithRedaction(console.info),
    warn: logWithRedaction(console.warn),
    error: logWithRedaction(console.error),
    debug: logWithRedaction(console.debug),
  };
}

function logWithRedaction(log: (...args: unknown[]) => void) {
  return (message: string, ...args: unknown[]) => {
    log(redactSecret(message), ...args.map(redactValue));
  };
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactSecret(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactValue(entry)]));
  }

  return value;
}

function redactSecret(value: string): string {
  return value.replace(/croo_sk_[A-Za-z0-9]+/g, "croo_sk_***");
}
