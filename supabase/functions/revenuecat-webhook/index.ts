import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhook = await req.json();
    console.log('RevenueCat webhook received:', webhook);

    const { event } = webhook;

    // Extract subscriber info
    const subscriberId = event?.app_user_id;
    const productId = event?.product_id;
    const expiresDate = event?.expiration_at_ms 
      ? new Date(event.expiration_at_ms)
      : null;
    const purchasedAt = event?.purchased_at_ms
      ? new Date(event.purchased_at_ms)
      : null;
    const platform = event?.store;

    if (!subscriberId) {
      console.error('No subscriber ID in webhook');
      return new Response(
        JSON.stringify({ error: 'No subscriber ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine subscription status based on event type
    let status: string;
    switch (event?.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
        status = 'active';
        break;
      case 'CANCELLATION':
        status = 'canceled';
        break;
      case 'EXPIRATION':
        status = 'expired';
        break;
      case 'BILLING_ISSUE':
        status = 'grace_period';
        break;
      default:
        status = 'expired';
    }

    // Get user_id from profiles using the subscriber_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', subscriberId)
      .single();

    if (profileError || !profile) {
      console.error('User not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert subscription data
    const { error: upsertError } = await supabaseClient
      .from('user_subscriptions')
      .upsert({
        user_id: profile.id,
        subscription_status: status,
        product_id: productId || 'unknown',
        expires_at: expiresDate,
        revenuecat_customer_id: subscriberId,
        platform: platform || 'unknown',
        original_purchase_date: purchasedAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error upserting subscription:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Subscription updated successfully for user:', profile.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
