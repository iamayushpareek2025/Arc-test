// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDineBackPayment {
    struct PaymentRecord {
        bytes32 paymentId;
        address customer;
        address restaurant;
        uint256 amount;
        uint256 cashback;
        bytes32 campaignId;
        uint256 timestamp;
    }

    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed customer,
        address indexed restaurant,
        uint256 amount,
        uint256 cashback,
        bytes32 campaignId
    );

    event PlatformFeeUpdated(uint16 feeBps);
    event FeeRecipientUpdated(address feeRecipient);
    event RewardPoolUpdated(address rewardPool);

    function payBill(
        bytes32 paymentId,
        address restaurant,
        uint256 amount,
        bytes32 campaignId,
        uint256 deadline
    ) external returns (uint256 cashbackAmount);

    function getPayment(bytes32 paymentId) external view returns (PaymentRecord memory);
    function isPaymentPaid(bytes32 paymentId) external view returns (bool);
}
