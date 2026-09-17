import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ethers } from "ethers";
import solc from "solc";
import { arcTestnet } from "../lib/arc/chain";

const ARC_USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x3600000000000000000000000000000000000000") as `0x${string}`;

function findImports(importPath: string) {
  if (importPath.startsWith("@openzeppelin/")) {
    const fullPath = path.resolve("./node_modules", importPath);
    if (fs.existsSync(fullPath)) {
      return { contents: fs.readFileSync(fullPath, "utf8") };
    }
  }
  const contractPath = path.resolve("./contracts/src", importPath);
  if (fs.existsSync(contractPath)) {
    return { contents: fs.readFileSync(contractPath, "utf8") };
  }
  const interfacePath = path.resolve("./contracts/src/interfaces", importPath);
  if (fs.existsSync(interfacePath)) {
    return { contents: fs.readFileSync(interfacePath, "utf8") };
  }
  return { error: `File not found: ${importPath}` };
}

function compileContracts() {
  console.log("🔨 Compiling smart contracts with Solc 0.8.24...");
  const rewardPoolSrc = fs.readFileSync(
    path.resolve("./contracts/src/RewardPool.sol"),
    "utf8"
  );
  const paymentSrc = fs.readFileSync(
    path.resolve("./contracts/src/DineBackPayment.sol"),
    "utf8"
  );
  const iRewardPoolSrc = fs.readFileSync(
    path.resolve("./contracts/src/interfaces/IRewardPool.sol"),
    "utf8"
  );
  const iPaymentSrc = fs.readFileSync(
    path.resolve("./contracts/src/interfaces/IDineBackPayment.sol"),
    "utf8"
  );

  const input = {
    language: "Solidity",
    sources: {
      "RewardPool.sol": { content: rewardPoolSrc },
      "DineBackPayment.sol": { content: paymentSrc },
      "interfaces/IRewardPool.sol": { content: iRewardPoolSrc },
      "interfaces/IDineBackPayment.sol": { content: iPaymentSrc },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );

  if (output.errors?.some((e: { severity: string }) => e.severity === "error")) {
    console.error("❌ Compile error detected in contracts");
    process.exit(1);
  }

  const rewardPool = output.contracts["RewardPool.sol"]["RewardPool"];
  const payment = output.contracts["DineBackPayment.sol"]["DineBackPayment"];

  return {
    rewardPool: {
      abi: rewardPool.abi,
      bytecode: `0x${rewardPool.evm.bytecode.object}` as `0x${string}`,
    },
    payment: {
      abi: payment.abi,
      bytecode: `0x${payment.evm.bytecode.object}` as `0x${string}`,
    },
  };
}

function maskedPasswordPrompt(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    const isRaw = stdin.isRaw;

    process.stdout.write(query);

    let input = "";
    const onData = (char: Buffer) => {
      const str = char.toString("utf8");
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "\n" || c === "\r" || c === "\u0004") {
          stdin.removeListener("data", onData);
          if (stdin.isTTY) stdin.setRawMode(Boolean(isRaw));
          process.stdout.write("\n");
          rl.close();
          resolve(input);
          return;
        } else if (c === "\u0008" || c === "\x7f") {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (c === "\u0003") {
          process.exit(1);
        } else {
          input += c;
          process.stdout.write("*");
        }
      }
    };

    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function resolveKeystore(): Promise<{ json: string; location: string }> {
  // 1. Check if standard local .keystore.json exists in project root
  const localKeystore = path.resolve("./.keystore.json");
  if (fs.existsSync(localKeystore)) {
    return {
      json: fs.readFileSync(localKeystore, "utf8"),
      location: localKeystore,
    };
  }

  // 2. Check Foundry default keystores directory (~/.foundry/keystores/)
  const foundryKeystoreDir = path.join(os.homedir(), ".foundry", "keystores");
  if (fs.existsSync(foundryKeystoreDir)) {
    const files = fs.readdirSync(foundryKeystoreDir);
    if (files.length > 0) {
      const defaultKeystore = path.join(foundryKeystoreDir, files[0]);
      return {
        json: fs.readFileSync(defaultKeystore, "utf8"),
        location: defaultKeystore,
      };
    }
  }

  console.error("❌ No encrypted keystore found!");
  console.error("\nPlease create a secure local keystore first:");
  console.error("👉 Option A (Recommended): Run `npm run keystore:create`");
  console.error("👉 Option B (Foundry): Run `cast wallet import deployer`\n");
  process.exit(1);
}

async function main() {
  console.log("\n============================================================");
  console.log("🚀 DineBack Smart Contracts Secure Deployment — Arc Testnet");
  console.log("============================================================\n");
  console.log(`Network:       Arc Testnet`);
  console.log(`Chain ID:      ${arcTestnet.id}`);
  console.log(`RPC Endpoint:  ${arcTestnet.rpcUrls.default.http[0]}`);
  console.log(`USDC Token:    ${ARC_USDC_ADDRESS}\n`);

  // Locate and unlock encrypted keystore
  const { json: keystoreJson, location: keystorePath } = await resolveKeystore();
  console.log(`📁 Using Keystore: ${keystorePath}`);

  const password = await maskedPasswordPrompt("🔐 Enter Keystore Password: ");
  console.log("⏳ Decrypting local keystore...");

  let decryptedWallet: ethers.HDNodeWallet | ethers.Wallet;
  try {
    decryptedWallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, password);
  } catch {
    console.error("❌ Invalid password or corrupted keystore.");
    process.exit(1);
  }

  const rawPrivateKey = decryptedWallet.privateKey as `0x${string}`;
  const account = privateKeyToAccount(rawPrivateKey);
  console.log(`✅ Keystore unlocked successfully!`);
  console.log(`👤 Deployer Address: ${account.address}`);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(),
  });

  // Verify deployer balance on Arc Testnet
  const nativeBalance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Deployer Native Gas Balance: ${formatUnits(nativeBalance, 6)} USDC`);

  if (nativeBalance === BigInt(0)) {
    console.error("\n❌ Insufficient gas funds on Arc Testnet!");
    console.error(`Please fund your deployer address (${account.address}) with testnet USDC from:`);
    console.error("👉 https://faucet.circle.com (Select Arc Testnet)\n");
    process.exit(1);
  }

  const compiled = compileContracts();

  // 1. Deploy RewardPool
  console.log("\n[1/3] Deploying RewardPool contract...");
  const rewardPoolDeployTx = await walletClient.deployContract({
    abi: compiled.rewardPool.abi,
    bytecode: compiled.rewardPool.bytecode,
    args: [ARC_USDC_ADDRESS],
  });
  console.log(`⏳ RewardPool Deployment TX: ${rewardPoolDeployTx}`);
  const rewardPoolReceipt = await publicClient.waitForTransactionReceipt({
    hash: rewardPoolDeployTx,
  });

  const rewardPoolAddress = rewardPoolReceipt.contractAddress;
  if (!rewardPoolAddress) {
    throw new Error("Failed to retrieve RewardPool address from receipt.");
  }
  console.log(`✅ RewardPool deployed at: ${rewardPoolAddress}`);
  console.log(`   Block: ${rewardPoolReceipt.blockNumber} (Gas Used: ${rewardPoolReceipt.gasUsed})`);

  // 2. Deploy DineBackPayment
  console.log("\n[2/3] Deploying DineBackPayment contract...");
  const paymentDeployTx = await walletClient.deployContract({
    abi: compiled.payment.abi,
    bytecode: compiled.payment.bytecode,
    args: [ARC_USDC_ADDRESS, rewardPoolAddress, account.address],
  });
  console.log(`⏳ DineBackPayment Deployment TX: ${paymentDeployTx}`);
  const paymentReceipt = await publicClient.waitForTransactionReceipt({
    hash: paymentDeployTx,
  });

  const paymentAddress = paymentReceipt.contractAddress;
  if (!paymentAddress) {
    throw new Error("Failed to retrieve DineBackPayment address from receipt.");
  }
  console.log(`✅ DineBackPayment deployed at: ${paymentAddress}`);
  console.log(`   Block: ${paymentReceipt.blockNumber} (Gas Used: ${paymentReceipt.gasUsed})`);

  // 3. Link Payment Contract in RewardPool
  console.log("\n[3/3] Setting authorized paymentContract in RewardPool...");
  const setPaymentTx = await walletClient.writeContract({
    address: rewardPoolAddress,
    abi: compiled.rewardPool.abi,
    functionName: "setPaymentContract",
    args: [paymentAddress],
  });
  console.log(`⏳ Authorization TX: ${setPaymentTx}`);
  await publicClient.waitForTransactionReceipt({ hash: setPaymentTx });
  console.log(`✅ RewardPool.paymentContract successfully set to ${paymentAddress}`);

  // 4. Update .env.local
  console.log("\n📝 Updating local environment configuration (.env.local)...");
  let envContent = "";
  const envPath = path.resolve("./.env.local");
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  } else if (fs.existsSync(path.resolve("./.env.example"))) {
    envContent = fs.readFileSync(path.resolve("./.env.example"), "utf8");
  }

  const updateOrAddEnv = (content: string, key: string, val: string) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${val}`);
    }
    return `${content}\n${key}=${val}`;
  };

  envContent = updateOrAddEnv(envContent, "NEXT_PUBLIC_DINEBACK_CONTRACT", paymentAddress);
  envContent = updateOrAddEnv(envContent, "NEXT_PUBLIC_REWARD_POOL_CONTRACT", rewardPoolAddress);
  fs.writeFileSync(envPath, envContent.trim() + "\n");
  console.log("✅ .env.local updated with deployed contract addresses.");

  // 5. Update docs/deployment.md
  const deploymentDoc = `# DineBack — Arc Testnet Deployment Record

- **Deployment Date:** ${new Date().toISOString()}
- **Network:** Arc Testnet
- **Chain ID:** ${arcTestnet.id}
- **RPC URL:** ${arcTestnet.rpcUrls.default.http[0]}
- **Block Explorer:** https://testnet.arcscan.app

---

## Deployed Contract Addresses

| Contract | Address | Explorer Link |
|---|---|---|
| **RewardPool** | \`${rewardPoolAddress}\` | [View on Arcscan](https://testnet.arcscan.app/address/${rewardPoolAddress}) |
| **DineBackPayment** | \`${paymentAddress}\` | [View on Arcscan](https://testnet.arcscan.app/address/${paymentAddress}) |
| **USDC Token** | \`${ARC_USDC_ADDRESS}\` | [View on Arcscan](https://testnet.arcscan.app/address/${ARC_USDC_ADDRESS}) |

---

## Deployment Transactions

- **RewardPool Deployment TX:** \`${rewardPoolDeployTx}\` (Block: ${rewardPoolReceipt.blockNumber})
- **DineBackPayment Deployment TX:** \`${paymentDeployTx}\` (Block: ${paymentReceipt.blockNumber})
- **RewardPool.setPaymentContract TX:** \`${setPaymentTx}\`

---

## Configuration & Roles
- **RewardPool Payment Token:** \`${ARC_USDC_ADDRESS}\`
- **RewardPool Authorized Payment Contract:** \`${paymentAddress}\`
- **DineBackPayment RewardPool:** \`${rewardPoolAddress}\`
- **DineBackPayment Fee Recipient:** \`${account.address}\`
- **DineBackPayment Platform Fee:** 0 BPS (0%)
`;

  fs.writeFileSync(path.resolve("./docs/deployment.md"), deploymentDoc);
  console.log("✅ docs/deployment.md recorded successfully.");

  console.log("\n============================================================");
  console.log("🎉 DEPLOYMENT TO ARC TESTNET COMPLETED SUCCESSFULLY!");
  console.log("============================================================\n");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
