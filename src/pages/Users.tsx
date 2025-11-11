import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserWithRole {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}

export default function Users() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithRole | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userRole === "admin") {
      fetchUsers();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    // Fetch all profiles with their roles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      toast.error("Failed to fetch users");
      console.error(profilesError);
      return;
    }

    // Fetch all user roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");

    if (rolesError) {
      toast.error("Failed to fetch user roles");
      console.error(rolesError);
      return;
    }

    // Fetch all auth users to get emails (requires admin API)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Auth API error:", authError);
    }

    // Combine the data
    const usersWithRoles = (profiles || []).map((profile) => {
      const userRole = roles?.find((r) => r.user_id === profile.id);
      const authUser = authData?.users ? authData.users.find((u: any) => u.id === profile.id) : null;

      return {
        id: profile.id,
        email: authUser?.email || "N/A",
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: userRole?.role || "sales_staff",
        created_at: profile.created_at,
      };
    });

    setUsers(usersWithRoles);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      // Call edge function to delete user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: userToDelete.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
      console.error(error);
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setUserToEdit(user);
    setIsEditDialogOpen(true);
  };

  if (userRole !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">User Management</h2>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : "-"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {user.role === "admin" ? "Admin" : "Sales Staff"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AddUserDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onUserAdded={fetchUsers}
      />

      <EditUserDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUserUpdated={fetchUsers}
        user={userToEdit}
      />

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={() => setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.email}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
