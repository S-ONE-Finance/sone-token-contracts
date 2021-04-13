module.exports.errTypes = {
    onlyOwner            : "Ownable: caller is not the owner",
    cantTransfer         : "Can not transfer at time",
    lockOverBalance      : "ERC20: lock amount over blance",
    mintOverCap          : "ERC20Capped: cap exceeded",
    accessWhitelist      : "WhitelistRole: Caller is not a whitelist role",
    accessBurn           : "ERC20: burn amount exceeds allowance"
}

module.exports.tryCatch = async function(promise, errType) {
    try {
        await promise;
        throw null;
    }
    catch (error) {
        assert(error.reason, errType);
    }
};