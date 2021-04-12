// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

import "./WhitelistRole.sol";

// SONE Token based on ERC-20 standard
contract SoneToken is ERC20, ERC20Capped, ERC20Burnable, Ownable, WhitelistRole {
    uint256 private _cap = 100000000e18;                    // Maximum supply
    uint256 private _totalLock;                             // Pre-caculate total locked SONE tokens

    // uint256 public allowTransferOn = 12549338;           // Blocker number 12549338 (on mainnet) ~ 2021-05-31 23:59:59 GMT+9 timezone
    uint256 public allowTransferOn = 10270806;              // Blocker number 10270806 (on ropsten) ~ 2021-05-31 23:59:59 GMT+9 timezone
    uint256 public lockFromBlock;                           // Block number that SONE token is locked from
    uint256 public lockToBlock;                             // Block number that SONE token is locked to

    mapping(address => uint256) private _locks;             // Current locked SONE of each address
    mapping(address => uint256) private _lastUnlockBlock;   // The last block number that a address's SONE is unlocked

    event Lock(address indexed to, uint256 value);

    constructor(uint256 lockFromBlock_, uint256 lockToBlock_) 
    ERC20("SONE Token", "SONE")
    ERC20Capped(_cap) {
        lockFromBlock = lockFromBlock_;
        lockToBlock = lockToBlock_;
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
        require(_holder != address(0), "ERC20: lock to the zero address");
        require(_amount <= balanceOf(_holder), "ERC20: lock amount over blance");

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
        require(_locks[msg.sender] > 0, "ERC20: there aren't SONE to unlock");
        
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
    function _mint(address account, uint256 amount) internal virtual override(ERC20, ERC20Capped) {
        super._mint(account, amount);
    }

    /**
     * @dev See {ERC20-_transfer}.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal virtual override(ERC20) {
        require(block.number > allowTransferOn);
        super._transfer(sender, recipient, amount);
    }
}