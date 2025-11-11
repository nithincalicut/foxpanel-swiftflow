import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  order_id?: string;
  customer_name?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const statusLabels: Record<string, string> = {
  leads: "Leads",
  photos_received: "Photos Received",
  mockup_done: "Mockup Done",
  price_shared: "Price Shared",
  payment_done: "Payment Done",
  production: "Production",
  delivered: "Delivered",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.customer_name || "Unknown"}</span>
                      {" "}({activity.order_id})
                    </p>
                    <div className="flex items-center gap-2">
                      {activity.old_status && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {statusLabels[activity.old_status] || activity.old_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                        </>
                      )}
                      <Badge className="text-xs">
                        {statusLabels[activity.new_status] || activity.new_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.changed_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
