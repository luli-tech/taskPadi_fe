import { useState } from "react";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageLayout } from "@/components/PageLayout";
import { User, Bell, Palette, Shield, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState({
    username: user?.name || "",
    email: user?.email || "",
  });
  const [notifications, setNotifications] = useState({
    taskReminders: true,
    chatMessages: true,
    aiSummary: true,
    emailNotifications: false,
  });
  const [appearance, setAppearance] = useState({
    theme: "system",
    compactMode: false,
  });

  const handleSaveProfile = () => {
    toast({ title: "Profile updated successfully" });
  };

  const handleSaveNotifications = () => {
    toast({ title: "Notification preferences saved" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full max-w-3xl"
    >
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
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
            value="profile" 
            className={cn(
              "flex items-center gap-2",
              "whitespace-nowrap",
              "min-w-fit",
              "px-3 py-2 lg:px-3 lg:py-1.5",
              "text-xs sm:text-sm"
            )}
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className={cn(
              "flex items-center gap-2",
              "whitespace-nowrap",
              "min-w-fit",
              "px-3 py-2 lg:px-3 lg:py-1.5",
              "text-xs sm:text-sm"
            )}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger 
            value="appearance" 
            className={cn(
              "flex items-center gap-2",
              "whitespace-nowrap",
              "min-w-fit",
              "px-3 py-2 lg:px-3 lg:py-1.5",
              "text-xs sm:text-sm"
            )}
          >
            <Palette className="h-4 w-4" />
            <span>Appearance</span>
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className={cn(
              "flex items-center gap-2",
              "whitespace-nowrap",
              "min-w-fit",
              "px-3 py-2 lg:px-3 lg:py-1.5",
              "text-xs sm:text-sm"
            )}
          >
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <Button onClick={handleSaveProfile} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Task Reminders</p>
                  <p className="text-sm text-muted-foreground">Get notified about upcoming tasks</p>
                </div>
                <Switch
                  checked={notifications.taskReminders}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, taskReminders: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Chat Messages</p>
                  <p className="text-sm text-muted-foreground">Notify on new messages</p>
                </div>
                <Switch
                  checked={notifications.chatMessages}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, chatMessages: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI Summary Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive AI-generated task summaries</p>
                </div>
                <Switch
                  checked={notifications.aiSummary}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, aiSummary: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailNotifications: checked })
                  }
                />
              </div>
              <Button onClick={handleSaveNotifications} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how TaskPadi looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((theme) => (
                    <Button
                      key={theme}
                      variant={appearance.theme === theme ? "default" : "outline"}
                      onClick={() => setAppearance({ ...appearance, theme })}
                      className="capitalize"
                    >
                      {theme}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact Mode</p>
                  <p className="text-sm text-muted-foreground">Reduce spacing in the interface</p>
                </div>
                <Switch
                  checked={appearance.compactMode}
                  onCheckedChange={(checked) =>
                    setAppearance({ ...appearance, compactMode: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </motion.div>
    </PageLayout>
  );
}
