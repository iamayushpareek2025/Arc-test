// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRewardPool {
    struct Campaign {
        bytes32 id;
        address restaurant;
        uint16 cashbackBps;      // e.g. 500 = 5.00%
        uint256 minSpend;         // Minimum bill amount in token base units
        uint256 maxCashback;      // Max cashback ceiling per payment in token base units
        uint256 budget;           // Total allocated budget
        uint256 spent;            // Total distributed so far
        uint256 validFrom;        // Start timestamp
        uint256 validTo;          // End timestamp
        bool isActive;            // Active flag
    }

    event CampaignCreated(
        bytes32 indexed campaignId,
        address indexed restaurant,
        uint16 cashbackBps,
        uint256 minSpend,
        uint256 maxCashback,
        uint256 budget,
        uint256 validFrom,
        uint256 validTo
    );

    event CampaignFunded(bytes32 indexed campaignId, address indexed funder, uint256 amount);
    event CampaignStatusUpdated(bytes32 indexed campaignId, bool isActive);
    event CashbackDistributed(
        bytes32 indexed campaignId,
        address indexed recipient,
        uint256 billAmount,
        uint256 cashbackAmount
    );

    function distributeCashback(
        bytes32 campaignId,
        address recipient,
        uint256 billAmount
    ) external returns (uint256 cashbackAmount);

    function getCampaign(bytes32 campaignId) external view returns (Campaign memory);
}
