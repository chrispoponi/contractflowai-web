import { supabase } from "./supabaseClient";

const DEFAULT_TABLES = {
  Contract: import.meta.env.VITE_SUPABASE_CONTRACTS_TABLE || "contracts",
  Referral: import.meta.env.VITE_SUPABASE_REFERRALS_TABLE || "referrals",
  ClientUpdate:
    import.meta.env.VITE_SUPABASE_CLIENT_UPDATES_TABLE || "client_updates",
  Organization:
    import.meta.env.VITE_SUPABASE_ORGANIZATIONS_TABLE || "organizations",
  User: import.meta.env.VITE_SUPABASE_PROFILES_TABLE || "profiles",
};

function applyOrdering(query, ordering) {
  if (!ordering) {
    return query;
  }

  const orderings = Array.isArray(ordering) ? ordering : [ordering];

  return orderings.reduce((acc, order) => {
    if (!order || typeof order !== "string") {
      return acc;
    }
    const ascending = !order.startsWith("-");
    const column = ascending ? order : order.slice(1);
    return acc.order(column, { ascending, nullsFirst: false });
  }, query);
}

function applyFilters(query, filters = {}) {
  return Object.entries(filters).reduce((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    if (Array.isArray(value)) {
      return acc.in(key, value);
    }

    if (value === null) {
      return acc.is(key, null);
    }

    return acc.eq(key, value);
  }, query);
}

function createEntityClient(table) {
  return {
    async list(ordering) {
      let query = supabase.from(table).select("*");
      query = applyOrdering(query, ordering);
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data || [];
    },

    async filter(filters, { ordering } = {}) {
      let query = supabase.from(table).select("*");
      query = applyFilters(query, filters);
      query = applyOrdering(query, ordering);
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data || [];
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select("*")
        .single();
      if (error) {
        throw error;
      }
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        throw error;
      }
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) {
        throw error;
      }
    },
  };
}

export const supabaseEntities = Object.entries(DEFAULT_TABLES).reduce(
  (acc, [entityName, table]) => {
    acc[entityName] = createEntityClient(table);
    return acc;
  },
  {}
);
