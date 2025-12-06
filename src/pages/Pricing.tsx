// Define your plan type if not already defined
type Plan = {
  name: string;
  price: number;
  features: string[];
  tier: 'budget' | 'professional' | 'team';
  highlighted?: boolean;
  ctaText: string;
  stripeBuyButtonId: string;
};

const planDefinitions: Plan[] = [
  {
    name: 'Budget',
    price: 5,
    features: [
      '2 contracts / month',
      'AI analysis',
      'Calendar tracking',
      'Email reminders',
      'Counter offers',
      'Mobile optimized',
    ],
    tier: 'budget',
    ctaText: 'Get Started',
    stripeBuyButtonId:
      import.meta.env.VITE_STRIPE_BUDGET_BUTTON_ID ??
      'buy_btn_1SGsHg0ONIDdV6FnDvFyVTX7',
  },

  {
    name: 'Professional',
    price: 15,
    features: [
      '10 contracts / month',
      'AI analysis + advanced warnings',
      'Calendar sync',
      'SMS + email reminders',
      'Counter-offer builder',
      'Unlimited storage',
    ],
    tier: 'professional',
    highlighted: true,
    ctaText: 'Get Started',
    stripeBuyButtonId:
      import.meta.env.VITE_STRIPE_PRO_BUTTON_ID ??
      'buy_btn_1SGPxr0ONIDdV6FnqhxWOEDx',
  },

  {
    name: 'Team',
    price: 45,
    features: [
      'Unlimited contracts',
      'Up to 10 agents',
      'Team dashboard',
      'Shared calendars',
      'Custom checklists',
      'Account manager',
    ],
    tier: 'team',
    ctaText: 'Get Started',
    stripeBuyButtonId:
      import.meta.env.VITE_STRIPE_TEAM_BUTTON_ID ??
      'buy_btn_1Saiu70ONIDdV6Fn9jVUKJtD',
  },
];

export default planDefinitions;
