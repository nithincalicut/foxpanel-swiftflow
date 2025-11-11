import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/analytics/MetricCard";
import { LeadsChart } from "@/components/analytics/LeadsChart";
import { RecentActivity } from "@/components/analytics/RecentActivity";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    conversionRate: 0,
    totalRevenue: 0,
    activeLeads: 0,
  });
  const [stageData, setStageData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [productData, setProductData] = useState<{ name: string; revenue: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all leads
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*");

      if (leadsError) throw leadsError;

      // Calculate metrics
      const total = leads?.length || 0;
      const delivered = leads?.filter((l) => l.status === "delivered").length || 0;
      const active = leads?.filter((l) => l.status !== "delivered").length || 0;
      const revenue = leads?.reduce((sum, l) => sum + (l.price_aed || 0), 0) || 0;

      setMetrics({
        totalLeads: total,
        conversionRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        totalRevenue: revenue,
        activeLeads: active,
      });

      // Calculate stage distribution
      const stages = [
        { id: "leads", name: "Leads", color: "hsl(217, 91%, 60%)" },
        { id: "photos_received", name: "Photos", color: "hsl(271, 91%, 65%)" },
        { id: "mockup_done", name: "Mockup", color: "hsl(262, 83%, 58%)" },
        { id: "price_shared", name: "Price", color: "hsl(48, 96%, 53%)" },
        { id: "payment_done", name: "Payment", color: "hsl(142, 71%, 45%)" },
        { id: "production", name: "Production", color: "hsl(25, 95%, 53%)" },
        { id: "delivered", name: "Delivered", color: "hsl(160, 84%, 39%)" },
      ];

      const stageDistribution = stages.map((stage) => ({
        name: stage.name,
        value: leads?.filter((l) => l.status === stage.id).length || 0,
        color: stage.color,
      }));

      setStageData(stageDistribution);

      // Calculate revenue by product
      const productRevenue = [
        {
          name: "FP-PRO",
          revenue: leads?.filter((l) => l.product_type === "fp_pro").reduce((sum, l) => sum + (l.price_aed || 0), 0) || 0,
        },
        {
          name: "FW",
          revenue: leads?.filter((l) => l.product_type === "fw").reduce((sum, l) => sum + (l.price_aed || 0), 0) || 0,
        },
        {
          name: "FT",
          revenue: leads?.filter((l) => l.product_type === "ft").reduce((sum, l) => sum + (l.price_aed || 0), 0) || 0,
        },
      ];

      setProductData(productRevenue);

      // Fetch recent activity
      const { data: history, error: historyError } = await supabase
        .from("lead_history")
        .select(`
          id,
          lead_id,
          old_status,
          new_status,
          changed_at,
          changed_by,
          leads!inner(order_id, customer_name)
        `)
        .order("changed_at", { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      const activityWithEmails = history?.map((h) => ({
        ...h,
        order_id: h.leads.order_id,
        customer_name: h.leads.customer_name,
        changed_by_email: "User",
      })) || [];

      setRecentActivity(activityWithEmails);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your sales pipeline performance
          </p>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Leads"
            value={metrics.totalLeads}
            icon={Users}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.conversionRate}%`}
            icon={TrendingUp}
          />
          <MetricCard
            title="Total Revenue"
            value={`${metrics.totalRevenue.toLocaleString()} AED`}
            icon={DollarSign}
          />
          <MetricCard
            title="Active Leads"
            value={metrics.activeLeads}
            icon={Clock}
          />
        </div>

        {/* Charts */}
        <LeadsChart stageData={stageData} productData={productData} />

        {/* Recent Activity */}
        <RecentActivity activities={recentActivity} />
      </div>
    </DashboardLayout>
  );
};

export default Index;
