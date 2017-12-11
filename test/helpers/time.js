// Returns the time of the last mined block in seconds
export function latestTime() {
    return web3.eth.getBlock('latest').timestamp;
}

// Increases testrpc time by the passed duration in seconds
export function increaseTime(duration) {
    const id = Date.now();

    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [duration],
            id: id,
        }, err1 => {
            if (err1) return reject(err1);

            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_mine',
                id: id + 1,
            }, (err2, res) => (err2 ? reject(err2) : resolve(res)));
        });
    });
}

/**
 * Beware that due to the need of calling two separate testrpc methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
export function increaseTimeTo(target) {
    const now = latestTime();
    if (target < now) {
        throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
    }
    const diff = target - now;
    return increaseTime(diff);
}
