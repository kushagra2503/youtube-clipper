import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 SIMULATING: DodoPayments webhook calls...');

    // Simulate 3 payment webhook calls
    const testPayments = [
      {
        event: "payment.completed",
        data: {
          payment_id: "test_payment_001",
          customer_email: "radhikayash2@gmail.com", // Use your admin email
          amount: 420, // $4.20 in cents
          currency: "USD",
          status: "completed"
        }
      },
      {
        event: "payment.completed", 
        data: {
          payment_id: "test_payment_002",
          customer_email: "user2@example.com",
          amount: 120,
          currency: "USD", 
          status: "completed"
        }
      },
      {
        event: "payment.completed",
        data: {
          payment_id: "test_payment_003", 
          customer_email: "user3@example.com",
          amount: 120,
          currency: "USD",
          status: "completed"
        }
      }
    ];

    const results = [];

    for (const payment of testPayments) {
      try {
        console.log(`📞 Calling webhook for payment: ${payment.data.payment_id}`);
        
        const webhookResponse = await fetch('http://localhost:3000/api/debug/webhook-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payment)
        });

        const responseText = await webhookResponse.text();
        
        results.push({
          paymentId: payment.data.payment_id,
          email: payment.data.customer_email,
          status: webhookResponse.status,
          response: responseText,
          success: webhookResponse.ok
        });

        console.log(`✅ Payment ${payment.data.payment_id}: ${webhookResponse.status} - ${responseText}`);
        
      } catch (error) {
        console.error(`❌ Payment ${payment.data.payment_id} failed:`, error);
        results.push({
          paymentId: payment.data.payment_id,
          email: payment.data.customer_email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Simulated 3 DodoPayments webhook calls",
      results,
      summary: {
        totalCalls: testPayments.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('❌ SIMULATION ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to simulate payments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 