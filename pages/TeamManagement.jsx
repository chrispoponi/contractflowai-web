// src/pages/TeamManagement.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Mail,
  Crown,
  UserPlus,
  Trash2,
  Shield,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
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
  const [userProfile, setUserProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      await loadTeamData(profile);
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message || "Authentication error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamData = async (profile) => {
    try {
      const isAdmin = profile.role === "admin";
      const isTeamLead = profile.organization_role === "team_lead";

      let org = null;
      let members = [];

      if (isAdmin) {
        const { data: orgs, error: orgErr } = await supabase
          .from("organizations")
          .select("*");

        if (orgErr) throw orgErr;

        // For now: pick first org or none
        org = orgs?.[0] || null;

        if (org) {
          const { data: users, error: usersErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("organization_id", org.id);

          if (usersErr) throw usersErr;
          members = users || [];
        } else {
          // No orgs yet: just show all profiles as "team"
          const { data: users, error: usersErr } = await supabase
            .from("profiles")
            .select("*");
          if (usersErr) throw usersErr;
          members = users || [];
        }
      } else if (isTeamLead && profile.organization_id) {
        const { data: orgData, error: orgErr } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();

        if (orgErr) throw orgErr;
        org = orgData;

        const { data: users, error: usersErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("organization_id", profile.organization_id);

        if (usersErr) throw usersErr;
        members = users || [];
      } else {
        setError("You're not part of a team yet or lack permissions.");
      }

      setOrganization(org);
      setTeamMembers(members);
    } catch (err) {
      console.error("Error loading team data:", err);
      setError(err.message || "Error loading team data");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !userProfile) return;

    setError(null);
    setSuccess(null);

    try {
      if (organization && teamMembers.length >= (organization.max_members || 10)) {
        setError(
          `Team is full (${organization.max_members || 10} members max). Upgrade to add more.`
        );
        return;
      }

      // See if user already exists in profiles
      const { data: existing, error: existingErr } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("email", inviteEmail.toLowerCase())
        .maybeSingle();

      if (existingErr && existingErr.code !== "PGRST116") {
        // PGRST116 = no rows
        throw existingErr;
      }

      if (existing && existing.organization_id) {
        setError("This user is already part of a team.");
        return;
      }

      // Store a pending invite
      const { error: inviteErr } = await supabase.from("team_invites").insert({
        organization_id: organization ? organization.id : null,
        email: inviteEmail.toLowerCase(),
        status: "pending",
      });

      if (inviteErr) throw inviteErr;

      // You can later add an Edge Function to actually send the email.
      setSuccess(
        `Invite recorded for ${inviteEmail}. They’ll be added when they sign up.`
      );
      setInviteEmail("");
    } catch (err) {
      console.error("Invite error:", err);
      setError(err.message || "Error sending invite");
    }
  };

  const handleRemoveMember = async (member) => {
    if (
      !window.confirm(
        `Remove ${member.full_name || member.email} from organization?\n\nThey will lose organization access but their account and data will remain.`
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          organization_id: null,
          organization_role: "member",
        })
        .eq("id", member.id);

      if (updateErr) throw updateErr;

      setSuccess(`${member.full_name || member.email} removed from organization.`);
      await loadTeamData(userProfile);
    } catch (err) {
      console.error("Error removing member:", err);
      setError(err.message || "Error removing team member");
    }
  };

  const handleDeleteUser = async (member) => {
    if (
      !window.confirm(
        `⚠️ PERMANENTLY DELETE ${member.full_name || member.email}?\n\nThis will remove their account and all related data.`
      )
    ) {
      return;
    }

    const confirmText = window.prompt(
      `Type "DELETE ${member.email}" to confirm:`
    );
    if (confirmText !== `DELETE ${member.email}`) {
      setError("Deletion cancelled - confirmation text did not match");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // IMPORTANT:
      // You cannot delete auth users directly from the browser.
      // This calls a Supabase Edge Function you create with service-role permissions.
      const { error: fnError } = await supabase.functions.invoke(
        "admin-delete-user",
        {
          body: { userId: member.id },
        }
      );

      if (fnError) throw fnError;

      setSuccess(`User ${member.full_name || member.email} has been deleted.`);
      await loadTeamData(userProfile);
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(
        err.message ||
          "Error deleting user. Ensure admin-delete-user function exists and you have permissions."
      );
    }
  };

  const isTeamLead = userProfile?.organization_role === "team_lead";
  const isAdmin = userProfile?.role === "admin";
  const hasTeamAccess =
    userProfile?.subscription_tier === "team" ||
    userProfile?.subscription_tier === "team_beta";
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
            👥 Team Management{" "}
            {isAdmin && (
              <Badge className="bg-purple-600 text-white ml-2">
                Admin View
              </Badge>
            )}
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
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
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
                    {organization.plan_tier?.toUpperCase() || "TEAM"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Members</p>
                  <p className="font-semibold text-gray-900">
                    {teamMembers.length} / {organization.max_members || "10"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge
                    className={
                      organization.subscription_status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {organization.subscription_status?.toUpperCase() || "ACTIVE"}
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
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
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
                <p className="text-sm mt-2">
                  Invite your first team member above
                </p>
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
                          {member.full_name?.[0]?.toUpperCase() ||
                            member.email?.[0]?.toUpperCase() ||
                            "U"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {member.full_name || "User"}
                          </p>
                          {member.role === "admin" && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {member.organization_role === "team_lead" && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Crown className="w-3 h-3 mr-1" />
                              Team Lead
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        {member.brokerage_name && (
                          <p className="text-xs text-gray-400 mt-1">
                            {member.brokerage_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {canManage && member.id !== userProfile.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member)}
                          >
                            Remove from Team
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
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
