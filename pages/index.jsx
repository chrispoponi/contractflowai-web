import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Upload from "./Upload";

import Calendar from "./Calendar";

import ContractDetails from "./ContractDetails";

import Pricing from "./Pricing";

import AdminSubscriptions from "./AdminSubscriptions";

import ReminderSettings from "./ReminderSettings";

import Privacy from "./Privacy";

import ArchivedContracts from "./ArchivedContracts";

import BrokerageSettings from "./BrokerageSettings";

import Landing from "./Landing";

import TeamManagement from "./TeamManagement";

import Home from "./Home";

import DebugReminders from "./DebugReminders";

import ClientUpdates from "./ClientUpdates";

import Referrals from "./Referrals";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Upload: Upload,
    
    Calendar: Calendar,
    
    ContractDetails: ContractDetails,
    
    Pricing: Pricing,
    
    AdminSubscriptions: AdminSubscriptions,
    
    ReminderSettings: ReminderSettings,
    
    Privacy: Privacy,
    
    ArchivedContracts: ArchivedContracts,
    
    BrokerageSettings: BrokerageSettings,
    
    Landing: Landing,
    
    TeamManagement: TeamManagement,
    
    Home: Home,
    
    DebugReminders: DebugReminders,
    
    ClientUpdates: ClientUpdates,
    
    Referrals: Referrals,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Upload" element={<Upload />} />
                
                <Route path="/Calendar" element={<Calendar />} />
                
                <Route path="/ContractDetails" element={<ContractDetails />} />
                
                <Route path="/Pricing" element={<Pricing />} />
                
                <Route path="/AdminSubscriptions" element={<AdminSubscriptions />} />
                
                <Route path="/ReminderSettings" element={<ReminderSettings />} />
                
                <Route path="/Privacy" element={<Privacy />} />
                
                <Route path="/ArchivedContracts" element={<ArchivedContracts />} />
                
                <Route path="/BrokerageSettings" element={<BrokerageSettings />} />
                
                <Route path="/Landing" element={<Landing />} />
                
                <Route path="/TeamManagement" element={<TeamManagement />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/DebugReminders" element={<DebugReminders />} />
                
                <Route path="/ClientUpdates" element={<ClientUpdates />} />
                
                <Route path="/Referrals" element={<Referrals />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}