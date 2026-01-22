import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_PRESETS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderStatusEmailRequest {
  to: string;
  orderId: string;
  newStatus: string;
  orderTotal: number;
  customerName?: string;
}

const statusMessages: Record<string, { subject: string; message: string }> = {
  pending: {
    subject: "Order Received",
    message: "We have received your order and are processing it.",
  },
  processing: {
    subject: "Order Being Processed",
    message: "Great news! Your order is now being processed and prepared for shipment.",
  },
  shipped: {
    subject: "Order Shipped! 🚚",
    message: "Your order has been shipped and is on its way to you!",
  },
  delivered: {
    subject: "Order Delivered! 🎉",
    message: "Your order has been delivered. We hope you enjoy your purchase!",
  },
  cancelled: {
    subject: "Order Cancelled",
    message: "Your order has been cancelled. If you have any questions, please contact support.",
  },
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, orderId, newStatus, orderTotal, customerName }: OrderStatusEmailRequest = await req.json();

    // SECURITY: Rate limiting - 10 emails per minute per recipient
    // Use email address as identifier to prevent spam to a single user
    const rateLimitResult = checkRateLimit(to, RATE_LIMIT_PRESETS.sendEmail);
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for email ${to} on send-order-status-email`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const statusInfo = statusMessages[newStatus] || {
      subject: "Order Status Update",
      message: `Your order status has been updated to: ${newStatus}`,
    };

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
          .status-badge { display: inline-block; padding: 8px 16px; background: #7c3aed; color: white; border-radius: 20px; font-weight: 600; text-transform: uppercase; font-size: 12px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🛒 CryptoShop</h1>
            <p style="margin: 10px 0 0;">Order Status Update</p>
          </div>
          <div class="content">
            <p>Hi${customerName ? ` ${customerName}` : ''},</p>
            <p>${statusInfo.message}</p>
            
            <div class="order-details">
              <p><strong>Order ID:</strong> #${orderId.slice(0, 8)}</p>
              <p><strong>Status:</strong> <span class="status-badge">${newStatus}</span></p>
              <p><strong>Total:</strong> $${orderTotal.toFixed(2)}</p>
            </div>
            
            <p>If you have any questions about your order, please don't hesitate to contact us.</p>
            
            <p>Thank you for shopping with CryptoShop!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CryptoShop. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CryptoShop <onboarding@resend.dev>",
        to: [to],
        subject: `${statusInfo.subject} - Order #${orderId.slice(0, 8)}`,
        html: emailHtml,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Order status email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-order-status-email function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
