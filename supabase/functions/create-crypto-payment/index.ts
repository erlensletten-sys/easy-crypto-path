import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders, RATE_LIMIT_PRESETS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported cryptocurrency currencies whitelist
const SUPPORTED_CURRENCIES = ['btc', 'eth', 'usdt', 'ltc', 'xmr'] as const;
type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string; // e.g., 'btc', 'eth', 'usdt'
}

interface NowPaymentsResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  order_id: string;
  order_description: string;
  created_at: string;
  updated_at: string;
  purchase_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // SECURITY: Rate limiting - 5 payment creations per minute per user
    const rateLimitResult = checkRateLimit(userId, RATE_LIMIT_PRESETS.createPayment);
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for user ${userId} on create-crypto-payment`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Parse request body
    const { orderId, amount, currency }: PaymentRequest = await req.json();

    if (!orderId || !amount || !currency) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: orderId, amount, currency" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate orderId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(
        JSON.stringify({ error: "Invalid order ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate currency against whitelist
    const normalizedCurrency = currency.toLowerCase();
    if (!SUPPORTED_CURRENCIES.includes(normalizedCurrency as SupportedCurrency)) {
      return new Response(
        JSON.stringify({ error: "Unsupported currency. Supported: " + SUPPORTED_CURRENCIES.join(", ") }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate amount is a positive number
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be a positive number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the order belongs to this user and get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total, payment_id, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to access this order" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Check if payment already exists for this order
    if (order.payment_id) {
      return new Response(
        JSON.stringify({ error: "Payment already exists for this order" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate order is in valid state for payment
    if (order.payment_status && order.payment_status !== 'awaiting_payment') {
      return new Response(
        JSON.stringify({ error: "Order is not awaiting payment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate amount matches order total (allow small floating point tolerance)
    if (Math.abs(order.total - amount) > 0.01) {
      return new Response(
        JSON.stringify({ error: "Amount does not match order total" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create payment with NOWPayments API
    const nowPaymentsApiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!nowPaymentsApiKey) {
      console.error("NOWPAYMENTS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentResponse = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "x-api-key": nowPaymentsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: order.total, // Use server-side order total, not client-provided amount
        price_currency: "usd",
        pay_currency: normalizedCurrency,
        order_id: orderId,
        order_description: `Order ${orderId}`,
        ipn_callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/nowpayments-webhook`,
      }),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("NOWPayments API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentData: NowPaymentsResponse = await paymentResponse.json();

    // Update order with payment details
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_id: paymentData.payment_id.toString(),
        payment_status: paymentData.payment_status,
        pay_address: paymentData.pay_address,
        pay_amount: paymentData.pay_amount,
        pay_currency: paymentData.pay_currency,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          payment_id: paymentData.payment_id,
          pay_address: paymentData.pay_address,
          pay_amount: paymentData.pay_amount,
          pay_currency: paymentData.pay_currency,
          payment_status: paymentData.payment_status,
        },
      }),
      { status: 200, headers: addRateLimitHeaders({ ...corsHeaders, "Content-Type": "application/json" }, rateLimitResult) }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
