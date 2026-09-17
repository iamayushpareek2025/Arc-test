// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RewardPool.sol";
import "./mocks/MockUSDC.sol";

contract RewardPoolTest is Test {
    RewardPool public rewardPool;
    MockUSDC public usdc;

    address public owner = address(0xABCD);
    address public restaurant = address(0x1111);
    address public customer = address(0x2222);
    address public paymentContract = address(0x3333);

    bytes32 public constant CAMPAIGN_ID = keccak256("WEEKEND_SPECIAL");

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        rewardPool = new RewardPool(address(usdc));
        rewardPool.setPaymentContract(paymentContract);
        vm.stopPrank();

        // Mint USDC to owner and fund reward pool
        usdc.mint(owner, 10_000 * 1e6);
        vm.startPrank(owner);
        usdc.approve(address(rewardPool), type(uint256).max);

        rewardPool.createCampaign(
            CAMPAIGN_ID,
            restaurant,
            500, // 5.00% cashback (500 BPS)
            10 * 1e6, // Min spend: 10 USDC
            50 * 1e6, // Max cashback: 50 USDC
            1_000 * 1e6, // Budget: 1,000 USDC
            block.timestamp,
            block.timestamp + 7 days
        );

        rewardPool.fundCampaign(CAMPAIGN_ID, 1_000 * 1e6);
        vm.stopPrank();
    }

    function test_CampaignCreationAndFunding() public view {
        IRewardPool.Campaign memory c = rewardPool.getCampaign(CAMPAIGN_ID);
        assertEq(c.restaurant, restaurant);
        assertEq(c.cashbackBps, 500);
        assertEq(c.budget, 1_000 * 1e6);
        assertEq(c.spent, 0);
        assertTrue(c.isActive);
    }

    function test_DistributeCashback_Success() public {
        uint256 billAmount = 100 * 1e6; // 100 USDC bill
        // 5% cashback on 100 USDC = 5 USDC (5 * 1e6)

        vm.prank(paymentContract);
        uint256 cashback = rewardPool.distributeCashback(CAMPAIGN_ID, customer, billAmount);

        assertEq(cashback, 5 * 1e6);
        assertEq(usdc.balanceOf(customer), 5 * 1e6);

        IRewardPool.Campaign memory c = rewardPool.getCampaign(CAMPAIGN_ID);
        assertEq(c.spent, 5 * 1e6);
    }

    function test_DistributeCashback_MaxCapEnforcement() public {
        uint256 hugeBill = 2_000 * 1e6; // 2,000 USDC bill
        // 5% of 2,000 = 100 USDC, but max cap is 50 USDC

        vm.prank(paymentContract);
        uint256 cashback = rewardPool.distributeCashback(CAMPAIGN_ID, customer, hugeBill);

        assertEq(cashback, 50 * 1e6);
        assertEq(usdc.balanceOf(customer), 50 * 1e6);
    }

    function test_DistributeCashback_BelowMinSpend() public {
        uint256 smallBill = 5 * 1e6; // 5 USDC (min is 10 USDC)

        vm.prank(paymentContract);
        uint256 cashback = rewardPool.distributeCashback(CAMPAIGN_ID, customer, smallBill);

        assertEq(cashback, 0);
        assertEq(usdc.balanceOf(customer), 0);
    }

    function test_DistributeCashback_UnauthorizedCallerReverts() public {
        vm.prank(customer);
        vm.expectRevert(RewardPool.UnauthorizedCaller.selector);
        rewardPool.distributeCashback(CAMPAIGN_ID, customer, 100 * 1e6);
    }

    function test_DistributeCashback_ExpiredCampaign() public {
        // Fast forward 8 days
        vm.warp(block.timestamp + 8 days);

        vm.prank(paymentContract);
        uint256 cashback = rewardPool.distributeCashback(CAMPAIGN_ID, customer, 100 * 1e6);

        assertEq(cashback, 0);
    }
}
