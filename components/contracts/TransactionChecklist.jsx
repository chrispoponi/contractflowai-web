import React, { useState, useEffect } from "react";
import { ChecklistItem } from "@/api/entities";
import { BrokerageChecklistTemplate } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Plus, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_LABELS = {
  pre_contract: "📋 Pre-Contract",
  under_contract: "🏠 Under Contract",
  inspections: "🔍 Inspections & Due Diligence",
  financing: "💰 Financing",
  closing: "🎉 Closing"
};

export default function TransactionChecklist({ contractId }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    category: "under_contract",
    due_date: ""
  });

  useEffect(() => {
    loadChecklist();
  }, [contractId]);

  const loadChecklist = async () => {
    setIsLoading(true);
    const allItems = await ChecklistItem.list();
    const contractItems = allItems.filter(item => item.contract_id === contractId);
    
    // If no items exist, create checklist from brokerage template
    if (contractItems.length === 0) {
      await createChecklistFromTemplate();
    } else {
      setItems(contractItems.sort((a, b) => {
        if (a.category !== b.category) {
          return Object.keys(CATEGORY_LABELS).indexOf(a.category) - Object.keys(CATEGORY_LABELS).indexOf(b.category);
        }
        return (a.order_index || 0) - (b.order_index || 0);
      }));
    }
    setIsLoading(false);
  };

  const createChecklistFromTemplate = async () => {
    try {
      const user = await User.me();
      const brokerage = user.brokerage_name;

      if (!brokerage) {
        // Use default checklist if no brokerage set
        await createDefaultChecklist();
        return;
      }

      // Load brokerage-specific templates
      const allTemplates = await BrokerageChecklistTemplate.list();
      const brokerageTemplates = allTemplates.filter(t => t.brokerage_name === brokerage);

      if (brokerageTemplates.length === 0) {
        // Fallback to default if no templates found
        await createDefaultChecklist();
        return;
      }

      // Create checklist from templates
      const created = [];
      for (const template of brokerageTemplates) {
        const newItem = await ChecklistItem.create({
          contract_id: contractId,
          title: template.title,
          description: template.description,
          category: template.category,
          order_index: template.order_index
        });
        created.push(newItem);
      }
      setItems(created);
    } catch (error) {
      console.error("Error creating checklist from template:", error);
      await createDefaultChecklist();
    }
  };

  const createDefaultChecklist = async () => {
    const DEFAULT_CHECKLIST = [
      // PRE-CONTRACT PHASE
      { category: "pre_contract", title: "Offer accepted by all parties", description: "Ensure all parties have signed the purchase agreement", order_index: 1 },
      { category: "pre_contract", title: "Earnest money deposited", description: "Deposit earnest money to title company or escrow", order_index: 2 },
      { category: "pre_contract", title: "Contract sent to title company", description: "Submit fully executed contract to title/escrow", order_index: 3 },
      { category: "pre_contract", title: "Open escrow account", description: "Title company opens escrow and provides escrow number", order_index: 4 },
      { category: "pre_contract", title: "Deliver contract disclosures", description: "Provide all required seller disclosures to buyer", order_index: 5 },
      
      // UNDER CONTRACT PHASE
      { category: "under_contract", title: "Order home inspection", description: "Schedule professional home inspection within contingency period", order_index: 1 },
      { category: "under_contract", title: "Buyer attends inspection", description: "Coordinate buyer attendance at home inspection", order_index: 2 },
      { category: "under_contract", title: "Review inspection report", description: "Analyze inspection findings with buyer/seller", order_index: 3 },
      { category: "under_contract", title: "Submit inspection response (if needed)", description: "Negotiate repairs or credits based on inspection", order_index: 4 },
      { category: "under_contract", title: "Inspection resolution agreement signed", description: "Get signed addendum for any inspection negotiations", order_index: 5 },
      
      // INSPECTIONS & DUE DILIGENCE PHASE
      { category: "inspections", title: "Order appraisal", description: "Lender orders property appraisal", order_index: 1 },
      { category: "inspections", title: "Schedule appraisal appointment", description: "Coordinate appraiser access to property", order_index: 2 },
      { category: "inspections", title: "Receive appraisal report", description: "Review appraisal value and findings", order_index: 3 },
      { category: "inspections", title: "Order survey (if required)", description: "Obtain property survey for boundary verification", order_index: 4 },
      { category: "inspections", title: "Review title commitment", description: "Review preliminary title report for any issues", order_index: 5 },
      { category: "inspections", title: "Resolve title issues (if any)", description: "Clear any clouds on title or easement problems", order_index: 6 },
      { category: "inspections", title: "HOA documents reviewed", description: "Obtain and review HOA docs, CCRs, and financials", order_index: 7 },
      { category: "inspections", title: "Well/septic inspection (if applicable)", description: "Complete required well water or septic tests", order_index: 8 },
      
      // FINANCING PHASE
      { category: "financing", title: "Loan application submitted", description: "Buyer completes full mortgage application", order_index: 1 },
      { category: "financing", title: "Provide loan documentation", description: "Submit all required financial docs to lender", order_index: 2 },
      { category: "financing", title: "Processing - await underwriting", description: "Loan moves through processing stage", order_index: 3 },
      { category: "financing", title: "Loan approved/clear to close", description: "Receive final loan approval from underwriter", order_index: 4 },
      { category: "financing", title: "Homeowners insurance secured", description: "Buyer obtains insurance and provides proof to lender", order_index: 5 },
      { category: "financing", title: "Final loan figures received", description: "Review final loan terms and closing costs", order_index: 6 },
      { category: "financing", title: "Wire instructions confirmed", description: "Verify wire transfer details for closing funds", order_index: 7 },
      
      // CLOSING PHASE
      { category: "closing", title: "Schedule final walkthrough", description: "Set appointment for buyer's final property inspection", order_index: 1 },
      { category: "closing", title: "Complete final walkthrough", description: "Buyer verifies property condition and negotiated repairs", order_index: 2 },
      { category: "closing", title: "Final walkthrough approval", description: "Get buyer sign-off that property is acceptable", order_index: 3 },
      { category: "closing", title: "Review closing disclosure", description: "Buyer reviews and signs 3-day CD from lender", order_index: 4 },
      { category: "closing", title: "Schedule closing appointment", description: "Confirm date, time, and location with all parties", order_index: 5 },
      { category: "closing", title: "Seller completes move-out", description: "Ensure property is vacant and broom-clean", order_index: 6 },
      { category: "closing", title: "Wire funds/bring cashier's check", description: "Buyer transfers down payment to escrow", order_index: 7 },
      { category: "closing", title: "Sign closing documents", description: "All parties execute final settlement documents", order_index: 8 },
      { category: "closing", title: "Record deed and documents", description: "Title company records deed with county", order_index: 9 },
      { category: "closing", title: "Disburse funds", description: "Title company releases funds to seller", order_index: 10 },
      { category: "closing", title: "Deliver keys to buyer", description: "Transfer possession and all keys/codes/remotes", order_index: 11 },
      { category: "closing", title: "Provide copies of closing docs", description: "Ensure all parties receive signed documents", order_index: 12 },
    ];

    const created = [];
    for (const item of DEFAULT_CHECKLIST) {
      const newItem = await ChecklistItem.create({
        contract_id: contractId,
        ...item
      });
      created.push(newItem);
    }
    setItems(created);
  };

  const toggleComplete = async (item) => {
    const updated = await ChecklistItem.update(item.id, {
      is_completed: !item.is_completed,
      completed_date: !item.is_completed ? new Date().toISOString() : null
    });
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  };

  const addCustomItem = async () => {
    if (!newItem.title.trim()) return;
    
    const maxOrder = items
      .filter(i => i.category === newItem.category)
      .reduce((max, i) => Math.max(max, i.order_index || 0), 0);
    
    const created = await ChecklistItem.create({
      contract_id: contractId,
      ...newItem,
      order_index: maxOrder + 1
    });
    
    setItems(prev => [...prev, created].sort((a, b) => {
      if (a.category !== b.category) {
        return Object.keys(CATEGORY_LABELS).indexOf(a.category) - Object.keys(CATEGORY_LABELS).indexOf(b.category);
      }
      return (a.order_index || 0) - (b.order_index || 0);
    }));
    
    setNewItem({ title: "", description: "", category: "under_contract", due_date: "" });
    setShowAddForm(false);
  };

  const deleteItem = async (itemId) => {
    if (confirm("Delete this checklist item?")) {
      await ChecklistItem.delete(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const completedCount = items.filter(i => i.is_completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card className="shadow-lg border-l-4 border-blue-500">
      <CardHeader className="border-b bg-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl mb-2">Transaction Checklist</CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                {completedCount} of {totalCount} completed
              </Badge>
              <div className="flex-1 max-w-xs">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700">{progressPercent}%</span>
            </div>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {showAddForm && (
          <div className="mt-4 p-4 bg-white rounded-lg border space-y-3">
            <Input
              placeholder="Checklist item title"
              value={newItem.title}
              onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newItem.description}
              onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={newItem.category}
                onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
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
                type="date"
                value={newItem.due_date}
                onChange={(e) => setNewItem(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addCustomItem} size="sm" className="bg-blue-600">
                Add Item
              </Button>
              <Button onClick={() => setShowAddForm(false)} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <p className="text-gray-500 text-center py-8">Loading checklist...</p>
        ) : (
          <div className="space-y-6">
            {Object.keys(CATEGORY_LABELS).map(category => {
              const categoryItems = groupedItems[category] || [];
              if (categoryItems.length === 0) return null;
              
              const categoryCompleted = categoryItems.filter(i => i.is_completed).length;
              
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {categoryCompleted}/{categoryItems.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                          item.is_completed 
                            ? 'bg-green-50 border-green-200 opacity-75' 
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <button
                          onClick={() => toggleComplete(item)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {item.is_completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${item.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {item.due_date && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                Due: {format(new Date(item.due_date), "MMM d")}
                              </div>
                            )}
                            {item.completed_date && (
                              <div className="text-xs text-green-600">
                                ✓ {format(new Date(item.completed_date), "MMM d, h:mm a")}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
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
  );
}