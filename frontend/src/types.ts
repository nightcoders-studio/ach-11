export interface ApiKey {
  id: string;
  name: string;
  keyMasked: string; // e.g. glm_prod_****j9K2
  rawKey?: string; // only available immediately after generation
  status: 'Active' | 'Revoked';
  createdAt: string;
  lastUsedAt: string;
}

export interface UsageLog {
  id: string;
  timestamp: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  costDeducted: number; // in IDR
  latencyMs: number;
  status: 'Success' | 'Error';
}

export interface Transaction {
  id: string;
  timestamp: string;
  description: string;
  amount: number; // e.g. + 100000 or - 12500
  status: 'Success' | 'Failed';
  method?: string; // QRIS, GoPay, etc
}

export interface UserSession {
  name: string;
  email: string;
  balance: number; // in IDR
  totalSpent: number; // in IDR
  totalTokens: number; // in Millions
}
