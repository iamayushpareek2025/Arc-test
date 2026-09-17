export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'COMPLETED';

export interface CashbackCampaign {
  id: string;
  restaurantId: string;
  title: string;
  description: string;
  cashbackBps: number; // e.g. 800 for 8.00%
  minSpend: number; // Minimum bill amount eligible for cashback in USDC
  maxCashback: number; // Maximum cashback cap per payment in USDC
  budget: number; // Total campaign budget in USDC
  spent: number; // Amount disbursed so far in USDC
  remainingBudget: number; // budget - spent
  status: CampaignStatus;
  validFrom: number; // Unix ms
  validTo: number; // Unix ms
  createdAt: number;
  updatedAt: number;
}
