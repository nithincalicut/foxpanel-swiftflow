import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get leads that had status change 4 hours ago
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, order_id, customer_name, status, last_status_change, assigned_to')
      .gte('last_status_change', fourHoursAgo)
      .lte('last_status_change', now)
      .not('status', 'eq', 'delivered');

    if (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }

    console.log(`Found ${leads?.length || 0} leads needing follow-up`);

    // Here you would implement the notification logic
    // For now, we'll just log them
    for (const lead of leads || []) {
      console.log(`Follow-up needed for lead ${lead.order_id}: ${lead.customer_name}`);
      // TODO: Implement notification mechanism (email, SMS, in-app notification)
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadsChecked: leads?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
