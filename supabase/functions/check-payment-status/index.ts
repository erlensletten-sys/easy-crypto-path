import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders, RATE_LIMIT_PRESETS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // SECURITY: Rate limiting - 30 status checks per minute per user
    const rateLimitResult = checkRateLimit(userId, RATE_LIMIT_PRESETS.checkStatus);
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for user ${userId} on check-payment-status`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const url = new URL(req.url);
    const paymentId = url.searchParams.get("paymentId");

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "Missing paymentId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the order with this payment_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("user_id")
      .eq("payment_id", paymentId)
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

    const nowPaymentsApiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!nowPaymentsApiKey) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check payment status with NOWPayments
    const statusResponse = await fetch(
      `https://api.nowpayments.io/v1/payment/${paymentId}`,
      {
        headers: {
          "x-api-key": nowPaymentsApiKey,
        },
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error("NOWPayments status check error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to check payment status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusData = await statusResponse.json();

    return new Response(
      JSON.stringify({
        payment_status: statusData.payment_status,
        pay_amount: statusData.pay_amount,
        actually_paid: statusData.actually_paid,
        pay_currency: statusData.pay_currency,
      }),
      { status: 200, headers: addRateLimitHeaders({ ...corsHeaders, "Content-Type": "application/json" }, rateLimitResult) }
    );
  } catch (error) {
    console.error("Error checking payment status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
