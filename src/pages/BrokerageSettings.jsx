
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { BrokerageChecklistTemplate } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Save, Trash2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const POPULAR_BROKERAGES = [
  "REAL Broker",
  "Keller Williams",
  "RE/MAX",
  "Coldwell Banker",
  "eXp Realty",
  "Berkshire Hathaway HomeServices",
  "Century 21",
  "Sotheby's International Realty",
  "Compass",
  "Redfin",
  "HomeSmart",
  "EXIT Realty",
  "Better Homes and Gardens Real Estate",
  "Howard Hanna",
  "Long & Foster"
];

const CATEGORY_LABELS = {
  pre_contract: "📋 Pre-Contract",
  under_contract: "🏠 Under Contract",
  inspections: "🔍 Inspections",
  financing: "💰 Financing",
  closing: "🎉 Closing"
};

export default function BrokerageSettingsPage() {
  const [user, setUser] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [allBrokerages, setAllBrokerages] = useState([]);
  const [selectedBrokerage, setSelectedBrokerage] = useState("");
  const [customBrokerage, setCustomBrokerage] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: "",
    description: "",
    category: "under_contract",
    order_index: 1,
    is_required: false
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      // If authenticated, then proceed to load the rest of the data
      loadData();
    } catch (error) {
      console.error("Auth error:", error);
      User.redirectToLogin(window.location.pathname);
    }
  };

  const loadData = async () => {
    try {
      const userData = await User.me(); // Re-fetch user data to ensure it's up-to-date after auth check
      setUser(userData);
      
      const allTemplates = await BrokerageChecklistTemplate.list(); // Fetch all templates once for both admin/non-admin
      const uniqueBrokeragesFromTemplates = [...new Set(allTemplates.map(t => t.brokerage_name))];
      // Populate allBrokerages with popular ones and all unique ones found in templates
      setAllBrokerages([...POPULAR_BROKERAGES, ...uniqueBrokeragesFromTemplates.filter(b => !POPULAR_BROKERAGES.includes(b))]);

      let brokerageToDisplay = userData.brokerage_name || ""; // This will be the brokerage whose templates are shown by default

      // ADMIN OVERRIDE: Admins can manage all brokerages.
      // If admin doesn't have a default brokerage set, they start with an empty view
      // but have all brokerages available in the dropdown.
      if (userData.role === 'admin') {
        if (!brokerageToDisplay) {
            setSelectedBrokerage("");
            setUseCustom(false);
            setCustomBrokerage("");
            setTemplates([]); // No default templates if no brokerage specified for admin
            return; // Admin without a default brokerage is configured, exit loadData.
        }
      } 
      
      // This part applies to both regular users and admins with a specified brokerage_name
      setSelectedBrokerage(brokerageToDisplay);
      
      // Determine if the brokerageToDisplay is a custom one
      if (brokerageToDisplay && !POPULAR_BROKERAGES.includes(brokerageToDisplay)) {
        setUseCustom(true);
        setCustomBrokerage(brokerageToDisplay);
      } else {
        setUseCustom(false); // Ensure custom is off if not a custom brokerage
        setCustomBrokerage(""); // Clear custom brokerage name
      }

      // Filter templates for the currently selected/display brokerage
      if (brokerageToDisplay) {
        const brokerageTemplates = allTemplates.filter(t => 
          t.brokerage_name === brokerageToDisplay
        );
        setTemplates(brokerageTemplates.sort((a, b) => {
          if (a.category !== b.category) {
            return Object.keys(CATEGORY_LABELS).indexOf(a.category) - Object.keys(CATEGORY_LABELS).indexOf(b.category);
          }
          return a.order_index - b.order_index;
        }));
      } else {
          setTemplates([]); // No templates if no brokerage is currently selected/to display
      }

    } catch (error) {
      console.error("Error loading data:", error);
      // If error during data load, but auth passed, maybe just display empty state
      // Or handle specific errors if necessary. For now, just log.
    }
  };

  const handleSaveBrokerage = async () => {
    try {
      const brokerageToSave = useCustom ? customBrokerage : selectedBrokerage;
      if (!brokerageToSave.trim()) {
        alert("Please enter a brokerage name");
        return;
      }
      
      await User.updateMyUserData({ brokerage_name: brokerageToSave });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error("Error saving brokerage:", error);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.title.trim()) return;
    
    const brokerageToUse = useCustom ? customBrokerage : selectedBrokerage;
    if (!brokerageToUse) {
      alert("Please select or enter a brokerage first");
      return;
    }

    try {
      await BrokerageChecklistTemplate.create({
        brokerage_name: brokerageToUse,
        ...newTemplate
      });
      setNewTemplate({
        title: "",
        description: "",
        category: "under_contract",
        order_index: 1,
        is_required: false
      });
      setShowAddForm(false);
      loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error("Error adding template:", error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (confirm("Delete this checklist template?")) {
      try {
        await BrokerageChecklistTemplate.delete(templateId);
        loadData(); // Reload data to reflect changes
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {});

  const currentBrokerageName = useCustom ? customBrokerage : selectedBrokerage;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            🏢 Brokerage Settings
          </h1>
          <p className="text-gray-600">Set your brokerage and customize transaction checklists</p>
        </div>

        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Settings saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Select Brokerage */}
        <Card className="shadow-lg border-l-4 border-[#1e3a5f]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1e3a5f]" />
              My Brokerage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant={!useCustom ? "default" : "outline"}
                onClick={() => setUseCustom(false)}
                size="sm"
              >
                Select from List
              </Button>
              <Button
                variant={useCustom ? "default" : "outline"}
                onClick={() => setUseCustom(true)}
                size="sm"
              >
                Enter Custom Brokerage
              </Button>
            </div>

            {!useCustom ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Your Brokerage
                </label>
                <Select
                  value={selectedBrokerage}
                  onValueChange={setSelectedBrokerage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your brokerage" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                      Popular Brokerages
                    </div>
                    {POPULAR_BROKERAGES.map(brokerage => (
                      <SelectItem key={brokerage} value={brokerage}>
                        {brokerage}
                      </SelectItem>
                    ))}
                    {allBrokerages.filter(b => !POPULAR_BROKERAGES.includes(b)).length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase border-t mt-2">
                          Other Brokerages
                        </div>
                        {allBrokerages
                          .filter(b => !POPULAR_BROKERAGES.includes(b))
                          .map(brokerage => (
                            <SelectItem key={brokerage} value={brokerage}>
                              {brokerage}
                            </SelectItem>
                          ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Enter Brokerage Name
                </label>
                <Input
                  placeholder="e.g., Local Realty Group"
                  value={customBrokerage}
                  onChange={(e) => setCustomBrokerage(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  💡 Enter any brokerage name - it will be added to the list for future use
                </p>
              </div>
            )}

            <Button onClick={handleSaveBrokerage} className="bg-[#1e3a5f]">
              <Save className="w-4 h-4 mr-2" />
              Save Brokerage
            </Button>
          </CardContent>
        </Card>

        {/* Checklist Templates */}
        {currentBrokerageName && (
          <Card className="shadow-lg border-l-4 border-blue-500">
            <CardHeader className="border-b bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl mb-1">
                    {currentBrokerageName} - Transaction Checklist
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Customize your brokerage's standard checklist items
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  size="sm"
                  className="bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {showAddForm && (
                <div className="mt-4 p-4 bg-white rounded-lg border space-y-3">
                  <Input
                    placeholder="Checklist item title *"
                    value={newTemplate.title}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={newTemplate.category}
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CATEGORY_LABELS).map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Order"
                      value={newTemplate.order_index}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, order_index: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddTemplate} size="sm" className="bg-blue-600">
                      Add to Checklist
                    </Button>
                    <Button onClick={() => setShowAddForm(false)} size="sm" variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No checklist items yet</p>
                  <p className="text-sm">Click "Add Item" to create your brokerage's standard checklist</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(CATEGORY_LABELS).map(category => {
                    const categoryTemplates = groupedTemplates[category] || [];
                    if (categoryTemplates.length === 0) return null;

                    return (
                      <div key={category}>
                        <h3 className="font-semibold text-lg text-gray-900 mb-3">
                          {CATEGORY_LABELS[category]}
                        </h3>
                        <div className="space-y-2">
                          {categoryTemplates.map(template => (
                            <div
                              key={template.id}
                              className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{template.title}</p>
                                  {template.is_required && (
                                    <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">#{template.order_index}</Badge>
                                </div>
                                {template.description && (
                                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="text-gray-400 hover:text-red-600 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Select or enter your brokerage</strong> - Choose from popular list or type any custom name
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Customize checklist items</strong> - Add your brokerage's required steps
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Auto-populate</strong> - New contracts automatically get your brokerage's checklist
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Build your library</strong> - Custom brokerages are saved and available for future agents
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
