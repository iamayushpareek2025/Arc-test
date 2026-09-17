export type RestaurantStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  address: string;
  city: string;
  walletAddress: `0x${string}`;
  logoUrl?: string;
  coverImageUrl?: string;
  status: RestaurantStatus;
  activeCampaignId?: string;
  totalRevenue: number;
  totalPaymentsCount: number;
  cashbackDistributed: number;
  createdAt: number;
  updatedAt: number;
  rating?: number;
  isVerified: boolean;
}
