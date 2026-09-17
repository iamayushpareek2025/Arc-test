import fs from "fs";
import path from "path";
import readline from "readline";
import { ethers } from "ethers";

function hiddenPrompt(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    const isRaw = stdin.isRaw;

    // Mask input
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
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (c === "\u0003") {
          // Ctrl+C
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

async function main() {
  console.log("\n============================================================");
  console.log("🔐 DineBack Secure Local Keystore Generator");
  console.log("============================================================\n");
  console.log("This utility encrypts your Arc Testnet wallet into a standard Web3 Secret Storage JSON.");
  console.log("The private key is encrypted locally using AES-128-CTR / Scrypt and saved to a local keystore file.\n");

  const privateKey = await hiddenPrompt("🔑 Enter your Arc Testnet Deployer Private Key: ");
  const trimmed = privateKey.trim();
  const formattedKey = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;

  if (formattedKey.length !== 66) {
    console.error("❌ Invalid private key length. Must be 64 hex characters + 0x.");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(formattedKey);
  console.log(`\n👤 Detected Wallet Address: ${wallet.address}`);

  const password = await hiddenPrompt("🔒 Choose a password to encrypt your keystore: ");
  const confirmPassword = await hiddenPrompt("🔒 Confirm password: ");

  if (password !== confirmPassword) {
    console.error("❌ Passwords do not match.");
    process.exit(1);
  }

  console.log("\n⏳ Encrypting keystore with Scrypt (this may take a few seconds)...");
  const encryptedJson = await wallet.encrypt(password);

  const outputPath = path.resolve("./.keystore.json");
  fs.writeFileSync(outputPath, encryptedJson, "utf8");

  console.log(`\n✅ Encrypted keystore successfully saved to: ${outputPath}`);
  console.log("ℹ️  This file is protected by .gitignore and will never be committed.");
  console.log("\n🚀 You can now deploy using: npm run contracts:deploy\n");
}

main().catch((err) => {
  console.error("Keystore generation failed:", err);
  process.exit(1);
});
