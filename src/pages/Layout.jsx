

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Upload, Calendar, FileText, LogOut, Archive, Send } from "lucide-react";
import { getCurrentProfile, isAuthenticated, redirectToLogin, logout as supabaseLogout } from "@/lib/supabaseAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Upload Contract",
    url: createPageUrl("Upload"),
    icon: Upload,
  },
  {
    title: "Calendar",
    url: createPageUrl("Calendar"),
    icon: Calendar,
  },
  {
    title: "Archived Contracts",
    url: createPageUrl("ArchivedContracts"),
    icon: Archive,
  },
];

const toolsItems = [
  {
    title: "Client Updates",
    url: createPageUrl("ClientUpdates"),
    icon: Send,
  },
  {
    title: "Referrals",
    url: createPageUrl("Referrals"),
    icon: FileText,
  },
];

const adminItems = [
  {
    title: "Manage Subscriptions",
    url: createPageUrl("AdminSubscriptions"),
    icon: FileText,
  },
];

const settingsItems = [
  {
    title: "Brokerage Settings",
    url: createPageUrl("BrokerageSettings"),
    icon: FileText,
  },
  {
    title: "Team Management",
    url: createPageUrl("TeamManagement"),
    icon: FileText,
  },
  {
    title: "Reminder Settings",
    url: createPageUrl("ReminderSettings"),
    icon: FileText,
  },
  {
    title: "Privacy Policy",
    url: createPageUrl("Privacy"),
    icon: FileText,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [authError, setAuthError] = React.useState(null);

  // Public pages that don't need auth or sidebar
  const publicPages = ['Landing', 'Pricing', 'Privacy', 'Home', 'Login'];
  const isPublicPage = publicPages.includes(currentPageName);

  // Cache user data in sessionStorage for faster subsequent loads
  React.useEffect(() => {
    if (!isPublicPage) {
      loadUser();
    }
  }, [isPublicPage]);

  const loadUser = async () => {
    try {
      const cachedUser = sessionStorage.getItem('user_data');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }

      const authStatus = await isAuthenticated();
      if (!authStatus) {
        sessionStorage.removeItem('user_data');
        redirectToLogin(window.location.pathname);
        return;
      }

      const userData = await getCurrentProfile();
      if (!userData) {
        sessionStorage.removeItem('user_data');
        redirectToLogin(window.location.pathname);
        return;
      }

      setUser(userData);
      sessionStorage.setItem('user_data', JSON.stringify(userData));
      setAuthError(null);
    } catch (error) {
      console.error("❌ Error loading user:", error);
      setAuthError("Authentication error. Please try logging in again.");
      sessionStorage.removeItem('user_data');
      setTimeout(() => {
        redirectToLogin(window.location.pathname);
      }, 2000);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('user_data');
    sessionStorage.removeItem('contracts_cache');
    sessionStorage.removeItem('contracts_cache_time');
    await supabaseLogout(createPageUrl("Landing"));
  };

  // If it's a public page, just render children without sidebar or auth
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Show auth error if exists
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Otherwise, render with sidebar (authenticated pages)
  return (
    <SidebarProvider>
      <style>
        {`
          :root {
            --primary-navy: #1e3a5f;
            --primary-gold: #c9a961;
            --accent-blue: #2563eb;
            --text-dark: #1f2937;
            --text-light: #6b7280;
            --bg-light: #f9fafb;
          }
        `}
      </style>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">ContractFlowAI</h2>
                <p className="text-xs text-gray-500">Real Estate Manager</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-[#1e3a5f] transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url 
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-[#1e3a5f] font-semibold shadow-sm' 
                            : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tools
                </div>
                <SidebarMenu>
                  {toolsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-green-50 hover:text-green-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url 
                            ? 'bg-green-50 text-green-700 font-semibold shadow-sm' 
                            : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Settings
                </div>
                <SidebarMenu>
                  {settingsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url 
                            ? 'bg-purple-50 text-purple-700 font-semibold shadow-sm' 
                            : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            { (user?.role === 'admin' || user?.subscription_tier === 'team_beta') && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <div className="px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </div>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-xl mb-1 ${
                            location.pathname === item.url 
                              ? 'bg-red-50 text-red-700 font-semibold shadow-sm' 
                              : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-100 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 bg-gradient-to-br from-[#c9a961] to-[#b8935a] rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {user?.full_name || 'Agent'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-gray-900">ContractFlowAI</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

