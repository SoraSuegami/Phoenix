"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const range_check = require('range_check');
const block_ips = [
    ["133.0.0.0", "133.255.255.255"],
    ["192.50.0.0", "192.50.255.255"],
    ["192.218.0.0", "192.218.255.255"],
    ["192.244.0.0", "192.244.255.255"],
    ["202.11.0.0", "202.11.255.255"],
    ["202.13.0.0", "202.13.255.255"],
    ["202.15.0.0", "202.19.255.255"],
    ["202.23.0.0", "202.26.255.255"],
    ["202.32.0.0", "202.35.255.255"],
    ["202.48.0.0", "202.48.255.255"],
    ["202.208.0.0", "202.255.255.255"],
    ["203.136.0.0", "203.141.255.255"],
    ["203.178.0.0", "203.183.255.255"],
    ["210.128.0.0", "210.159.255.255"],
    ["210.160.0.0", "210.175.255.255"],
    ["210.188.0.0", "210.191.255.255"],
    ["210.196.0.0", "210.199.255.255"],
    ["210.224.0.0", "210.239.255.255"],
    ["210.248.0.0", "210.255.255.255"],
    ["211.0.0.0", "211.7.255.255"],
    ["211.8.0.0", "211.19.255.255"],
    ["211.120.0.0", "211.135.255.255"],
    ["218.40.0.0", "218.47.255.255"],
    ["218.110.0.0", "218.110.255.255"],
    ["218.216.0.0", "218.231.255.255"],
    ["219.96.0.0", "219.127.255.255"],
    ["219.160.0.0", "219.165.255.255"],
    ["219.166.0.0", "219.167.255.255"],
    ["220.96.0.0", "220.99.255.255"],
    ["220.104.0.0", "220.111.255.255"],
    ["220.144.0.0", "220.145.255.255"],
    ["220.208.0.0", "220.223.255.255"],
    ["221.112.0.0", "221.119.255.255"],
    ["61.112.0.0", "61.127.255.255"],
    ["61.192.0.0", "61.199.255.255"],
    ["61.200.0.0", "61.215.255.255"]
];
function IP_to_Number_Str(host) {
    return host.replace(/\./g, "").split(":")[0];
}
exports.IP_to_Number_Str = IP_to_Number_Str;
function AccessBlock(host) {
    //const hostname = req.headers.host;
    const target = IP_to_Number_Str(host);
    if (target == "localhost")
        return false;
    return block_ips.some((ips) => {
        return Number(target) >= Number(IP_to_Number_Str(ips[0])) && Number(target) <= Number(IP_to_Number_Str(ips[1]));
    });
}
exports.AccessBlock = AccessBlock;