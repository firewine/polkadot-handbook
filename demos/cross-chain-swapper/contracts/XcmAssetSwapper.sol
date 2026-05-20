// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title XcmAssetSwapper
/// @notice Demonstration contract for tracking cross-chain swap intents.
/// @dev Real Moonbeam/Astar deployments would pair this with the chain's XCM
/// precompile or an off-chain relayer that submits the XCM instructions.
contract XcmAssetSwapper {
    struct SwapIntent {
        address user;
        uint32 sourceParaId;
        uint32 destinationParaId;
        bytes32 asset;
        uint256 amount;
        uint256 minDestinationAmount;
        uint64 createdAt;
        bool settled;
    }

    uint256 public nextIntentId = 1;
    mapping(uint256 => SwapIntent) public intents;

    event SwapIntentCreated(
        uint256 indexed intentId,
        address indexed user,
        uint32 indexed destinationParaId,
        uint32 sourceParaId,
        bytes32 asset,
        uint256 amount,
        uint256 minDestinationAmount
    );

    event SwapIntentSettled(
        uint256 indexed intentId,
        address indexed user,
        uint256 deliveredAmount
    );

    function createSwapIntent(
        uint32 sourceParaId,
        uint32 destinationParaId,
        bytes32 asset,
        uint256 amount,
        uint256 minDestinationAmount
    ) external returns (uint256 intentId) {
        require(sourceParaId != destinationParaId, "same parachain");
        require(amount > 0, "amount is zero");
        require(minDestinationAmount > 0, "minimum output is zero");

        intentId = nextIntentId++;
        intents[intentId] = SwapIntent({
            user: msg.sender,
            sourceParaId: sourceParaId,
            destinationParaId: destinationParaId,
            asset: asset,
            amount: amount,
            minDestinationAmount: minDestinationAmount,
            createdAt: uint64(block.timestamp),
            settled: false
        });

        emit SwapIntentCreated(
            intentId,
            msg.sender,
            destinationParaId,
            sourceParaId,
            asset,
            amount,
            minDestinationAmount
        );
    }

    function markSettled(uint256 intentId, uint256 deliveredAmount) external {
        SwapIntent storage intent = intents[intentId];
        require(intent.user != address(0), "unknown intent");
        require(!intent.settled, "already settled");
        require(deliveredAmount >= intent.minDestinationAmount, "slippage");

        intent.settled = true;
        emit SwapIntentSettled(intentId, intent.user, deliveredAmount);
    }
}
