import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGetUserQuery, useGetUserTasksQuery } from "@/store/api/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Shield, 
  User, 
  CheckSquare, 
  Clock,
  CheckCircle2,
  Archive,
  Edit,
  Trash2,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateUserMutation, useDeleteUserMutation } from "@/store/api/adminApi";
import { toast } from "@/hooks/use-toast";
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

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  InProgress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const priorityColors = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Urgent: "bg-destructive/10 text-destructive",
};

export default function UserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: user, isLoading: userLoading } = useGetUserQuery(userId || "");
  const { data: tasksData, isLoading: tasksLoading } = useGetUserTasksQuery(
    { userId: userId || "", filters: {} },
    { skip: !userId }
  );
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const tasks = Array.isArray(tasksData) 
    ? tasksData 
    : (tasksData && 'data' in tasksData ? tasksData.data : []);

  const handleUpdateUser = async () => {
    if (!editingUser || !userId) return;
    try {
      const updateData: any = {};
      if (editingUser.username !== undefined) updateData.username = editingUser.username;
      if (editingUser.email !== undefined) updateData.email = editingUser.email;
      if (editingUser.is_admin !== undefined) updateData.is_admin = editingUser.is_admin;
      if (editingUser.is_active !== undefined) updateData.is_active = editingUser.is_active;

      await updateUser({ userId, data: updateData }).unwrap();
      toast({ title: "User updated successfully" });
      setEditingUser(null);
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.data?.message || error?.message || "Failed to update user";
      toast({ title: "Failed to update user", description: errorMessage, variant: "destructive" });
    }
  };

  const handleDeleteUser = async () => {
    if (!userId) return;
    try {
      await deleteUser(userId).unwrap();
      toast({ title: "User deleted successfully" });
      navigate("/admin");
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.data?.message || error?.message || "Failed to delete user";
      toast({ title: "Failed to delete user", description: errorMessage, variant: "destructive" });
    }
  };

  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t: any) => t.status === "Completed").length,
    pendingTasks: tasks.filter((t: any) => t.status === "Pending").length,
    inProgressTasks: tasks.filter((t: any) => t.status === "InProgress").length,
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <User className="h-12 w-12 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">User not found</p>
        <Button onClick={() => navigate("/admin")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className={cn(isMobile && "h-9 w-9")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>User Details</h1>
            <p className="text-sm text-muted-foreground mt-1">View and manage user information</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => setEditingUser({ ...user })}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  <span className={cn(isMobile && "hidden sm:inline")}>Edit</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-username">Username</Label>
                    <Input
                      id="edit-username"
                      value={editingUser?.username || ""}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, username: e.target.value })
                      }
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser?.email || ""}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, email: e.target.value })
                      }
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-is-admin">Admin Status</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-is-admin"
                        checked={editingUser?.is_admin ?? editingUser?.role === "admin"}
                        onCheckedChange={(checked) =>
                          setEditingUser({ ...editingUser, is_admin: checked })
                        }
                      />
                      <Label htmlFor="edit-is-admin" className="cursor-pointer">
                        {editingUser?.is_admin || editingUser?.role === "admin" ? "Admin" : "Regular User"}
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-is-active">Active Status</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-is-active"
                        checked={editingUser?.is_active ?? true}
                        onCheckedChange={(checked) =>
                          setEditingUser({ ...editingUser, is_active: checked })
                        }
                      />
                      <Label htmlFor="edit-is-active" className="cursor-pointer">
                        {editingUser?.is_active ? "Active" : "Inactive"}
                      </Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingUser(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateUser}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="destructive"
              size={isMobile ? "sm" : "default"}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className={cn(isMobile && "hidden sm:inline")}>Delete</span>
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className={cn("h-16 w-16 sm:h-20 sm:w-20")}>
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg sm:text-xl">
                {user.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                  {user.username}
                </h2>
                <Badge variant={user.role === "admin" || user.is_admin ? "default" : "secondary"}>
                  {user.role === "admin" || user.is_admin ? (
                    <>
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 mr-1" />
                      User
                    </>
                  )}
                </Badge>
                <Badge variant={user.is_active !== false ? "outline" : "secondary"}>
                  {user.is_active !== false ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              {user.bio && (
                <p className="text-sm text-muted-foreground mt-2">{user.bio}</p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Total Tasks</span>
              <span className="sm:hidden">Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats.totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats.pendingTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline">In Progress</span>
              <span className="sm:hidden">Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats.inProgressTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">Completed</span>
              <span className="sm:hidden">Done</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats.completedTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">User Tasks</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            All tasks assigned to this user ({tasks.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className={cn("w-full", isMobile ? "h-[400px]" : "h-[500px]")}>
            {tasksLoading ? (
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Loading tasks...</p>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No tasks found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base mb-1 truncate">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn(statusColors[task.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800")}>
                            {task.status}
                          </Badge>
                          <Badge className={cn(priorityColors[task.priority as keyof typeof priorityColors] || "bg-muted")}>
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account and all associated data.
              {userId && (
                <span className="block mt-2 font-medium">
                  User ID: {userId}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
