import fs from "fs";
import path from "path";
import { createPublicClient, http, getContract } from "viem";
import { arcTestnet } from "../lib/arc/chain";
import { dineBackPaymentAbi, rewardPoolAbi } from "../lib/arc/contracts";

function loadLocalEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...rest] = trimmed.split("=");
          const val = rest.join("=").trim();
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadLocalEnv();

async function verifyDeployment() {
  const paymentAddress = (process.env.NEXT_PUBLIC_DINEBACK_CONTRACT ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const rewardPoolAddress = (process.env.NEXT_PUBLIC_REWARD_POOL_CONTRACT ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;

  console.log("\n🔍 Verifying DineBack Deployment on Arc Testnet...\n");
  console.log(`Chain ID:                  ${arcTestnet.id}`);
  console.log(`RPC URL:                   ${arcTestnet.rpcUrls.default.http[0]}`);
  console.log(`DineBackPayment Address:   ${paymentAddress}`);
  console.log(`RewardPool Address:        ${rewardPoolAddress}\n`);

  if (
    paymentAddress === "0x0000000000000000000000000000000000000000" ||
    rewardPoolAddress === "0x0000000000000000000000000000000000000000"
  ) {
    console.error("❌ Contract addresses not found in .env.local.");
    process.exit(1);
  }

  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(),
  });

  // 1. Check Bytecode exists on-chain
  const paymentBytecode = await client.getBytecode({
    address: paymentAddress,
  });
  if (!paymentBytecode || paymentBytecode === "0x") {
    console.error("❌ No bytecode found at DineBackPayment address!");
    process.exit(1);
  }
  console.log("✔ DineBackPayment bytecode verified on-chain.");

  const rewardPoolBytecode = await client.getBytecode({
    address: rewardPoolAddress,
  });
  if (!rewardPoolBytecode || rewardPoolBytecode === "0x") {
    console.error("❌ No bytecode found at RewardPool address!");
    process.exit(1);
  }
  console.log("✔ RewardPool bytecode verified on-chain.");

  // 2. Query contract states & relationships
  const paymentContract = getContract({
    address: paymentAddress,
    abi: dineBackPaymentAbi,
    client,
  });

  const rewardPool = getContract({
    address: rewardPoolAddress,
    abi: rewardPoolAbi,
    client,
  });

  const linkedRewardPool = await paymentContract.read.rewardPool();
  const paymentToken = await paymentContract.read.paymentToken();
  const feeBps = await paymentContract.read.feeBps();

  console.log(`✔ DineBackPayment -> RewardPool:    ${linkedRewardPool}`);
  console.log(`✔ DineBackPayment -> PaymentToken:  ${paymentToken}`);
  console.log(`✔ DineBackPayment -> Platform Fee:  ${feeBps} BPS`);

  if (linkedRewardPool.toLowerCase() !== rewardPoolAddress.toLowerCase()) {
    console.error("❌ DineBackPayment.rewardPool does not match deployed RewardPool address!");
    process.exit(1);
  }

  console.log("\n🎉 All post-deployment verification checks on Arc Testnet PASSED!\n");
}

verifyDeployment().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
