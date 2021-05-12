// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./WhitelistRole.sol";

// SONE Token based on ERC-20 standard
contract SoneToken is Initializable, OwnableUpgradeable, ERC20Upgradeable, ERC20CappedUpgradeable, ERC20BurnableUpgradeable, WhitelistRole {
    uint256 private _cap;                                   // Maximum supply
    uint256 private _totalLock;                             // Pre-caculate total locked SONE tokens

    uint256 public allowTransferOn;
    uint256 public lockFromBlock;                           // Block number that SONE token is locked from
    uint256 public lockToBlock;                             // Block number that SONE token is locked to

    mapping(address => uint256) private _locks;             // Current locked SONE of each address
    mapping(address => uint256) private _lastUnlockBlock;   // The last block number that a address's SONE is unlocked

    event Lock(address indexed to, uint256 value);

    function __SoneToken_init(uint256 lockFromBlock_, uint256 lockToBlock_) public initializer{
        _cap = 100000000e18;
        allowTransferOn = 12743793;                         // Blocker number 12743793 (on mainnet) ~ 2021-07-01 00:00:00 GMT+8 timezone
        lockFromBlock = lockFromBlock_;
        lockToBlock = lockToBlock_;
        __ERC20_init("SONE Token", "SONE");
        __ERC20Capped_init(_cap);
        __Ownable_init();
        __ERC20Burnable_init();
        __WhitelistRole_init();
    }

    /**
     * @dev Return current circulatable SONE tokens.
     */
    function circulatingSupply() public view returns (uint256) {
        return super.totalSupply() - _totalLock;
    }

    /**
     * @dev Return total locked SONE tokens.
     */
    function totalLock() public view returns (uint256) {
        return _totalLock;
    }

    /**
     * @dev See {ERC20-_mint}.
     * Can only be called by the current owner.
     */
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    /**
     * @dev Return total SONE balance of a address.
     */
    function totalBalanceOf(address _holder) public view returns (uint256) {
        return _locks[_holder] + balanceOf(_holder);
    }

    /**
     * @dev Return locked SONE token of a address.
     */
    function lockOf(address _holder) public view returns (uint256) {
        return _locks[_holder];
    }

    /**
     * @dev Return block number that contains the last unlock call by a address.
     */
    function lastUnlockBlock(address _holder) public view returns (uint256) {
        return _lastUnlockBlock[_holder];
    }

    /**
     * @dev Lock a SONE token amount of a address.
     */
    function lock(address _holder, uint256 _amount) public onlyOwner {
        require(_holder != address(0), "SoneToken: lock to the zero address");
        require(_amount <= balanceOf(_holder), "SoneToken: lock amount over blance");

        _transfer(_holder, address(this), _amount);

        _locks[_holder] = _locks[_holder] + _amount;
        _totalLock = _totalLock + _amount;
        if (_lastUnlockBlock[_holder] < lockFromBlock) {
            _lastUnlockBlock[_holder] = lockFromBlock;
        }
        emit Lock(_holder, _amount);
    }

    /**
     * @dev Return number of SONE token that the address can unlock.
     */
    function canUnlockAmount(address _holder) public view returns (uint256) {
        if (block.number < lockFromBlock) {
            return 0;
        }
        else if (block.number >= lockToBlock) {
            return _locks[_holder];
        }
        else {
            uint256 releaseBlock = block.number + _lastUnlockBlock[_holder];
            uint256 numberLockBlock = lockToBlock + _lastUnlockBlock[_holder];
            return _locks[_holder] * releaseBlock / numberLockBlock;
        }
    }

    /**
     * @dev Unlock SONE token for the sender
     */
    function unlock() public {
        require(_locks[msg.sender] > 0, "SoneToken: there aren't SONE to unlock");
        
        uint256 amount = canUnlockAmount(msg.sender);
        if (amount > balanceOf(address(this))) {
            amount = balanceOf(address(this));
        }
        _transfer(address(this), msg.sender, amount);
        _locks[msg.sender] = _locks[msg.sender] - amount;
        _lastUnlockBlock[msg.sender] = block.number;
        _totalLock = _totalLock - amount;
    }

    /**
     * @dev Dev address migrate all balance to a multi sig address
     */
    function transferAll(address _to) public {
        _locks[_to] = _locks[_to] + _locks[msg.sender];

        if (_lastUnlockBlock[_to] < lockFromBlock) {
            _lastUnlockBlock[_to] = lockFromBlock;
        }

        if (_lastUnlockBlock[_to] < _lastUnlockBlock[msg.sender]) {
            _lastUnlockBlock[_to] = _lastUnlockBlock[msg.sender];
        }

        _locks[msg.sender] = 0;
        _lastUnlockBlock[msg.sender] = 0;

        _transfer(msg.sender, _to, balanceOf(msg.sender));
    }

    /**
     * @dev See {ERC20Capped-_mint}.
     */
    function _mint(address account, uint256 amount) internal virtual override(ERC20Upgradeable, ERC20CappedUpgradeable) {
        super._mint(account, amount);
    }

    /**
     * @dev See {ERC20-_transfer}.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal virtual override(ERC20Upgradeable) {
        require(block.number > allowTransferOn || hasRole(WHITELIST_ROLE, sender), "SoneToken: your SONE can't transfer right now");
        super._transfer(sender, recipient, amount);
    }
    /**
     * @dev Set from block to lock balance
     * Can only be called by the current owner.
     */
    function setLockFromBlock(uint256 lockFromBlock_) external onlyOwner{
        lockFromBlock = lockFromBlock_;
    }
    /**
     * @dev Set to block to lock balance
     * Can only be called by the current owner.
     */
    function setLockToBlock(uint256 lockToBlock_) external onlyOwner{
        lockToBlock = lockToBlock_;
    }
    /**
     * @dev Set block allow transfer on
     * Can only be called by the current owner.
     */
    function setAllowTransferOn(uint256 allowTransferOn_) external onlyOwner{
        require(block.number < allowTransferOn && allowTransferOn_ < allowTransferOn, "SoneToken: invalid new allowTransferOn");
        allowTransferOn = allowTransferOn_;
    }
}