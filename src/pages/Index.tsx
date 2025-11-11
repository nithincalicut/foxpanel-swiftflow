import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/analytics/MetricCard";
import { LeadsChart } from "@/components/analytics/LeadsChart";
import { RecentActivity } from "@/components/analytics/RecentActivity";
import { TrendingUp, DollarSign, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch all leads
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

      // Fetch recent activity
      const { data: activityData, error: activityError } = await supabase
        .from("lead_history")
        .select(`
          *,
          leads (order_id, customer_name)
        `)
        .order("changed_at", { ascending: false })
        .limit(20);

      if (activityError) throw activityError;
      
      const formattedActivities = activityData?.map(item => ({
        ...item,
        order_id: item.leads?.order_id,
        customer_name: item.leads?.customer_name,
      })) || [];
      
      setActivities(formattedActivities);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calculate metrics
  const totalLeads = leads.length;
  const deliveredLeads = leads.filter(l => l.status === "delivered").length;
  const conversionRate = totalLeads > 0 ? ((deliveredLeads / totalLeads) * 100).toFixed(1) : "0";
  const totalRevenue = leads
    .filter(l => l.price_aed && l.status !== "leads")
    .reduce((sum, l) => sum + (Number(l.price_aed) || 0), 0);
  const activeLeads = leads.filter(l => l.status !== "delivered").length;

  // Leads by stage data
  const leadsByStage = [
    { name: "Leads", value: leads.filter(l => l.status === "leads").length },
    { name: "Photos", value: leads.filter(l => l.status === "photos_received").length },
    { name: "Mockup", value: leads.filter(l => l.status === "mockup_done").length },
    { name: "Price", value: leads.filter(l => l.status === "price_shared").length },
    { name: "Payment", value: leads.filter(l => l.status === "payment_done").length },
    { name: "Production", value: leads.filter(l => l.status === "production").length },
    { name: "Delivered", value: deliveredLeads },
  ];

  // Revenue by product type
  const revenueByProduct = [
    {
      name: "FP-PRO",
      value: leads
        .filter(l => l.product_type === "fp_pro" && l.price_aed)
        .reduce((sum, l) => sum + (Number(l.price_aed) || 0), 0),
    },
    {
      name: "FW",
      value: leads
        .filter(l => l.product_type === "fw" && l.price_aed)
        .reduce((sum, l) => sum + (Number(l.price_aed) || 0), 0),
    },
    {
      name: "FT",
      value: leads
        .filter(l => l.product_type === "ft" && l.price_aed)
        .reduce((sum, l) => sum + (Number(l.price_aed) || 0), 0),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your sales pipeline performance
          </p>
        </div>

        {/* Metrics Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Leads"
            value={totalLeads}
            icon={Users}
            description="All time"
          />
          <MetricCard
            title="Conversion Rate"
            value={`${conversionRate}%`}
            icon={TrendingUp}
            description="To delivered"
          />
          <MetricCard
            title="Total Revenue"
            value={`${totalRevenue.toLocaleString()} AED`}
            icon={DollarSign}
            description="From all orders"
          />
          <MetricCard
            title="Active Leads"
            value={activeLeads}
            icon={CheckCircle}
            description="In progress"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <LeadsChart
            title="Leads by Stage"
            data={leadsByStage}
            type="pie"
          />
          <LeadsChart
            title="Revenue by Product Type"
            data={revenueByProduct}
            type="bar"
          />
        </div>

        {/* Recent Activity */}
        <RecentActivity activities={activities} />
      </div>
    </DashboardLayout>
  );
};

export default Index;
