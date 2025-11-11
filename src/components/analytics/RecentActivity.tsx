import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  lead_id: string;
  order_id: string;
  customer_name: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by_email: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const statusColors: Record<string, string> = {
  leads: "bg-blue-100 text-blue-800",
  photos_received: "bg-purple-100 text-purple-800",
  mockup_done: "bg-indigo-100 text-indigo-800",
  price_shared: "bg-yellow-100 text-yellow-800",
  payment_done: "bg-green-100 text-green-800",
  production: "bg-orange-100 text-orange-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

const formatStatus = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between border-b pb-3 last:border-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {activity.customer_name} ({activity.order_id})
                  </p>
                  <div className="flex items-center gap-2">
                    {activity.old_status && (
                      <>
                        <Badge variant="outline" className={statusColors[activity.old_status]}>
                          {formatStatus(activity.old_status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">→</span>
                      </>
                    )}
                    <Badge variant="outline" className={statusColors[activity.new_status]}>
                      {formatStatus(activity.new_status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    by {activity.changed_by_email} •{" "}
                    {formatDistanceToNow(new Date(activity.changed_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
