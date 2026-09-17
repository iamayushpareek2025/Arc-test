// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DineBackPayment.sol";
import "../src/RewardPool.sol";
import "./mocks/MockUSDC.sol";

contract DineBackPaymentTest is Test {
    DineBackPayment public paymentContract;
    RewardPool public rewardPool;
    MockUSDC public usdc;

    address public owner = address(0xABCD);
    address public restaurant = address(0x1111);
    address public customer = address(0x2222);
    address public feeRecipient = address(0x9999);

    bytes32 public constant PAYMENT_ID_1 = keccak256("INVOICE_001");
    bytes32 public constant CAMPAIGN_ID = keccak256("WEEKEND_SPECIAL");

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        rewardPool = new RewardPool(address(usdc));
        paymentContract = new DineBackPayment(
            address(usdc),
            address(rewardPool),
            feeRecipient
        );
        rewardPool.setPaymentContract(address(paymentContract));

        // Create & fund cashback campaign (5% cashback, 50 USDC max)
        rewardPool.createCampaign(
            CAMPAIGN_ID,
            restaurant,
            500, // 5%
            10 * 1e6, // 10 USDC min
            50 * 1e6, // 50 USDC max
            1_000 * 1e6, // 1,000 USDC budget
            block.timestamp,
            block.timestamp + 7 days
        );
        vm.stopPrank();

        // Mint USDC to owner & fund pool
        usdc.mint(owner, 1_000 * 1e6);
        vm.startPrank(owner);
        usdc.approve(address(rewardPool), type(uint256).max);
        rewardPool.fundCampaign(CAMPAIGN_ID, 1_000 * 1e6);
        vm.stopPrank();

        // Mint USDC to customer and approve payment contract
        usdc.mint(customer, 500 * 1e6);
        vm.startPrank(customer);
        usdc.approve(address(paymentContract), type(uint256).max);
        vm.stopPrank();
    }

    function test_PayBill_SuccessfulPaymentWithCashback() public {
        uint256 billAmount = 100 * 1e6; // 100 USDC bill
        uint256 deadline = block.timestamp + 1 hours;

        vm.prank(customer);
        uint256 cashback = paymentContract.payBill(
            PAYMENT_ID_1,
            restaurant,
            billAmount,
            CAMPAIGN_ID,
            deadline
        );

        // Assertions
        assertEq(cashback, 5 * 1e6); // 5% of 100 USDC
        assertEq(usdc.balanceOf(restaurant), 100 * 1e6); // Restaurant got 100 USDC
        // Customer spent 100 USDC and received 5 USDC cashback (500 - 100 + 5 = 405 USDC)
        assertEq(usdc.balanceOf(customer), 405 * 1e6);
        assertTrue(paymentContract.isPaymentPaid(PAYMENT_ID_1));

        IDineBackPayment.PaymentRecord memory record = paymentContract.getPayment(PAYMENT_ID_1);
        assertEq(record.customer, customer);
        assertEq(record.restaurant, restaurant);
        assertEq(record.amount, 100 * 1e6);
        assertEq(record.cashback, 5 * 1e6);
    }

    function test_PayBill_ReplayAttackReverts() public {
        uint256 billAmount = 50 * 1e6;
        uint256 deadline = block.timestamp + 1 hours;

        vm.prank(customer);
        paymentContract.payBill(
            PAYMENT_ID_1,
            restaurant,
            billAmount,
            CAMPAIGN_ID,
            deadline
        );

        // Attempt second payment with same paymentId
        vm.prank(customer);
        vm.expectRevert(
            abi.encodeWithSelector(
                DineBackPayment.PaymentAlreadyPaid.selector,
                PAYMENT_ID_1
            )
        );
        paymentContract.payBill(
            PAYMENT_ID_1,
            restaurant,
            billAmount,
            CAMPAIGN_ID,
            deadline
        );
    }

    function test_PayBill_ExpiredPaymentReverts() public {
        uint256 billAmount = 50 * 1e6;
        uint256 deadline = block.timestamp + 10 minutes;

        // Warp past deadline
        vm.warp(block.timestamp + 15 minutes);

        vm.prank(customer);
        vm.expectRevert(
            abi.encodeWithSelector(
                DineBackPayment.PaymentExpired.selector,
                deadline,
                block.timestamp
            )
        );
        paymentContract.payBill(
            PAYMENT_ID_1,
            restaurant,
            billAmount,
            CAMPAIGN_ID,
            deadline
        );
    }

    function test_PayBill_ZeroAmountReverts() public {
        uint256 deadline = block.timestamp + 1 hours;

        vm.prank(customer);
        vm.expectRevert(DineBackPayment.InvalidAmount.selector);
        paymentContract.payBill(
            PAYMENT_ID_1,
            restaurant,
            0,
            CAMPAIGN_ID,
            deadline
        );
    }

    function test_PayBill_ZeroRestaurantReverts() public {
        uint256 deadline = block.timestamp + 1 hours;

        vm.prank(customer);
        vm.expectRevert(DineBackPayment.InvalidRestaurant.selector);
        paymentContract.payBill(
            PAYMENT_ID_1,
            address(0),
            50 * 1e6,
            CAMPAIGN_ID,
            deadline
        );
    }

    function test_PayBill_ZeroPaymentIdReverts() public {
        uint256 deadline = block.timestamp + 1 hours;

        vm.prank(customer);
        vm.expectRevert(DineBackPayment.ZeroPaymentId.selector);
        paymentContract.payBill(
            bytes32(0),
            restaurant,
            50 * 1e6,
            CAMPAIGN_ID,
            deadline
        );
    }
}
