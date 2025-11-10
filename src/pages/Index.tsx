import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Sales Pipeline</h2>
          <p className="text-muted-foreground">
            Manage your leads and orders from enquiry to delivery
          </p>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg">
          <div className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              Kanban board coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              Your sales pipeline will appear here
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
