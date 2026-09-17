import { RestaurantRepository } from "../lib/firebase/repositories/restaurants";
import { CampaignRepository } from "../lib/firebase/repositories/campaigns";
import { PaymentRequestRepository } from "../lib/firebase/repositories/paymentRequests";
import {
  canTransition,
  validateTransition,
} from "../lib/payments/statusLifecycle";
import { restaurantSchema } from "../lib/validation/restaurant";
import { campaignSchema } from "../lib/validation/campaign";
import { createPaymentRequestInputSchema } from "../lib/validation/paymentRequest";

async function runTests() {
  console.log("\n🧪 Running Phase 5 Automated Unit & State Machine Tests...\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`  ✔ [${total}] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [${total}] FAILED: ${message}`);
      process.exit(1);
    }
  }

  // 1. Restaurant Repository Tests
  const activeRestaurants = await RestaurantRepository.listActive();
  assert(activeRestaurants.length >= 3, "Fetched active seed restaurants");

  const bistro = await RestaurantRepository.getById("rest_arc_bistro");
  assert(bistro !== null && bistro.name === "The Arc Bistro", "Retrieved restaurant by ID");

  const ramen = await RestaurantRepository.getBySlug("nakamoto-ramen");
  assert(ramen !== null && ramen.id === "rest_nakamoto_ramen", "Retrieved restaurant by slug");

  // 2. Restaurant Schema Validation (Invalid Address Rejection)
  try {
    restaurantSchema.parse({
      id: "invalid_rest",
      name: "Bad Wallet",
      slug: "bad-wallet",
      cuisine: "Test",
      address: "123 Street",
      city: "City",
      walletAddress: "0xInvalidHexAddress",
    });
    assert(false, "Should reject invalid Ethereum wallet address");
  } catch {
    assert(true, "Properly rejected invalid Ethereum wallet address");
  }

  // 3. Campaign Repository Tests
  const bistroCampaigns = await CampaignRepository.listActiveByRestaurant("rest_arc_bistro");
  assert(bistroCampaigns.length > 0, "Fetched active campaigns for restaurant");

  const campaign = await CampaignRepository.getById("cmp_bistro_weekend");
  assert(campaign !== null && campaign.cashbackBps === 800, "Retrieved campaign with 800 BPS (8%)");

  // 4. Campaign Schema Validation (BPS range & validTo > validFrom)
  try {
    campaignSchema.parse({
      id: "cmp_invalid",
      restaurantId: "rest_arc_bistro",
      title: "Invalid BPS",
      description: "Test",
      cashbackBps: 15000, // > 10000 invalid
      minSpend: 10,
      maxCashback: 50,
      budget: 1000,
      validFrom: 1000,
      validTo: 2000,
    });
    assert(false, "Should reject cashback BPS > 10000");
  } catch {
    assert(true, "Properly rejected cashback BPS > 10000");
  }

  // 5. Payment Request Creation & Integer Basis-Point Cashback Math
  const paymentRequest = await PaymentRequestRepository.create({
    restaurantId: "rest_arc_bistro",
    invoiceId: "INV-TEST-001",
    billAmount: 50.0, // 50 USDC with 8% cashback = 4.00 USDC
    campaignId: "cmp_bistro_weekend",
    tableNumber: "Table 5",
    durationMinutes: 15,
  });

  assert(paymentRequest.id.startsWith("db_"), "Generated secure unique ID with db_ prefix");
  assert(paymentRequest.billAmount === 50.0, "Accurate bill amount stored");
  assert(paymentRequest.cashbackBps === 800, "Accurate campaign cashback BPS (800)");
  assert(paymentRequest.expectedCashback === 4.0, "Integer cashback basis-point math exact (4.00 USDC)");
  assert(paymentRequest.status === "CREATED", "Initial status is strictly CREATED");
  assert(paymentRequest.paymentUrl.includes(`/pay/${paymentRequest.id}`), "Valid payment URL generated");

  // 6. Zero/Negative Amount Rejection
  try {
    createPaymentRequestInputSchema.parse({
      restaurantId: "rest_arc_bistro",
      invoiceId: "INV-TEST-002",
      billAmount: 0,
    });
    assert(false, "Should reject bill amount 0");
  } catch {
    assert(true, "Properly rejected zero bill amount");
  }

  // 7. Status Lifecycle & State Machine Transitions
  assert(canTransition("CREATED", "PENDING"), "Allowed: CREATED -> PENDING");
  assert(canTransition("PENDING", "PAID"), "Allowed: PENDING -> PAID");
  assert(canTransition("PAID", "COMPLETED"), "Allowed: PAID -> COMPLETED");
  assert(canTransition("CREATED", "CANCELLED"), "Allowed: CREATED -> CANCELLED");
  assert(!canTransition("COMPLETED", "PENDING"), "Blocked: COMPLETED -> PENDING");
  assert(!canTransition("CANCELLED", "PAID"), "Blocked: CANCELLED -> PAID");
  assert(!canTransition("EXPIRED", "PAID"), "Blocked: EXPIRED -> PAID");

  // 8. Payment Request Status Update via Repository
  const updatedToPending = await PaymentRequestRepository.updateStatus(
    paymentRequest.id,
    "PENDING"
  );
  assert(updatedToPending.status === "PENDING", "Transitioned to PENDING status");

  const cancelled = await PaymentRequestRepository.cancel(paymentRequest.id);
  assert(cancelled.status === "CANCELLED", "Merchant cancelled unpaid invoice successfully");

  // 9. Unauthorized Status Transition Throws Error
  try {
    await PaymentRequestRepository.updateStatus(paymentRequest.id, "PAID");
    assert(false, "Should reject CANCELLED -> PAID transition");
  } catch {
    assert(true, "State machine threw error on invalid CANCELLED -> PAID transition");
  }

  console.log(`\n🎉 All ${passed}/${total} Phase 5 automated tests PASSED!\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
