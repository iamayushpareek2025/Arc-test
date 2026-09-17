// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IRewardPool.sol";

/**
 * @title RewardPool
 * @author DineBack Core Team
 * @notice Manages merchant cashback campaigns, token vault reserves, and atomic cashback distribution on Arc.
 */
contract RewardPool is IRewardPool, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The settlement token (Arc USDC)
    IERC20 public immutable paymentToken;

    /// @notice The authorized DineBackPayment settlement contract
    address public paymentContract;

    /// @notice Max basis points constant (10000 = 100%)
    uint16 public constant MAX_BPS = 10_000;

    /// @notice Mapping from campaign ID to Campaign data
    mapping(bytes32 => Campaign) private _campaigns;

    /// @notice Custom Errors for Gas Optimization
    error UnauthorizedCaller();
    error InvalidAddress();
    error InvalidBps();
    error InvalidTimestamps();
    error CampaignNotFound();
    error CampaignNotActive();
    error CampaignNotStarted();
    error CampaignExpired();
    error BillBelowMinSpend();
    error InsufficientCampaignBudget();
    error InsufficientPoolBalance();
    error ZeroAmount();

    modifier onlyPaymentContract() {
        if (msg.sender != paymentContract && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(address _paymentToken) Ownable(msg.sender) {
        if (_paymentToken == address(0)) revert InvalidAddress();
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice Set or update the authorized DineBackPayment contract address
     * @param _paymentContract Address of the payment settlement contract
     */
    function setPaymentContract(address _paymentContract) external onlyOwner {
        if (_paymentContract == address(0)) revert InvalidAddress();
        paymentContract = _paymentContract;
    }

    /**
     * @notice Create a new cashback campaign
     * @param campaignId Unique identifier for the campaign
     * @param restaurant The restaurant wallet owning this campaign
     * @param cashbackBps Cashback percentage in basis points (e.g. 500 = 5%)
     * @param minSpend Minimum payment required to qualify for cashback
     * @param maxCashback Maximum cashback cap per single transaction
     * @param initialBudget Initial budget allocated for this campaign
     * @param validFrom Start timestamp (seconds)
     * @param validTo End timestamp (seconds)
     */
    function createCampaign(
        bytes32 campaignId,
        address restaurant,
        uint16 cashbackBps,
        uint256 minSpend,
        uint256 maxCashback,
        uint256 initialBudget,
        uint256 validFrom,
        uint256 validTo
    ) external onlyOwner {
        if (campaignId == bytes32(0)) revert InvalidAddress();
        if (restaurant == address(0)) revert InvalidAddress();
        if (cashbackBps == 0 || cashbackBps > MAX_BPS) revert InvalidBps();
        if (validTo <= validFrom) revert InvalidTimestamps();

        _campaigns[campaignId] = Campaign({
            id: campaignId,
            restaurant: restaurant,
            cashbackBps: cashbackBps,
            minSpend: minSpend,
            maxCashback: maxCashback,
            budget: initialBudget,
            spent: 0,
            validFrom: validFrom,
            validTo: validTo,
            isActive: true
        });

        emit CampaignCreated(
            campaignId,
            restaurant,
            cashbackBps,
            minSpend,
            maxCashback,
            initialBudget,
            validFrom,
            validTo
        );
    }

    /**
     * @notice Fund a campaign's reward budget
     * @param campaignId ID of the campaign to fund
     * @param amount Amount of USDC tokens to deposit into the campaign budget
     */
    function fundCampaign(bytes32 campaignId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.id == bytes32(0)) revert CampaignNotFound();

        campaign.budget += amount;
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        emit CampaignFunded(campaignId, msg.sender, amount);
    }

    /**
     * @notice Toggle campaign active status
     * @param campaignId Campaign identifier
     * @param isActive New status
     */
    function setCampaignStatus(bytes32 campaignId, bool isActive) external onlyOwner {
        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.id == bytes32(0)) revert CampaignNotFound();

        campaign.isActive = isActive;
        emit CampaignStatusUpdated(campaignId, isActive);
    }

    /**
     * @notice Distribute cashback to a customer upon successful payment
     * @dev Called atomically by DineBackPayment contract
     * @param campaignId ID of the active campaign
     * @param recipient Customer wallet address receiving the cashback
     * @param billAmount Amount paid in the restaurant bill
     * @return cashbackAmount Actual cashback distributed in token base units
     */
    function distributeCashback(
        bytes32 campaignId,
        address recipient,
        uint256 billAmount
    ) external onlyPaymentContract nonReentrant returns (uint256 cashbackAmount) {
        if (recipient == address(0)) revert InvalidAddress();
        if (billAmount == 0) revert ZeroAmount();

        Campaign storage campaign = _campaigns[campaignId];
        if (campaign.id == bytes32(0)) return 0; // Silently skip if campaign does not exist
        if (!campaign.isActive) return 0;
        if (block.timestamp < campaign.validFrom || block.timestamp > campaign.validTo) return 0;
        if (billAmount < campaign.minSpend) return 0;

        // Calculate cashback: (billAmount * cashbackBps) / 10000
        uint256 calculated = (billAmount * uint256(campaign.cashbackBps)) / MAX_BPS;

        // Apply maximum cap per payment if set
        if (campaign.maxCashback > 0 && calculated > campaign.maxCashback) {
            calculated = campaign.maxCashback;
        }

        // Check remaining budget
        if (campaign.spent + calculated > campaign.budget) {
            calculated = campaign.budget > campaign.spent ? campaign.budget - campaign.spent : 0;
        }

        if (calculated == 0) return 0;

        uint256 poolBalance = paymentToken.balanceOf(address(this));
        if (poolBalance < calculated) return 0;

        // Update state before external transfer (Checks-Effects-Interactions)
        campaign.spent += calculated;

        // Transfer reward tokens directly to customer
        paymentToken.safeTransfer(recipient, calculated);

        emit CashbackDistributed(campaignId, recipient, billAmount, calculated);
        return calculated;
    }

    /**
     * @notice Fetch campaign information
     * @param campaignId Unique campaign ID
     */
    function getCampaign(bytes32 campaignId) external view returns (Campaign memory) {
        return _campaigns[campaignId];
    }

    /**
     * @notice Emergency withdraw tokens (onlyOwner)
     * @param token Address of token to withdraw
     * @param amount Amount to withdraw
     * @param to Destination address
     */
    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        IERC20(token).safeTransfer(to, amount);
    }
}
