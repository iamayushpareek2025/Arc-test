// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DineBackPayment.sol";
import "../src/RewardPool.sol";

contract DeployDineBack is Script {
    function run() external {
        address arcUsdc = vm.envOr(
            "NEXT_PUBLIC_USDC_ADDRESS",
            address(0x3600000000000000000000000000000000000000)
        );
        address feeRecipient = vm.envOr("FEE_RECIPIENT", msg.sender);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy RewardPool
        RewardPool rewardPool = new RewardPool(arcUsdc);
        console.log("RewardPool deployed at:", address(rewardPool));

        // 2. Deploy DineBackPayment
        DineBackPayment paymentContract = new DineBackPayment(
            arcUsdc,
            address(rewardPool),
            feeRecipient
        );
        console.log("DineBackPayment deployed at:", address(paymentContract));

        // 3. Link Payment Contract to RewardPool
        rewardPool.setPaymentContract(address(paymentContract));
        console.log("RewardPool paymentContract set to:", address(paymentContract));

        vm.stopBroadcast();
    }
}
