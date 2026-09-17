// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IDineBackPayment.sol";
import "./interfaces/IRewardPool.sol";

/**
 * @title DineBackPayment
 * @author DineBack Core Team
 * @notice Core restaurant settlement & programmable cashback execution contract on Arc.
 */
contract DineBackPayment is IDineBackPayment, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The settlement token (Arc USDC)
    IERC20 public immutable paymentToken;

    /// @notice The connected RewardPool contract
    IRewardPool public rewardPool;

    /// @notice Fee recipient wallet
    address public feeRecipient;

    /// @notice Platform fee in basis points (e.g. 50 = 0.50%). Default 0.
    uint16 public feeBps;

    /// @notice Maximum allowed fee basis points (500 = 5.00%)
    uint16 public constant MAX_FEE_BPS = 500;
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Mapping from unique payment ID to paid status
    mapping(bytes32 => bool) public override isPaymentPaid;

    /// @notice Mapping from unique payment ID to historical PaymentRecord
    mapping(bytes32 => PaymentRecord) private _payments;

    /// @notice Custom Errors
    error PaymentAlreadyPaid(bytes32 paymentId);
    error PaymentExpired(uint256 deadline, uint256 currentTimestamp);
    error InvalidRestaurant();
    error InvalidAmount();
    error InvalidAddress();
    error ZeroPaymentId();
    error InvalidFeeBps();

    constructor(
        address _paymentToken,
        address _rewardPool,
        address _feeRecipient
    ) Ownable(msg.sender) {
        if (_paymentToken == address(0)) revert InvalidAddress();
        if (_feeRecipient == address(0)) revert InvalidAddress();

        paymentToken = IERC20(_paymentToken);
        rewardPool = IRewardPool(_rewardPool);
        feeRecipient = _feeRecipient;
        feeBps = 0; // 0 fee by default for merchant friendly adoption
    }

    /**
     * @notice Update the RewardPool contract address
     * @param _rewardPool Address of the RewardPool contract
     */
    function setRewardPool(address _rewardPool) external onlyOwner {
        if (_rewardPool == address(0)) revert InvalidAddress();
        rewardPool = IRewardPool(_rewardPool);
        emit RewardPoolUpdated(_rewardPool);
    }

    /**
     * @notice Update platform fee basis points (max 5%)
     * @param _feeBps New fee in basis points
     */
    function setPlatformFee(uint16 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert InvalidFeeBps();
        feeBps = _feeBps;
        emit PlatformFeeUpdated(_feeBps);
    }

    /**
     * @notice Update platform fee recipient address
     * @param _feeRecipient New recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert InvalidAddress();
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    /**
     * @notice Pay a restaurant invoice in USDC with atomic on-chain cashback distribution
     * @param paymentId Unique identifier for the payment request
     * @param restaurant The restaurant wallet address receiving the funds
     * @param amount The bill payment amount in token units (USDC)
     * @param campaignId Optional active cashback campaign ID (or bytes32(0))
     * @param deadline Invoice expiration timestamp in unix seconds
     * @return cashbackAmount The actual cashback disbursed to the customer in token base units
     */
    function payBill(
        bytes32 paymentId,
        address restaurant,
        uint256 amount,
        bytes32 campaignId,
        uint256 deadline
    ) external override nonReentrant returns (uint256 cashbackAmount) {
        // Validation checks
        if (paymentId == bytes32(0)) revert ZeroPaymentId();
        if (isPaymentPaid[paymentId]) revert PaymentAlreadyPaid(paymentId);
        if (restaurant == address(0)) revert InvalidRestaurant();
        if (amount == 0) revert InvalidAmount();
        if (block.timestamp > deadline) revert PaymentExpired(deadline, block.timestamp);

        // State Update (Checks-Effects-Interactions)
        isPaymentPaid[paymentId] = true;

        // Calculate fee and merchant payout
        uint256 platformFee = 0;
        if (feeBps > 0) {
            platformFee = (amount * uint256(feeBps)) / BPS_DENOMINATOR;
        }
        uint256 merchantAmount = amount - platformFee;

        // Transfer funds from customer to restaurant
        paymentToken.safeTransferFrom(msg.sender, restaurant, merchantAmount);

        // Transfer platform fee if applicable
        if (platformFee > 0) {
            paymentToken.safeTransferFrom(msg.sender, feeRecipient, platformFee);
        }

        // Process atomic cashback via RewardPool if campaign is specified
        if (campaignId != bytes32(0) && address(rewardPool) != address(0)) {
            try rewardPool.distributeCashback(campaignId, msg.sender, amount) returns (
                uint256 reward
            ) {
                cashbackAmount = reward;
            } catch {
                // If reward pool reverts, payment still succeeds; cashback recorded as 0
                cashbackAmount = 0;
            }
        }

        // Record payment details
        _payments[paymentId] = PaymentRecord({
            paymentId: paymentId,
            customer: msg.sender,
            restaurant: restaurant,
            amount: amount,
            cashback: cashbackAmount,
            campaignId: campaignId,
            timestamp: block.timestamp
        });

        // Emit verified on-chain event
        emit PaymentCompleted(
            paymentId,
            msg.sender,
            restaurant,
            amount,
            cashbackAmount,
            campaignId
        );

        return cashbackAmount;
    }

    /**
     * @notice Read historical payment record
     * @param paymentId Unique payment request ID
     */
    function getPayment(bytes32 paymentId) external view override returns (PaymentRecord memory) {
        return _payments[paymentId];
    }
}
