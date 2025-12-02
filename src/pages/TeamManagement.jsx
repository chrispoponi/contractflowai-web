
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Crown, UserPlus, Trash2, Shield, AlertCircle, MoreVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TeamManagementPage() {
  const [user, setUser] = React.useState(null);
  const [organization, setOrganization] = React.useState(null);
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  React.useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const userData = await base44.auth.me();
      if (!userData) {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      loadData();
    } catch (error) {
      console.error("Auth error:", error);
      base44.auth.redirectToLogin(window.location.pathname);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Check if user has permission to manage team
      const isAdmin = userData.role === 'admin';
      const isTeamLead = userData.organization_role === 'team_lead';

      if (!isAdmin && !isTeamLead) {
        // We allow users without these roles to still see the permission error message below.
        // The canManage check further down will handle the specific error messages.
        setIsLoading(false);
        return;
      }

      // Try to load organization and team members
      try {
        let allUsers = [];
        let allOrgs = [];

        // Admins can see everything
        if (isAdmin) {
          try {
            allOrgs = await base44.entities.Organization.list();
            allUsers = await base44.entities.User.list();
          } catch (err) {
            console.error("Admin list error:", err);
            // If Organization entity doesn't exist yet, just show users
            allUsers = await base44.entities.User.list();
            allOrgs = [];
          }
          
          if (allOrgs.length > 0) {
            setOrganization(allOrgs[0]);
            const members = allUsers.filter(u => u.organization_id === allOrgs[0].id);
            setTeamMembers(members);
          } else {
            setOrganization(null);
            setTeamMembers(allUsers);
          }
        } else if (isTeamLead && userData.organization_id) {
          // Team leads can only see their org
          try {
            allOrgs = await base44.entities.Organization.list();
            allUsers = await base44.entities.User.list();
            
            const myOrg = allOrgs.find(o => o.id === userData.organization_id);
            setOrganization(myOrg);
            
            const members = allUsers.filter(u => u.organization_id === userData.organization_id);
            setTeamMembers(members);
          } catch (err) {
            console.error("Team lead list error:", err);
            setError("Unable to load team data. You may not have permission.");
          }
        } else {
          setError("You're not part of a team yet");
        }
      } catch (err) {
        console.error("Error loading team data:", err);
        setError(`Error loading team: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Load data error:", err);
      setError(`Error: ${err.message || 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    setError(null);
    setSuccess(null);

    try {
      if (organization && teamMembers.length >= organization.max_members) {
        setError(`Team is full (${organization.max_members} members max). Upgrade to add more.`);
        return;
      }

      const allUsers = await base44.entities.User.list();
      const existingUser = allUsers.find(u => u.email === inviteEmail);

      if (existingUser && existingUser.organization_id) {
        setError("This user is already part of a team");
        return;
      }

      setSuccess(`Invite sent to ${inviteEmail}! They'll be added when they sign up.`);
      setInviteEmail("");
      
    } catch (err) {
      console.error("Invite error:", err);
      setError(`Error sending invite: ${err.message || 'Unknown error'}`);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!confirm(`Remove ${member.full_name} from organization?\n\nThey will lose organization access but their account and data will remain.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await base44.entities.User.update(member.id, {
        organization_id: null,
        organization_role: "member",
        subscription_tier: "trial"
      });
      setSuccess(`${member.full_name} removed from organization`);
      await loadData();
    } catch (err) {
      console.error("Error removing member:", err);
      setError(`Error removing team member: ${err.message || 'Permission denied'}`);
    }
  };

  const handleDeleteUser = async (member) => {
    if (!confirm(`⚠️ PERMANENTLY DELETE ${member.full_name}?\n\nEmail: ${member.email}\n\nThis will DELETE:\n- Their account\n- ALL their contracts\n- ALL their data\n\nThis CANNOT be undone!`)) {
      return;
    }

    const confirmText = prompt(`Type "DELETE ${member.email}" to confirm:`);
    if (confirmText !== `DELETE ${member.email}`) {
      setError("Deletion cancelled - confirmation text did not match");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await base44.entities.User.delete(member.id);
      setSuccess(`User ${member.full_name} has been permanently deleted`);
      await loadData();
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(`Error deleting user: ${err.message || 'Permission denied. Only admins can delete users.'}`);
    }
  };

  const isTeamLead = user?.organization_role === "team_lead";
  const isAdmin = user?.role === "admin";
  const hasTeamAccess = user?.subscription_tier === 'team' || user?.subscription_tier === 'team_beta';
  const canManage = (isTeamLead || isAdmin) && hasTeamAccess;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <Shield className="w-4 h-4" />
          <AlertDescription>
            {!hasTeamAccess 
              ? "Team management requires a Team or Team Beta subscription. Please upgrade to access this feature."
              : "You don't have permission to manage team members. Only team leads and admins can access this page."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            👥 Team Management {isAdmin && <Badge className="bg-purple-600 text-white ml-2">Admin View</Badge>}
          </h1>
          <p className="text-gray-600">Manage your team members and invitations</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Organization Info */}
        {organization && (
          <Card className="shadow-lg border-l-4 border-[#1e3a5f]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#c9a961]" />
                {organization.organization_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <Badge className="bg-purple-100 text-purple-800 mt-1">
                    {organization.plan_tier?.toUpperCase() || 'TEAM'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Members</p>
                  <p className="font-semibold text-gray-900">{teamMembers.length} / {organization.max_members || '10'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={
                    organization.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }>
                    {organization.subscription_status?.toUpperCase() || 'ACTIVE'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invite Member */}
        {canManage && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Invite Team Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="colleague@example.com"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                />
                <Button onClick={handleInvite} className="bg-[#1e3a5f]">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members List */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1e3a5f]" />
              Team Members ({teamMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No team members yet</p>
                <p className="text-sm mt-2">Invite your first team member above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-[#1e3a5f] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {member.full_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{member.full_name || 'User'}</p>
                          {member.role === 'admin' && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {member.organization_role === 'team_lead' && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Crown className="w-3 h-3 mr-1" />
                              Team Lead
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        {member.brokerage_name && (
                          <p className="text-xs text-gray-400 mt-1">{member.brokerage_name}</p>
                        )}
                      </div>
                    </div>

                    {canManage && member.id !== user.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {isTeamLead && (
                            <DropdownMenuItem onClick={() => handleRemoveMember(member)}>
                              Remove from Team
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => handleRemoveMember(member)}>
                                Remove from Team
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(member)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User Permanently
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
