import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nowpayments-sig",
};

interface WebhookPayload {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  outcome_amount: number;
  outcome_currency: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require IPN secret to be configured - reject all requests otherwise
    const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
    if (!ipnSecret) {
      console.error("Webhook not configured: NOWPAYMENTS_IPN_SECRET missing");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Require signature header
    const signature = req.headers.get("x-nowpayments-sig");
    if (!signature) {
      console.error("Missing webhook signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.text();
    const payload: WebhookPayload = JSON.parse(body);

    console.log("Received webhook for payment:", payload.payment_id, "status:", payload.payment_status);

    // SECURITY: Verify webhook signature (mandatory)
    const sortedPayload = Object.keys(payload)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        acc[key] = (payload as unknown as Record<string, unknown>)[key];
        return acc;
      }, {});
    
    const hmac = createHmac("sha512", ipnSecret);
    hmac.update(JSON.stringify(sortedPayload));
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate order_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!payload.order_id || !uuidRegex.test(payload.order_id)) {
      console.error("Invalid order_id format:", payload.order_id);
      return new Response(
        JSON.stringify({ error: "Invalid order ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map NOWPayments status to order status
    let orderStatus = "pending";
    switch (payload.payment_status) {
      case "waiting":
        orderStatus = "pending";
        break;
      case "confirming":
        orderStatus = "pending";
        break;
      case "confirmed":
        orderStatus = "processing";
        break;
      case "sending":
        orderStatus = "processing";
        break;
      case "finished":
        orderStatus = "processing";
        break;
      case "failed":
        orderStatus = "cancelled";
        break;
      case "refunded":
        orderStatus = "cancelled";
        break;
      case "expired":
        orderStatus = "cancelled";
        break;
      default:
        orderStatus = "pending";
    }

    // Update order with payment status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: payload.payment_status,
        status: orderStatus,
      })
      .eq("id", payload.order_id);

    if (updateError) {
      console.error("Failed to update order:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If payment is finished, trigger order confirmation email
    if (payload.payment_status === "finished") {
      // Fetch order with user's profile for email
      const { data: order } = await supabase
        .from("orders")
        .select("id, total, user_id")
        .eq("id", payload.order_id)
        .single();

      if (order) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", order.user_id)
          .single();

        if (profile?.email) {
          await supabase.functions.invoke("send-order-status-email", {
            body: {
              to: profile.email,
              orderId: order.id,
              newStatus: "processing",
              orderTotal: order.total,
            },
          });
        }
      }
    }

    console.log("Successfully processed webhook for order:", payload.order_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
