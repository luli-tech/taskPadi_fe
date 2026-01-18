import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
  Task,
  TaskStatus,
  TaskPriority,
} from "@/store/api/tasksApi";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  Clock,
  Filter,
  CheckCircle2,
  Circle,
  AlertCircle,
  Archive
} from "lucide-react";

const priorityColors = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Urgent: "bg-destructive/10 text-destructive",
};

const statusIcons = {
  Pending: Circle,
  InProgress: Clock,
  Completed: CheckCircle2,
  Archived: Archive,
};

export default function Tasks() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<{ status?: TaskStatus; priority?: TaskPriority }>({});

  const { data: tasks = [], isLoading } = useGetTasksQuery(filters);
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createTask({
        title: formData.get("title") as string,
        description: formData.get("description") as string || undefined,
        priority: formData.get("priority") as TaskPriority,
        due_date: formData.get("due_date") ? new Date(formData.get("due_date") as string).toISOString() : undefined,
        reminder_time: formData.get("reminder_time") ? new Date(formData.get("reminder_time") as string).toISOString() : undefined,
      }).unwrap();
      setIsCreateOpen(false);
      toast.success("Task created successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create task");
    }
  };

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;

    const formData = new FormData(e.currentTarget);
    try {
      await updateTask({
        id: editingTask.id,
        data: {
          title: formData.get("title") as string,
          description: formData.get("description") as string || undefined,
          priority: formData.get("priority") as TaskPriority,
          due_date: formData.get("due_date") ? new Date(formData.get("due_date") as string).toISOString() : undefined,
          reminder_time: formData.get("reminder_time") ? new Date(formData.get("reminder_time") as string).toISOString() : undefined,
        },
      }).unwrap();
      setEditingTask(null);
      toast.success("Task updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update task");
    }
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try {
      await updateTaskStatus({ id, status }).unwrap();
      toast.success("Task status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(id).unwrap();
        toast.success("Task deleted successfully");
      } catch {
        toast.error("Failed to delete task");
      }
    }
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const StatusIcon = statusIcons[task.status];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        layout
      >
        <Card className="shadow-custom-md hover:shadow-custom-lg transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <StatusIcon className="w-5 h-5 text-muted-foreground" />
                  {task.title}
                </CardTitle>
                {task.description && (
                  <CardDescription className="mt-2">{task.description}</CardDescription>
                )}
              </div>
              <Badge className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(task.due_date).toLocaleDateString()}
                </div>
              )}
              {task.reminder_time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(task.reminder_time).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={task.status}
                onValueChange={(status: TaskStatus) => handleStatusChange(task.id, status)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setEditingTask(task)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const TaskForm = ({ task, onSubmit, isLoading }: { task?: Task | null; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; isLoading: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={task?.title} required placeholder="Enter task title" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={task?.description} placeholder="Enter task description" rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue={task?.priority || "Medium"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            name="due_date"
            type="datetime-local"
            defaultValue={task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminder_time">Reminder Time</Label>
        <Input
          id="reminder_time"
          name="reminder_time"
          type="datetime-local"
          defaultValue={task?.reminder_time ? new Date(task.reminder_time).toISOString().slice(0, 16) : ""}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditingTask(null); }}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : task ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
  );

  const groupedTasks = {
    Pending: tasks.filter((t) => t.status === "Pending"),
    InProgress: tasks.filter((t) => t.status === "InProgress"),
    Completed: tasks.filter((t) => t.status === "Completed"),
    Archived: tasks.filter((t) => t.status === "Archived"),
  };

  return (
    <PageLayout title="Tasks">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Tasks</h1>
            <p className="text-muted-foreground text-sm">Manage and track your tasks</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Fill in the details to create a new task</DialogDescription>
              </DialogHeader>
              <TaskForm onSubmit={handleCreateTask} isLoading={isCreating} />
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-custom-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(value) => setFilters({ ...filters, priority: value === "all" ? undefined : value as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? undefined : value as TaskStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="Pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(groupedTasks).map(([status, statusTasks]) => (
              <TabsTrigger key={status} value={status} className="relative">
                {status.replace(/([A-Z])/g, " $1").trim()}
                <Badge variant="secondary" className="ml-2">{statusTasks.length}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(groupedTasks).map(([status, statusTasks]) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : statusTasks.length === 0 ? (
                <Card className="shadow-custom-md">
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>No {status.toLowerCase()} tasks</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <AnimatePresence>
                  <div className="grid gap-4">
                    {statusTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Update the task details</DialogDescription>
            </DialogHeader>
            <TaskForm task={editingTask} onSubmit={handleUpdateTask} isLoading={isUpdating} />
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
