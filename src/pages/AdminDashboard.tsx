import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { useLogoutMutation } from "@/store/api/authApi";
import { logout } from "@/store/slices/authSlice";
import { useGetUsersQuery, useDeleteUserMutation, useUpdateUserMutation, useGetAllTasksQuery } from "@/store/api/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  CheckSquare, 
  Trash2, 
  Edit, 
  Search, 
  Shield, 
  User,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  Mail,
  Calendar,
  Activity,
  BarChart3,
  Filter,
  LogOut
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const priorityColors = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Urgent: "bg-destructive/10 text-destructive",
};

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  InProgress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logoutApi] = useLogoutMutation();
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery();
  const { data: allTasksData, isLoading: tasksLoading } = useGetAllTasksQuery();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) {
        await logoutApi({ refresh_token: refreshToken }).unwrap();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    dispatch(logout());
    navigate("/auth");
  };

  // Extract users from paginated response
  const users = useMemo(() => {
    if (!usersData) return [];
    if (Array.isArray(usersData)) return usersData;
    if ('data' in usersData) return usersData.data;
    return [];
  }, [usersData]);

  // Extract tasks from paginated response
  const allTasks = useMemo(() => {
    if (!allTasksData) return [];
    if (Array.isArray(allTasksData)) return allTasksData;
    if ('data' in allTasksData) return allTasksData.data;
    return [];
  }, [allTasksData]);

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = useMemo(() => {
    if (taskFilter === "all") return allTasks;
    return allTasks.filter((task: any) => task.status === taskFilter);
  }, [allTasks, taskFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalAdmins = users.filter((u) => u.role === "admin" || u.is_admin).length;
    const activeUsers = users.filter((u) => u.is_active !== false).length;
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: any) => t.status === "Completed").length;
    const pendingTasks = allTasks.filter((t: any) => t.status === "Pending").length;
    const inProgressTasks = allTasks.filter((t: any) => t.status === "InProgress").length;
    
    return {
      totalUsers,
      totalAdmins,
      activeUsers,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }, [users, allTasks]);

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId).unwrap();
      toast({ title: "User deleted successfully" });
      setIsDeleteDialogOpen(false);
      setDeleteUserId(null);
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.data?.message || error?.message || "Failed to delete user";
      toast({ title: "Failed to delete user", description: errorMessage, variant: "destructive" });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const updateData: any = {};
      if (editingUser.username !== undefined) updateData.username = editingUser.username;
      if (editingUser.email !== undefined) updateData.email = editingUser.email;
      if (editingUser.is_admin !== undefined) updateData.is_admin = editingUser.is_admin;
      if (editingUser.is_active !== undefined) updateData.is_active = editingUser.is_active;

      await updateUser({ userId: editingUser.id, data: updateData }).unwrap();
      toast({ title: "User updated successfully" });
      setEditingUser(null);
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.data?.message || error?.message || "Failed to update user";
      toast({ title: "Failed to update user", description: errorMessage, variant: "destructive" });
    }
  };

  const openDeleteDialog = (userId: string) => {
    setDeleteUserId(userId);
    setIsDeleteDialogOpen(true);
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      change: "+12%",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      change: "+8%",
    },
    {
      title: "Total Tasks",
      value: stats.totalTasks,
      icon: CheckSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      change: "+15%",
    },
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      change: "+5%",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage users, tasks, and system overview</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="secondary" className={cn("w-fit text-xs", isMobile && "hidden sm:flex")}>
              <Shield className="w-3 h-3 mr-1" />
              Admin Access
            </Badge>
            <Button
              variant="outline"
              onClick={handleLogout}
              className={cn("gap-2", isMobile && "h-9 px-3 text-sm")}
            >
              <LogOut className="h-4 w-4" />
              <span className={cn(isMobile && "hidden sm:inline")}>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600 dark:text-green-400">{stat.change}</span> from last month
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Task Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalTasks > 0 ? Math.round((stats.pendingTasks / stats.totalTasks) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inProgressTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalTasks > 0 ? Math.round((stats.inProgressTasks / stats.totalTasks) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className={cn(
          "w-full",
          "flex lg:inline-flex",
          "overflow-x-auto",
          "lg:overflow-visible",
          "gap-1",
          "h-auto lg:h-10",
          "p-1",
          "justify-start"
        )}>
          <TabsTrigger 
            value="users" 
            className={cn(
              "flex items-center gap-2",
              "whitespace-nowrap",
              "min-w-fit",
              "px-4 py-2 lg:px-3 lg:py-1.5",
              "text-xs sm:text-sm"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Users ({users.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="tasks" 
            className={cn(
              "flex items-center gap-2",
              "whitespace-nowrap",
              "min-w-fit",
              "px-4 py-2 lg:px-3 lg:py-1.5",
              "text-xs sm:text-sm"
            )}
          >
            <CheckSquare className="h-4 w-4" />
            <span>All Tasks ({allTasks.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">User Management</CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1">View and manage all system users</CardDescription>
              </div>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className={cn("w-full", isMobile ? "h-[400px]" : "h-[500px]")}>
                {isMobile ? (
                  // Mobile: List/Card View with all columns
                  <div className="space-y-0">
                    {/* Headers */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-2 py-2 border-b text-xs font-medium text-muted-foreground">
                      <span>User</span>
                      <span>Role</span>
                      <span>Status</span>
                      <span className="hidden sm:inline">Created</span>
                      <span>Actions</span>
                    </div>
                    
                    {/* User List */}
                    {usersLoading ? (
                      <div className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <p className="text-sm text-muted-foreground">Loading users...</p>
                        </div>
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No users found</p>
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-2 py-3 border-b hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-primary">
                                {user.username?.charAt(0).toUpperCase() || "U"}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate text-sm">{user.username}</div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center min-w-0">
                            <Badge 
                              variant={user.role === "admin" || user.is_admin ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0.5 whitespace-nowrap"
                            >
                              {user.role === "admin" || user.is_admin ? (
                                <Shield className="w-2.5 h-2.5 mr-0.5" />
                              ) : (
                                <User className="w-2.5 h-2.5 mr-0.5" />
                              )}
                              <span className="hidden xs:inline">
                                {user.role === "admin" || user.is_admin ? "Admin" : "User"}
                              </span>
                            </Badge>
                          </div>
                          <div className="flex items-center min-w-0">
                            <Badge 
                              variant={user.is_active !== false ? "outline" : "secondary"}
                              className="text-[10px] px-1.5 py-0.5 whitespace-nowrap"
                            >
                              {user.is_active !== false ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground hidden sm:flex">
                            <Calendar className="h-3 w-3" />
                            <span className="truncate">{new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingUser({ ...user });
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
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
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(user.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  // Desktop: Table View
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              <p className="text-sm text-muted-foreground">Loading users...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No users found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow 
                            key={user.id}
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-primary">
                                    {user.username?.charAt(0).toUpperCase() || "U"}
                                  </span>
                                </div>
                                {user.username}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {user.email}
                              </div>
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.is_active !== false ? "outline" : "secondary"}>
                                {user.is_active !== false ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingUser({ ...user });
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
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
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog(user.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>All Tasks</CardTitle>
                  <CardDescription>View and manage all tasks across the system</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={taskFilter} onValueChange={setTaskFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="InProgress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className={cn("w-full", isMobile ? "h-[400px]" : "h-[500px]")}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-sm text-muted-foreground">Loading tasks...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>No tasks found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task: any) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <Badge className={cn(statusColors[task.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800")}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(priorityColors[task.priority as keyof typeof priorityColors] || "bg-muted")}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  {task.user?.username?.charAt(0).toUpperCase() || "U"}
                                </span>
                              </div>
                              {task.user?.username || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {task.due_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No date</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account and all associated data.
              {deleteUserId && (
                <span className="block mt-2 font-medium">
                  User ID: {deleteUserId}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteUserId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
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
