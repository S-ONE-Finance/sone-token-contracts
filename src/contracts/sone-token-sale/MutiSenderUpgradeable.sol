// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./WhitelistRoleUpgradeable.sol";

contract MutiSenderUpgradeable is
    Initializable,
    OwnableUpgradeable,
    WhitelistRoleUpgradeable
{
    address _dev;
    address _soneAddr;
    uint256 _batchTxFee;
    uint256 _freeCost;

    mapping(address => bool) private _whiteList;

    event BatchETHSent(address from, uint256 value, uint256 total);
    event BatchTokenSent(address token, uint256 value, uint256 total);

    function __MutiSenderUpgradeable_init(address dev_, address soneAddress_)
        public
        initializer
    {
        _dev = dev_;
        _soneAddr = soneAddress_;
        _batchTxFee = 0.02 ether;
        _freeCost = 1 ether;

        __WhitelistRole_init();
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier checkLength(uint256 length) {
        require(length <= 255, "MutiSender: address list is too long");
        _;
    }

    /**
     *  @dev Register free whitelist
     */
    function registerFreeWhitelist() public payable {
        require(msg.value >= _freeCost);
        (bool sent, ) = _dev.call{value: msg.value}("");
        require(sent, "MutiSender: failed to send Ether");
        addWhitelist(msg.sender);
    }

    /**
     * @dev Add to free whitelist
     */
    function addFreeWhitelist(address[] memory whiteList_) public onlyOwner {
        for (uint256 i = 0; i < whiteList_.length; i++) {
            addWhitelist(whiteList_[i]);
        }
    }

    /**
     * @dev Remove from free whitelist
     */
    function removeFreeWhitelist(address[] memory whiteList_) public onlyOwner {
        for (uint256 i = 0; i < whiteList_.length; i++) {
            revokeWhitelist(whiteList_[i]);
        }
    }

    /**
     * @dev Set cost to registry free acount
     */
    function setFreeCost(uint256 fee_) public onlyOwner {
        _freeCost = fee_;
    }

    /**
     * @dev Set batch transaction fee
     */
    function setBatchFee(uint256 fee_) public onlyOwner {
        _batchTxFee = fee_;
    }

    /**
     * @dev Send ETH to a list with same value
     */
    function batchSendEthSameValue(address[] memory to_, uint256 value_) public payable checkLength(to_.length)
    {
        uint256 sentAmount = to_.length * value_;
        uint256 remainingValue = msg.value;

        bool isFree = isWhitelist(msg.sender);
        if (isFree) {
            require(
                remainingValue >= sentAmount,
                "MutiSender: ether value is not enough for total amount"
            );
        } else {
            require(
                remainingValue >= sentAmount + _batchTxFee,
                "MutiSender: ether value is not enough for total amount + batch transaction fee"
            );
        }

        for (uint8 i = 0; i < to_.length; i++) {
            remainingValue = remainingValue - value_;
            (bool sent, ) = to_[i].call{value: value_}("");
            require(sent, "MutiSender: failed to send Ether");
        }

        if (remainingValue > 0) {
            (bool sent, ) = _dev.call{value: remainingValue}("");
            require(sent, "MutiSender: failed to send Ether");
        }

        emit BatchETHSent(msg.sender, msg.value, sentAmount);
    }

    /**
     * @dev Send ETH to a list with difference value
     */
    function batchSendEthDiffValue(
        address[] memory to_,
        uint256[] memory value_
    ) public payable checkLength(to_.length) {
        require(
            to_.length == value_.length,
            "MutiSender: number of addresses is difference to number of values"
        );

        uint256 sentAmount = 0;
        uint256 remainingValue = msg.value;

        bool isFree = isWhitelist(msg.sender);
        if (isFree) {
            require(
                remainingValue >= sentAmount,
                "MutiSender: ether value is not enough for total amount"
            );
        } else {
            require(
                remainingValue >= sentAmount + _batchTxFee,
                "MutiSender: ether value is not enough for total amount + batch transaction fee"
            );
        }

        for (uint8 i = 0; i < to_.length; i++) {
            require(
                remainingValue >= value_[i],
                "MutiSender: ether value is not enough for total amount"
            );
            remainingValue = remainingValue - value_[i];
            sentAmount = sentAmount + value_[i];
            (bool sent,) = to_[i].call{value: value_[i]}("");
            require(sent, "MutiSender: failed to send Ether");
        }

        if (!isFree) {
            require(
                remainingValue >= _batchTxFee,
                "MutiSender: ether value is not enough for total amount + batch transaction fee"
            );
        }
        if (remainingValue > 0) {
            (bool sent,) = _dev.call{value: remainingValue}("");
            require(sent, "MutiSender: failed to send Ether");
        }

        emit BatchETHSent(msg.sender, msg.value, sentAmount);
    }

    function batchSendTokenSameValue(
        address tokenAddress_,
        address[] memory to_,
        uint256 value_
    ) public payable checkLength(to_.length) {
        uint256 sendValue = msg.value;
        bool isFree = isWhitelist(msg.sender);
        if (!isFree) {
            require(
                sendValue >= _batchTxFee,
                "MutiSender: ether value is not enough for total amount + batch transaction fee"
            );
            (bool sent,) = _dev.call{value: sendValue}("");
            require(sent, "MutiSender: failed to send Ether");
        }

        address from = msg.sender;
        uint256 sentAmount = to_.length * value_;

        ERC20 token = ERC20(tokenAddress_);
        for (uint8 i = 0; i < to_.length; i++) {
            token.transferFrom(from, to_[i], value_);
        }

        emit BatchTokenSent(tokenAddress_, sendValue, sentAmount);
    }

    function batchSendTokenDiffValue(
        address tokenAddress_,
        address[] memory to_,
        uint256[] memory value_
    ) public payable checkLength(to_.length) {
        require(
            to_.length == value_.length,
            "MutiSender: number of addresses is difference to number of values"
        );

        uint256 sendValue = msg.value;
        bool isFree = isWhitelist(msg.sender);
        if (!isFree) {
            require(
                sendValue >= _batchTxFee,
                "MutiSender: ether value is not enough for total amount + batch transaction fee"
            );
            (bool sent,) = _dev.call{value: sendValue}("");
            require(sent, "MutiSender: failed to send Ether");
        }

        uint256 sentAmount = 0;
        ERC20 token = ERC20(tokenAddress_);

        for (uint8 i = 0; i < to_.length; i++) {
            token.transferFrom(msg.sender, to_[i], value_[i]);
            sentAmount = sentAmount + value_[i];
        }
        emit BatchTokenSent(tokenAddress_, sendValue, sentAmount);
    }

    /**
     * @dev Drop SONE for a list addresses with same value
     */
    function dropSONE(address[] memory to_, uint256 value_) public payable {
        batchSendTokenSameValue(_soneAddr, to_, value_);
    }
}
