import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, User, FileEdit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
}

const ActivityLogs = () => {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
    if (!isLoading && userRole !== "admin") {
      navigate("/");
      toast.error("Access denied. Admin only.");
    }
  }, [user, userRole, isLoading, navigate]);

  useEffect(() => {
    if (user && userRole === "admin") {
      fetchActivityLogs();
    }
  }, [user, userRole]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading || userRole !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getActionIcon = (actionType: string) => {
    if (actionType.includes("login")) return <User className="h-4 w-4" />;
    if (actionType.includes("lead")) return <FileEdit className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("created")) return "default";
    if (actionType.includes("updated")) return "secondary";
    if (actionType.includes("deleted")) return "destructive";
    if (actionType.includes("login")) return "outline";
    return "default";
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Activity Logs</h2>
          <p className="text-muted-foreground">
            Track all user actions and system activities
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity (Last 100)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No activity logs found</p>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          {getActionIcon(log.action_type)}
                        </div>
                        <div className="w-px h-full bg-border mt-2" />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getActionColor(log.action_type)}>
                            {formatActionType(log.action_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium">{log.entity_type}</span>
                          {log.details && (
                            <div className="mt-1 text-muted-foreground">
                              {log.details.order_id && (
                                <div>Order: {log.details.order_id}</div>
                              )}
                              {log.details.customer_name && (
                                <div>Customer: {log.details.customer_name}</div>
                              )}
                              {log.details.email && (
                                <div>Email: {log.details.email}</div>
                              )}
                              {log.details.changes && (
                                <div className="mt-1">
                                  {log.details.changes.status && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Badge variant="outline" className="text-xs">
                                        {log.details.changes.status.old}
                                      </Badge>
                                      <span>→</span>
                                      <Badge className="text-xs">
                                        {log.details.changes.status.new}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityLogs;
