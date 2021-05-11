// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


contract WhitelistRole is Initializable, ContextUpgradeable, AccessControlUpgradeable {
    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");

    event WhitelistAdded(address indexed account);
    event WhitelistRemoved(address indexed account);
    event WhitelistRevoked(address indexed account);

    function __WhitelistRole_init() public initializer{
         // Grant the contract deployer the default admin role: it will be able
        // to grant and revoke any roles
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        // Grant the contract deployer the WHITELIST_ROLE role
        grantRole(WHITELIST_ROLE, _msgSender());
        emit WhitelistAdded(_msgSender());
    }

    modifier onlyWhitelist() {
        require(
            hasRole(WHITELIST_ROLE, _msgSender()),
            "WhitelistRole: Caller is not a whitelist role"
        );
        _;
    }

    function isWhitelist(address account)
        public
        view
        returns (bool)
    {
        return hasRole(WHITELIST_ROLE, account);
    }

    function addWhitelist(address account) public {
        grantRole(WHITELIST_ROLE, account);
        emit WhitelistAdded(account);
    }

    function renounceWhitelist() public onlyWhitelist{
        renounceRole(WHITELIST_ROLE, _msgSender());
        emit WhitelistRemoved(_msgSender());
    }


    function revokeWhitelist(address account_) public onlyWhitelist{
        revokeRole(WHITELIST_ROLE, account_);
        emit WhitelistRevoked(account_);
    }
}
