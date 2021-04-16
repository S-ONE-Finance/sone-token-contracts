module.exports.reasonRevert = {
    onlyOwner            : "Ownable: caller is not the owner",
    cantTransfer         : "SoneToken: your SONE can't transfer right now",
    lockOverBalance      : "SoneToken: lock amount over blance",
    mintOverCap          : "ERC20Capped: cap exceeded",
    accessWhitelist      : "WhitelistRole: Caller is not a whitelist role",
    accessBurn           : "ERC20: burn amount exceeds allowance",
    setAllowTransferOn   : "SoneToken: invalid new allowTransferOn"
}