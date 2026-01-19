import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGetAllUsersQuery } from "@/store/api/usersApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Shield, 
  User,
  MessageSquare,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMemo } from "react";

export default function ChatUserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const { 
    data: allUsersData, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery(
    { page: 1, limit: 100 },
    {
      pollingInterval: 30000,
    }
  );

  const allUsers = useMemo(() => {
    if (!allUsersData) return [];
    if (Array.isArray(allUsersData)) return allUsersData;
    if ('data' in allUsersData) return allUsersData.data;
    return [];
  }, [allUsersData]);

  const user = useMemo(() => {
    if (!userId) return null;
    return allUsers.find(u => u.id === userId) || null;
  }, [userId, allUsers]);

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p>Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/chat")}
            className={cn(isMobile && "h-9 w-9")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>User Not Found</h1>
            <p className="text-sm text-muted-foreground mt-1">The user you're looking for doesn't exist</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>User not found</p>
          </CardContent>
        </Card>
      </motion.div>
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
            onClick={() => navigate("/chat")}
            className={cn(isMobile && "h-9 w-9")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>Contact Info</h1>
            <p className="text-sm text-muted-foreground mt-1">View details for {user.username}</p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 pb-6 border-b">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {user.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-2xl font-semibold">{user.username}</h3>
              {user.role && (
                <p className="text-sm text-muted-foreground capitalize mt-1">{user.role}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                <Mail className="h-3 w-3" />
                Email
              </Label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            
            {user.bio && (
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                  <User className="h-3 w-3" />
                  Bio
                </Label>
                <p className="text-sm">{user.bio}</p>
              </div>
            )}

            {user.created_at && (
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                  <Calendar className="h-3 w-3" />
                  Member Since
                </Label>
                <p className="text-sm">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-2">Status</Label>
                <div>
                  {user.is_active !== false ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Activity className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
              {user.is_admin && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2">Role</Label>
                  <div>
                    <Badge variant="default" className="bg-primary">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => navigate(`/chat?chat=${userId}`)}
          className="w-full sm:w-auto"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Message
        </Button>
      </div>
    </motion.div>
  );
}
