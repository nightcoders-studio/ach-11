import { ApiKey, UsageLog, Transaction, UserSession } from "./types";

export const initialSession: UserSession = {
  name: "Andi Wijaya",
  email: "andi.wijaya@developer.com",
  balance: 124500, // Rp 124.500
  totalSpent: 375500, // Rp 375.500
  totalTokens: 1.25 // 1.25 Million tokens
};

export const initialKeys: ApiKey[] = [
  {
    id: "key-1",
    name: "Production Gateway",
    keyMasked: "glm_prod_••••••••••••x7B1",
    status: "Active",
    createdAt: "2026-05-10 14:22:05",
    lastUsedAt: "2026-06-01 05:10:14"
  },
  {
    id: "key-2",
    name: "Staging Test Env",
    keyMasked: "glm_test_••••••••••••a9K2",
    status: "Active",
    createdAt: "2026-05-15 09:12:44",
    lastUsedAt: "2026-05-30 18:25:00"
  },
  {
    id: "key-3",
    name: "Legacy Sandbox (Deprecated)",
    keyMasked: "glm_dev_••••••••••••3dL8",
    status: "Revoked",
    createdAt: "2026-04-01 11:00:30",
    lastUsedAt: "2026-04-15 16:30:22"
  }
];

export const initialUsageLogs: UsageLog[] = [
  {
    id: "req-1",
    timestamp: "2026-06-01 05:10:14",
    modelName: "gemini-3.5-flash",
    promptTokens: 1450,
    completionTokens: 820,
    costDeducted: 115, // standard low price
    latencyMs: 145,
    status: "Success"
  },
  {
    id: "req-2",
    timestamp: "2026-06-01 04:58:33",
    modelName: "gpt-4o",
    promptTokens: 4200,
    completionTokens: 1540,
    costDeducted: 860, // higher price for OpenAI
    latencyMs: 820,
    status: "Success"
  },
  {
    id: "req-3",
    timestamp: "2026-06-01 04:12:05",
    modelName: "claude-3-5-sonnet",
    promptTokens: 2100,
    completionTokens: 980,
    costDeducted: 742,
    latencyMs: 1105,
    status: "Success"
  },
  {
    id: "req-4",
    timestamp: "2026-05-31 23:44:12",
    modelName: "gpt-4o",
    promptTokens: 850,
    completionTokens: 410,
    costDeducted: 189,
    latencyMs: 640,
    status: "Success"
  },
  {
    id: "req-5",
    timestamp: "2026-05-31 21:05:59",
    modelName: "gemini-3.5-flash",
    promptTokens: 67300,
    completionTokens: 8400,
    costDeducted: 1250, // Gemini large batch discount
    latencyMs: 310,
    status: "Success"
  },
  {
    id: "req-6",
    timestamp: "2026-05-31 18:22:45",
    modelName: "claude-3-5-sonnet",
    promptTokens: 520,
    completionTokens: 0,
    costDeducted: 0,
    latencyMs: 1800,
    status: "Error" // API timeout Simulation
  },
  {
    id: "req-7",
    timestamp: "2026-05-31 15:10:02",
    modelName: "gemini-3.5-flash",
    promptTokens: 840,
    completionTokens: 120,
    costDeducted: 35,
    latencyMs: 95,
    status: "Success"
  }
];

export const initialTransactions: Transaction[] = [
  {
    id: "tr-1",
    timestamp: "2026-06-01 04:30:00",
    description: "Top Up via QRIS (OVO/Gopay)",
    amount: 100000,
    status: "Success",
    method: "QRIS"
  },
  {
    id: "tr-2",
    timestamp: "2026-05-25 15:20:11",
    description: "Top Up via Bank Mandiri Virtual Account",
    amount: 250000,
    status: "Success",
    method: "Virtual Account"
  },
  {
    id: "tr-3",
    timestamp: "2026-05-10 11:15:30",
    description: "Pendaftaran Akun - Saldo Selamat Datang",
    amount: 5000,
    status: "Success",
    method: "Bonus"
  },
  {
    id: "tr-4",
    timestamp: "2026-05-31 23:59:59",
    description: "Akumulasi Biaya Penggunaan API (Mei 2026)",
    amount: -230500,
    status: "Success",
    method: "Deduction"
  }
];

// Daily usage statistics for chart rendering
export interface ChartDayData {
  date: string; // e.g. "25 May"
  gemini: number; // in thousand tokens
  gpt4: number;
  claude: number;
}

export const dailyChartData: ChartDayData[] = [
  { date: "25 Mei", gemini: 120, gpt4: 250, claude: 180 },
  { date: "26 Mei", gemini: 180, gpt4: 310, claude: 240 },
  { date: "27 Mei", gemini: 220, gpt4: 150, claude: 310 },
  { date: "28 Mei", gemini: 150, gpt4: 420, claude: 280 },
  { date: "29 Mei", gemini: 340, gpt4: 380, claude: 190 },
  { date: "30 Mei", gemini: 490, gpt4: 290, claude: 340 },
  { date: "31 Mei", gemini: 610, gpt4: 450, claude: 420 },
  { date: "1 Jun", gemini: 420, gpt4: 320, claude: 390 }
];
