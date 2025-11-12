import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadsChart } from "./LeadsChart";
import { MetricCard } from "./MetricCard";
import { DollarSign, TrendingUp, Clock } from "lucide-react";

interface PaymentAnalyticsProps {
  leads: any[];
  activities: any[];
}

export function PaymentAnalytics({ leads, activities }: PaymentAnalyticsProps) {
  // Payment type breakdown
  const paymentBreakdown = [
    {
      name: "Full Payment",
      value: leads.filter(l => l.payment_type === "full_payment").length,
    },
    {
      name: "50% Payment",
      value: leads.filter(l => l.payment_type === "partial_payment").length,
    },
    {
      name: "COD",
      value: leads.filter(l => l.payment_type === "cod").length,
    },
    {
      name: "Not Set",
      value: leads.filter(l => !l.payment_type && ["payment_done", "production", "delivered"].includes(l.status)).length,
    },
  ];

  // COD vs Prepaid conversion rates
  const codLeads = leads.filter(l => l.payment_type === "cod");
  const codDelivered = codLeads.filter(l => l.status === "delivered").length;
  const codConversionRate = codLeads.length > 0 
    ? ((codDelivered / codLeads.length) * 100).toFixed(1)
    : "0";

  const prepaidLeads = leads.filter(l => 
    l.payment_type === "full_payment" || l.payment_type === "partial_payment"
  );
  const prepaidDelivered = prepaidLeads.filter(l => l.status === "delivered").length;
  const prepaidConversionRate = prepaidLeads.length > 0
    ? ((prepaidDelivered / prepaidLeads.length) * 100).toFixed(1)
    : "0";

  // Average payment processing time (from payment_done to delivered)
  const deliveredLeads = leads.filter(l => l.status === "delivered" && l.payment_type);
  
  let avgProcessingTime = 0;
  if (deliveredLeads.length > 0) {
    const processingTimes = deliveredLeads.map(lead => {
      // Find when the lead entered payment_done status
      const paymentDoneActivity = activities.find(
        a => a.lead_id === lead.id && a.new_status === "payment_done"
      );
      
      // Find when the lead was delivered
      const deliveredActivity = activities.find(
        a => a.lead_id === lead.id && a.new_status === "delivered"
      );

      if (paymentDoneActivity && deliveredActivity) {
        const paymentTime = new Date(paymentDoneActivity.changed_at).getTime();
        const deliveredTime = new Date(deliveredActivity.changed_at).getTime();
        const diffInHours = (deliveredTime - paymentTime) / (1000 * 60 * 60);
        return diffInHours;
      }
      return 0;
    }).filter(time => time > 0);

    if (processingTimes.length > 0) {
      avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    }
  }

  // Revenue by payment type
  const revenueByPaymentType = [
    {
      name: "Full Payment",
      value: leads
        .filter(l => l.payment_type === "full_payment")
        .reduce((sum, lead) => {
          const leadTotal = lead.lead_items?.reduce((itemSum: number, item: any) => {
            return itemSum + ((parseFloat(item.price_aed) || 0) * item.quantity);
          }, 0) || 0;
          return sum + leadTotal;
        }, 0),
    },
    {
      name: "50% Payment",
      value: leads
        .filter(l => l.payment_type === "partial_payment")
        .reduce((sum, lead) => {
          const leadTotal = lead.lead_items?.reduce((itemSum: number, item: any) => {
            return itemSum + ((parseFloat(item.price_aed) || 0) * item.quantity);
          }, 0) || 0;
          return sum + leadTotal;
        }, 0),
    },
    {
      name: "COD",
      value: leads
        .filter(l => l.payment_type === "cod")
        .reduce((sum, lead) => {
          const leadTotal = lead.lead_items?.reduce((itemSum: number, item: any) => {
            return itemSum + ((parseFloat(item.price_aed) || 0) * item.quantity);
          }, 0) || 0;
          return sum + leadTotal;
        }, 0),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Payment Analytics</h3>
        <p className="text-muted-foreground">
          Insights into payment methods and processing performance
        </p>
      </div>

      {/* Payment Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="COD Conversion Rate"
          value={`${codConversionRate}%`}
          icon={TrendingUp}
          description={`${codDelivered} of ${codLeads.length} delivered`}
        />
        <MetricCard
          title="Prepaid Conversion Rate"
          value={`${prepaidConversionRate}%`}
          icon={TrendingUp}
          description={`${prepaidDelivered} of ${prepaidLeads.length} delivered`}
        />
        <MetricCard
          title="Avg Processing Time"
          value={avgProcessingTime > 0 ? `${avgProcessingTime.toFixed(1)}h` : "N/A"}
          icon={Clock}
          description="Payment to delivery"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <LeadsChart
          title="Payment Type Distribution"
          data={paymentBreakdown}
          type="pie"
        />
        <LeadsChart
          title="Revenue by Payment Type"
          data={revenueByPaymentType}
          type="bar"
        />
      </div>

      {/* Comparison Card */}
      <Card>
        <CardHeader>
          <CardTitle>COD vs Prepaid Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cash on Delivery (COD)</p>
                <p className="text-xs text-muted-foreground">
                  {codLeads.length} total orders
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{codConversionRate}%</p>
                <p className="text-xs text-muted-foreground">conversion rate</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm font-medium">Prepaid (Full + Partial)</p>
                <p className="text-xs text-muted-foreground">
                  {prepaidLeads.length} total orders
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{prepaidConversionRate}%</p>
                <p className="text-xs text-muted-foreground">conversion rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
