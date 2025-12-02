
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search, Edit2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminSubscriptionsPage() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const userData = await User.me();
      if (!userData) {
        User.redirectToLogin(window.location.pathname);
        return;
      }
      loadData();
    } catch (error) {
      console.error("Auth error:", error);
      User.redirectToLogin(window.location.pathname);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      if (userData.role !== 'admin') {
        setError("Access denied. Admin privileges required.");
        setIsLoading(false);
        return;
      }

      const allUsers = await User.list();
      setUsers(allUsers);
    } catch (err) {
      setError("Error loading data");
    }
    setIsLoading(false);
  };

  const handleEdit = (user) => {
    setEditingUser({...user});
  };

  const handleSave = async () => {
    try {
      await User.update(editingUser.id, {
        subscription_tier: editingUser.subscription_tier,
        subscription_status: editingUser.subscription_status,
        trial_end_date: editingUser.trial_end_date,
        subscription_notes: editingUser.subscription_notes,
        stripe_customer_id: editingUser.stripe_customer_id
      });
      setEditingUser(null);
      loadData(); // Reload data to reflect changes
    } catch (err) {
      setError("Error updating user");
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
  };

  // Quick upgrade button for current user
  const handleQuickUpgrade = async () => {
    if (!currentUser) return;
    try {
      await User.updateMyUserData({
        subscription_tier: 'professional',
        subscription_status: 'active'
      });
      alert('✅ Upgraded to Professional! Refresh the page to see changes or navigate away and come back.');
      // Optionally, you might want to force a refresh of currentUser to reflect the change immediately
      // without a full page reload, but for simplicity, an alert and suggestion to refresh is fine.
      loadData(); // Re-fetch all users and current user data to update state
    } catch (err) {
      setError("Error upgrading subscription");
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tierColors = {
    trial: "bg-gray-100 text-gray-800",
    beta: "bg-purple-100 text-purple-800",
    team_beta: "bg-pink-100 text-pink-800",
    budget: "bg-blue-100 text-blue-800",
    professional: "bg-indigo-100 text-indigo-800",
    team: "bg-green-100 text-green-800"
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    cancelled: "bg-yellow-100 text-yellow-800",
    expired: "bg-red-100 text-red-800"
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <Shield className="w-4 h-4" />
          <AlertDescription>
            Access denied. You must be an admin to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Subscription Management
            </h1>
            <p className="text-gray-600">Manage user subscriptions and payments</p>
          </div>
          
          {currentUser.subscription_tier === 'trial' && (
            <Button 
              onClick={handleQuickUpgrade}
              className="bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] hover:from-[#2d4a6f] hover:to-[#3b5998] text-white"
            >
              🎉 Activate My Professional Plan
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-xl">All Users ({filteredUsers.length})</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trial End</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={tierColors[user.subscription_tier || 'trial']}>
                          {(user.subscription_tier || 'trial').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[user.subscription_status || 'active']}>
                          {(user.subscription_status || 'active').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.trial_end_date 
                          ? format(new Date(user.trial_end_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {editingUser && (
          <Card className="shadow-lg border-2 border-[#1e3a5f]">
            <CardHeader className="border-b bg-blue-50">
              <CardTitle className="text-xl">Edit Subscription - {editingUser.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Subscription Tier</Label>
                  <Select
                    value={editingUser.subscription_tier || 'trial'}
                    onValueChange={(value) => setEditingUser({...editingUser, subscription_tier: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="beta">Beta (Professional Access)</SelectItem>
                      <SelectItem value="team_beta">Team Beta (Team Access)</SelectItem>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    💡 Beta = unlimited professional features | Team Beta = unlimited + team management
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Subscription Status</Label>
                  <Select
                    value={editingUser.subscription_status || 'active'}
                    onValueChange={(value) => setEditingUser({...editingUser, subscription_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Trial End Date</Label>
                  <Input
                    type="date"
                    value={editingUser.trial_end_date || ''}
                    onChange={(e) => setEditingUser({...editingUser, trial_end_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stripe Customer ID</Label>
                  <Input
                    value={editingUser.stripe_customer_id || ''}
                    onChange={(e) => setEditingUser({...editingUser, stripe_customer_id: e.target.value})}
                    placeholder="cus_..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={editingUser.subscription_notes || ''}
                  onChange={(e) => setEditingUser({...editingUser, subscription_notes: e.target.value})}
                  rows={3}
                  placeholder="Add any notes about this subscription..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
