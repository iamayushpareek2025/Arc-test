import { parseAbi } from "viem";

export const DINEBACK_PAYMENT_ADDRESS = (process.env
  .NEXT_PUBLIC_DINEBACK_CONTRACT ||
  "0x6782c556a702c061dd6fd5322c578a45f6dbd2fb") as `0x${string}`;

export const REWARD_POOL_ADDRESS = (process.env
  .NEXT_PUBLIC_REWARD_POOL_CONTRACT ||
  "0xc174dd1e7c9c348d8ae822b86f28da0bf2f0f25f") as `0x${string}`;

export const dineBackPaymentAbi = parseAbi([
  "function payBill(bytes32 paymentId, address restaurant, uint256 amount, bytes32 campaignId, uint256 deadline) external returns (uint256 cashbackAmount)",
  "function isPaymentPaid(bytes32 paymentId) external view returns (bool)",
  "function getPayment(bytes32 paymentId) external view returns ((bytes32 paymentId, address customer, address restaurant, uint256 amount, uint256 cashback, bytes32 campaignId, uint256 timestamp))",
  "function paymentToken() external view returns (address)",
  "function rewardPool() external view returns (address)",
  "function feeRecipient() external view returns (address)",
  "function feeBps() external view returns (uint16)",
  "event PaymentCompleted(bytes32 indexed paymentId, address indexed customer, address indexed restaurant, uint256 amount, uint256 cashback, bytes32 campaignId)",
]);

export const rewardPoolAbi = parseAbi([
  "function createCampaign(bytes32 campaignId, address restaurant, uint16 cashbackBps, uint256 minSpend, uint256 maxCashback, uint256 initialBudget, uint256 validFrom, uint256 validTo) external",
  "function fundCampaign(bytes32 campaignId, uint256 amount) external",
  "function setCampaignStatus(bytes32 campaignId, bool isActive) external",
  "function setPaymentContract(address _paymentContract) external",
  "function distributeCashback(bytes32 campaignId, address recipient, uint256 billAmount) external returns (uint256 cashbackAmount)",
  "function getCampaign(bytes32 campaignId) external view returns ((bytes32 id, address restaurant, uint16 cashbackBps, uint256 minSpend, uint256 maxCashback, uint256 budget, uint256 spent, uint256 validFrom, uint256 validTo, bool isActive))",
  "event CampaignCreated(bytes32 indexed campaignId, address indexed restaurant, uint16 cashbackBps, uint256 minSpend, uint256 maxCashback, uint256 budget, uint256 validFrom, uint256 validTo)",
  "event CampaignFunded(bytes32 indexed campaignId, address indexed funder, uint256 amount)",
  "event CashbackDistributed(bytes32 indexed campaignId, address indexed recipient, uint256 billAmount, uint256 cashbackAmount)",
]);
