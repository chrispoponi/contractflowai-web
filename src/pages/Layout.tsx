import { useMemo } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  Calendar,
  FileText,
  LogOut,
  Archive,
  Send,
  Users,
  Building2,
  Settings as SettingsIcon,
  BellRing,
  TimerReset,
  MessageSquare,
  ShieldCheck
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useAuth } from '@/components/providers/AuthProvider'

const ENABLE_CLIENT_UPDATES = (import.meta.env.VITE_ENABLE_CLIENT_UPDATES ?? 'false') === 'true'

const navigationItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Upload Contract',
    url: '/upload',
    icon: Upload
  },
  {
    title: 'Calendar',
    url: '/calendar',
    icon: Calendar
  },
  {
    title: 'Archived',
    url: '/contracts/archived',
    icon: Archive
  }
]

const toolsItems = [
  ...(ENABLE_CLIENT_UPDATES
    ? [
        {
          title: 'Client Updates',
          url: '/client-updates',
          icon: Send
        }
      ]
    : []),
  {
    title: 'Referrals',
    url: '/referrals',
    icon: FileText
  },
  {
    title: 'Timeline Generator',
    url: '/timeline',
    icon: TimerReset
  },
  {
    title: 'Feedback',
    url: '/feedback',
    icon: MessageSquare
  }
]

const managementItems = [
  {
    title: 'Teams',
    url: '/teams',
    icon: Users
  },
  {
    title: 'Organizations',
    url: '/organizations',
    icon: Building2
  },
  {
    title: 'Reminders',
    url: '/reminders',
    icon: BellRing
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: SettingsIcon
  }
]

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? 'chrispoponi@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const adminItems = [
  {
    title: 'Admin Users',
    url: '/admin/users',
    icon: ShieldCheck
  }
]

export default function Layout() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const isAdmin =
    user?.app_metadata?.role === 'admin' || (user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false)

  const initials = useMemo(() => {
    if (!user?.user_metadata?.full_name) return user?.email?.[0]?.toUpperCase() ?? 'U'
    return user.user_metadata.full_name
      .split(' ')
      .map((name: string) => name[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }, [user])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">ContractFlowAI</p>
                <p className="text-base font-semibold text-slate-900">Operations</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="h-5 w-5" />
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
                <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tools</p>
                <SidebarMenu>
                  {toolsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="h-5 w-5" />
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
                <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Organization</p>
                <SidebarMenu>
                  {managementItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="h-5 w-5" />
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
          <SidebarFooter className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.user_metadata?.full_name ?? 'Agent'}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-transparent p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
            <SidebarTrigger />
            <p className="text-base font-semibold text-slate-900">ContractFlowAI</p>
          </header>
          <main className="flex-1 overflow-y-auto bg-slate-50">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
