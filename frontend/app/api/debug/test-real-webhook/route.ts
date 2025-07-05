import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TESTING: Real webhook simulation through ngrok...');

    // Simulate a real DodoPayments webhook payload
    const dodoPaymentWebhook = {
      type: "payment.completed",
      data: {
        payment_id: "real_payment_001",
        amount: 420, // $4.20 in cents
        currency: "USD",
        status: "completed"
      },
      metadata: {
        user_id: null // Simulate no user_id (common case)
      },
      customer: {
        email: "radhikayash2@gmail.com" // Your admin email
      }
    };

    console.log('📤 Sending webhook to ngrok URL...');

    // Call the webhook through ngrok (simulating DodoPayments)
    const webhookResponse = await fetch('https://d6bd-27-4-76-107.ngrok-free.app/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        // Add mock DodoPayments headers (these would normally be added by DodoPayments)
        'webhook-id': 'wh_test_12345',
        'webhook-signature': 'v1,mock_signature_for_testing',
        'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        'User-Agent': 'DodoPayments-Webhook/1.0'
      },
      body: JSON.stringify(dodoPaymentWebhook)
    });

    const responseText = await webhookResponse.text();
    
    console.log(`📥 Webhook Response: ${webhookResponse.status}`);
    console.log(`📄 Response Body: ${responseText}`);

    return NextResponse.json({
      success: true,
      message: "Webhook test completed",
      ngrok_url: "https://d6bd-27-4-76-107.ngrok-free.app/api/webhook",
      webhook_status: webhookResponse.status,
      webhook_response: responseText,
      test_payload: dodoPaymentWebhook,
      status: webhookResponse.ok ? "✅ SUCCESS" : "❌ FAILED"
    });

  } catch (error) {
    console.error('❌ WEBHOOK TEST ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 