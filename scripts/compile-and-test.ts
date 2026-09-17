import fs from "fs";
import path from "path";
import solc from "solc";

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

async function compile() {
  console.log("Compiling DineBack smart contracts with Solc 0.8.24...");

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
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );

  if (output.errors) {
    let hasFatal = false;
    for (const error of output.errors) {
      if (error.severity === "error") {
        console.error("❌ Compile Error:", error.formattedMessage);
        hasFatal = true;
      } else {
        console.warn("⚠️ Warning:", error.formattedMessage);
      }
    }
    if (hasFatal) {
      process.exit(1);
    }
  }

  // Ensure abi directory exists
  if (!fs.existsSync("./abi")) {
    fs.mkdirSync("./abi", { recursive: true });
  }

  const rewardPoolAbi = output.contracts["RewardPool.sol"]["RewardPool"].abi;
  const paymentAbi = output.contracts["DineBackPayment.sol"]["DineBackPayment"].abi;

  fs.writeFileSync(
    "./abi/RewardPool.json",
    JSON.stringify(rewardPoolAbi, null, 2)
  );
  fs.writeFileSync(
    "./abi/DineBackPayment.json",
    JSON.stringify(paymentAbi, null, 2)
  );

  console.log("✅ Successfully compiled contracts!");
  console.log("📦 Generated ./abi/RewardPool.json");
  console.log("📦 Generated ./abi/DineBackPayment.json");
}

compile().catch((err) => {
  console.error("Compilation failed:", err);
  process.exit(1);
});
