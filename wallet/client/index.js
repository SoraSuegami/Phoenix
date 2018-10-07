"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("../../core/basic"));
const CryptoSet = __importStar(require("../../core/crypto_set"));
const merkle_patricia_1 = require("../../core/merkle_patricia");
const TxSet = __importStar(require("../../core/tx"));
const BlockSet = __importStar(require("../../core/block"));
const StateSet = __importStar(require("../../core/state"));
const P = __importStar(require("p-iteration"));
const con_1 = require("../con");
const tx_pool_1 = require("../../core/tx_pool");
const script_1 = require("./script");
const level_browserify_1 = __importDefault(require("level-browserify"));
const gen = __importStar(require("../../genesis/index"));
const code_1 = require("../../core/code");
const script_2 = require("./script");
const bignumber_js_1 = require("bignumber.js");
const db = level_browserify_1.default('./db');
exports.trie_ins = (root) => {
    try {
        return new merkle_patricia_1.Trie(db, root);
    }
    catch (e) {
        console.log(e);
        return new merkle_patricia_1.Trie(db);
    }
};
const output_keys = (tx) => {
    if (tx.meta.kind === "request")
        return [];
    const states = tx.raw.raw.map(r => JSON.parse(r));
    return states.map(s => s.owner);
};
const pays = (tx, chain) => {
    if (tx.meta.kind === "request") {
        return [tx.meta.data.solvency];
    }
    else if (tx.meta.kind === "refresh") {
        const req_tx = TxSet.find_req_tx(tx, chain);
        return [req_tx.meta.data.solvency, tx.meta.data.payee];
    }
    else
        return [];
};
exports.states_for_tx = async (tx, chain, S_Trie) => {
    const base = tx.meta.data.base;
    const base_states = await P.reduce(base, async (result, key) => {
        const getted = await S_Trie.get(key);
        if (getted == null) {
            const token = key.split(':')[1];
            //if(_.address_form_check(key,token_name_maxsize)) return result.concat(StateSet.CreateToken(0,token));
            return result.concat(StateSet.CreateState(0, key, token, 0));
        }
        else
            return result.concat(getted);
    }, []);
    const outputs = output_keys(tx);
    const output_states = await P.reduce(outputs, async (result, key) => {
        const getted = await S_Trie.get(key);
        if (getted == null)
            return result;
        else
            return result.concat(getted);
    }, []);
    const payes = pays(tx, chain);
    const pay_states = await P.reduce(payes, async (result, key) => {
        const getted = await S_Trie.get(key);
        if (getted == null)
            return result.concat(StateSet.CreateState(0, key, con_1.native, 0));
        else
            return result.concat(getted);
    }, []);
    console.log(pay_states);
    const concated = base_states.concat(output_states).concat(pay_states);
    console.log(concated);
    const hashes = concated.map(state => _.ObjectHash(state));
    return concated.filter((val, i) => hashes.indexOf(_.ObjectHash(val)) === i);
};
exports.locations_for_tx = async (tx, chain, L_Trie) => {
    const target = (() => {
        if (tx.meta.kind === "request")
            return tx;
        else
            return TxSet.find_req_tx(tx, chain);
    })();
    const keys = target.meta.data.base.filter((val, i, array) => array.indexOf(val) === i);
    const result = await P.reduce(keys, async (array, key) => {
        if (key.split(':')[2] === _.toHash(''))
            return array;
        const getted = await L_Trie.get(key);
        if (getted == null) {
            const new_loc = {
                address: key,
                state: 'yet',
                index: 0,
                hash: _.toHash('')
            };
            return array.concat(new_loc);
        }
        else
            return array.concat(getted);
    }, []);
    /*Object.values(await L_Trie.filter(key=>{
        if(target.meta.data.base.indexOf(key)!=-1) return true;
        else if(target.meta.data.solvency===key&&target.meta.data.base.indexOf(key)===-1) return true;
        else return false;
    }));*/
    return result;
};
exports.states_for_block = async (block, chain, S_Trie) => {
    const native_validator = CryptoSet.GenereateAddress(con_1.native, _.reduce_pub(block.meta.validatorPub));
    const native_validator_state = await S_Trie.get(native_validator) || StateSet.CreateState(0, native_validator, con_1.native);
    const unit_validator = CryptoSet.GenereateAddress(con_1.unit, _.reduce_pub(block.meta.validatorPub));
    const unit_validator_state = await S_Trie.get(unit_validator) || StateSet.CreateState(0, unit_validator, con_1.unit);
    const targets = block.txs.concat(block.natives).concat(block.units).map(pure => TxSet.pure_to_tx(pure, block));
    const tx_states = await P.reduce(targets, async (result, tx) => result.concat(await exports.states_for_tx(tx, chain, S_Trie)), []);
    /*const native_states:T.State[] = await P.map(block.natives,async (tx:T.Tx)=>{
        const key = (()=>{
            if(tx.meta.kind==="request") return tx.hash;
            else return tx.meta.data.request;
        })()
        const b = (()=>{
            if(tx.meta.kind==="request") return block;
            else return chain[tx.meta.data.index] || BlockSet.empty_block();
        })();
        const i = b.natives.map(t=>t.hash).indexOf(key);
        const raw = b.raws[b.txs.length+i] || TxSet.empty_tx().raw;
        return await S_Trie.get(raw.raw[1])||StateSet.CreateState(0,raw.raw[1],native,0);
    });
    const unit_states:T.State[] = await P.reduce(block.units,async (result:T.State[],tx:T.Tx)=>{
        const key = (()=>{
            if(tx.meta.kind==="request") return tx.hash;
            else return tx.meta.data.request;
        })()
        const b = (()=>{
            if(tx.meta.kind==="request") return block;
            else return chain[tx.meta.data.index] || BlockSet.empty_block();
        })();
        const i = b.units.map(t=>t.hash).indexOf(key);
        const raw = b.raws[b.txs.length+b.natives.length+i] || TxSet.empty_tx().raw;
        const remiter:T.State = await S_Trie.get(raw.raw[1])||StateSet.CreateState(0,raw.raw[1],native,0);
        const units:T.Unit[] = JSON.parse(raw.raw[2]||"[]");
        const sellers:T.State[] = await P.map(units, async (u:T.Unit)=>await S_Trie.get(u.payee)||StateSet.CreateState(0,u.payee,native,0));
        return result.concat(sellers).concat(remiter);
    },[]) || [];*/
    const all_units = Object.values(await S_Trie.filter((key, state) => {
        return state.kind === "state" && state.token === con_1.unit;
    }));
    const native_token = await S_Trie.get("Vr:" + con_1.native + ":" + _.toHash('')) || StateSet.CreateToken(0, con_1.native);
    const unit_token = await S_Trie.get("Vr:" + con_1.unit + ":" + _.toHash('')) || StateSet.CreateToken(0, con_1.unit);
    const concated = tx_states.concat(native_validator_state).concat(unit_validator_state).concat(all_units).concat(native_token).concat(unit_token);
    return concated.filter((val, i, array) => array.map(s => _.ObjectHash(s)).indexOf(_.ObjectHash(val)) === i);
};
exports.locations_for_block = async (block, chain, L_Trie) => {
    const targets = block.txs.concat(block.natives).concat(block.units);
    const tx_loc = await P.reduce(targets, async (result, tx) => result.concat(await exports.locations_for_tx(tx, chain, L_Trie)), []);
    const native_validator = await L_Trie.get(CryptoSet.GenereateAddress(con_1.native, _.reduce_pub(block.meta.validatorPub)));
    const unit_validator = await L_Trie.get(CryptoSet.GenereateAddress(con_1.unit, _.reduce_pub(block.meta.validatorPub)));
    const concated = (() => {
        let array = _.copy(tx_loc);
        if (native_validator != null)
            array.push(native_validator);
        if (unit_validator != null)
            array.push(unit_validator);
        return array;
    })();
    return concated.filter((val, i, array) => array.map(l => _.ObjectHash(l)).indexOf(_.ObjectHash(val)) === i);
};
exports.random_chose = (array, num) => {
    for (let i = array.length - 1; i > 0; i--) {
        let r = Math.floor(Math.random() * (i + 1));
        let tmp = array[i];
        array[i] = array[r];
        array[r] = tmp;
    }
    return array.slice(0, num);
};
exports.tx_accept = async (tx, chain, roots, pool, secret, candidates, unit_store) => {
    console.log("tx_accept");
    const stateroot = roots.stateroot;
    const S_Trie = exports.trie_ins(stateroot);
    const locationroot = roots.locationroot;
    const L_Trie = exports.trie_ins(locationroot);
    const states = await exports.states_for_tx(tx, chain, S_Trie) || [];
    const locations = await exports.locations_for_tx(tx, chain, L_Trie) || [];
    const new_pool = tx_pool_1.Tx_to_Pool(pool, tx, con_1.my_version, con_1.native, con_1.unit, chain, con_1.token_name_maxsize, states, locations);
    if (tx.meta.kind === "refresh") {
        const new_unit = {
            request: tx.meta.data.request,
            index: tx.meta.data.index,
            nonce: tx.meta.nonce,
            payee: tx.meta.data.payee,
            output: tx.meta.data.output,
            unit_price: tx.meta.unit_price
        };
        const new_unit_store = _.new_obj(unit_store, (store) => {
            const valid_ref_tx = (() => {
                for (let block of _.copy(chain).slice()) {
                    let txs = block.txs.concat(block.natives).concat(block.units);
                    for (let t of _.copy(txs)) {
                        if (t.meta.kind === "refresh" && t.meta.data.request === tx.meta.data.request && t.meta.data.index === tx.meta.data.index)
                            return t;
                    }
                }
                return TxSet.empty_tx_pure();
            })();
            if (valid_ref_tx.hash != TxSet.empty_tx_pure().hash && valid_ref_tx.meta.data.output != tx.meta.data.output)
                return store;
            const pre = store[tx.meta.data.request] || [];
            if (store[tx.meta.data.request] != null && store[tx.meta.data.request].some(u => u.payee === new_unit.payee && u.index === new_unit.index))
                return _.copy(store);
            else
                store[tx.meta.data.request] = pre.concat(new_unit);
            return store;
        });
        script_1.store.commit("add_unit", new_unit);
        /*const already = (()=>{
            for(let block of chain.slice().reverse()){
                for(let tx of block.txs.concat(block.natives).concat(block.units)){
                    if(tx.meta.kind==="refresh"&&tx.meta.data.request===new_unit.request&&tx.meta.data.index===new_unit.index) return true;
                }
            }
            return false;
        })();
        console.log("already:")
        console.log(already);*/
    }
    if (_.ObjectHash(new_pool) != _.ObjectHash(pool)) {
        script_1.store.commit("refresh_pool", _.copy(new_pool));
        /*if(Object.keys(new_pool).length>=1&&unit_amount>0){
            await send_key_block(chain.slice(),secret,candidates.slice(),_.copy(roots),_.copy(new_pool),codes,validator_mode);
        }*/
        return _.copy(new_pool);
    }
    else
        return _.copy(pool);
};
exports.block_accept = async (block, chain, candidates, roots, pool, not_refreshed, now_buying, unit_store) => {
    console.log("block_accept");
    const stateroot = roots.stateroot;
    const S_Trie = exports.trie_ins(stateroot);
    const locationroot = roots.locationroot;
    const L_Trie = exports.trie_ins(locationroot);
    const StateData = await exports.states_for_block(block, chain, S_Trie);
    const LocationData = await exports.locations_for_block(block, chain, L_Trie);
    const accepted = await BlockSet.AcceptBlock(block, chain, 0, con_1.my_version, con_1.block_time, con_1.max_blocks, con_1.block_size, candidates, stateroot, locationroot, con_1.native, con_1.unit, con_1.rate, con_1.token_name_maxsize, con_1.all_issue, StateData, LocationData);
    const request_hashes = block.txs.concat(block.natives).concat(block.units).reduce((result, tx) => {
        if (tx.meta.kind === "request")
            return result;
        return result.concat(tx.meta.data.request);
    }, []);
    const requested_index_min = block.txs.concat(block.natives).concat(block.units).reduce((min, tx) => {
        if (tx.meta.kind === "request")
            return min;
        else if (new bignumber_js_1.BigNumber(tx.meta.data.index).isGreaterThanOrEqualTo(min))
            return min;
        else
            return tx.meta.data.index;
    }, _.copy(chain).length - 1);
    const reqested = (() => {
        for (let block of _.copy(chain).slice(requested_index_min)) {
            const txs = block.txs.concat(block.natives).concat(block.units);
            for (let tx of _.copy(txs)) {
                if (tx.meta.kind === "refresh" && request_hashes.indexOf(tx.meta.data.request) != -1)
                    return true;
            }
        }
        return false;
    })();
    if (accepted.block.length > 0 && !reqested) {
        await P.forEach(accepted.state, async (state) => {
            await S_Trie.put(state.owner, state);
        });
        await P.forEach(accepted.location, async (loc) => {
            await L_Trie.put(loc.address, loc);
        });
        console.log(await S_Trie.filter());
        console.log(await L_Trie.filter());
        const new_roots = {
            stateroot: S_Trie.now_root(),
            locationroot: L_Trie.now_root()
        };
        const new_pool = _.new_obj(pool, p => {
            block.txs.concat(block.natives).concat(block.units).forEach(tx => {
                Object.values(p).forEach(t => {
                    if (t.meta.kind === "refresh" && t.meta.data.index === tx.meta.data.index && t.meta.data.request === tx.meta.data.request) {
                        delete p[t.hash];
                        delete p[t.meta.data.request];
                    }
                });
            });
            return p;
        });
        const new_chain = _.copy(chain).concat(_.copy(accepted.block[0]));
        await script_1.store.commit('refresh_pool', _.copy(new_pool));
        await script_1.store.commit("refresh_roots", _.copy(new_roots));
        await script_1.store.commit("refresh_candidates", _.copy(accepted.candidates));
        await script_1.store.commit("add_block", _.copy(accepted.block[0]));
        console.log(new_chain);
        const reqs_pure = block.txs.filter(tx => tx.meta.kind === "request").concat(block.natives.filter(tx => tx.meta.kind === "request")).concat(block.units.filter(tx => tx.meta.kind === "request"));
        const refs_pure = block.txs.filter(tx => tx.meta.kind === "refresh").concat(block.natives.filter(tx => tx.meta.kind === "refresh")).concat(block.units.filter(tx => tx.meta.kind === "refresh"));
        const added_not_refresh_tx = reqs_pure.reduce((result, pure) => {
            const full_tx = TxSet.pure_to_tx(pure, block);
            script_1.store.commit('add_not_refreshed', _.copy(full_tx));
            return result.concat(full_tx);
        }, not_refreshed);
        if (refs_pure.length > 0) {
            console.log(refs_pure);
            script_1.store.commit('del_not_refreshed', _.copy(refs_pure).map(pure => pure.meta.data.request));
        }
        const now_refreshing = _.copy(script_1.store.state.now_refreshing);
        const refreshed = refs_pure.map(pure => pure.meta.data.request);
        const new_refreshing = now_refreshing.filter(key => refreshed.indexOf(key) === -1);
        script_1.store.commit('new_refreshing', new_refreshing);
        const new_not_refreshed_tx = refs_pure.reduce((result, pure) => {
            return result.filter(tx => tx.meta.kind === "request" && tx.hash != pure.meta.data.request);
        }, _.copy(added_not_refresh_tx));
        console.log(refs_pure);
        const bought_units = block.units.reduce((result, u) => {
            if (u.meta.kind === "request")
                return result;
            const ref_tx = TxSet.pure_to_tx(u, block);
            const req_tx = TxSet.find_req_tx(ref_tx, chain);
            const raw = req_tx.raw || TxSet.empty_tx().raw;
            const this_units = JSON.parse(raw.raw[1] || "[]") || [];
            return result.concat(this_units);
        }, []);
        const my_unit_buying = block.units.some(tx => {
            if (tx.meta.kind === "request")
                return false;
            const ref_tx = _.copy(TxSet.pure_to_tx(_.copy(tx), _.copy(block)));
            const req_tx = _.copy(TxSet.find_req_tx(_.copy(ref_tx), _.copy(chain)));
            const unit_address = CryptoSet.GenereateAddress(con_1.unit, CryptoSet.PublicFromPrivate(script_1.store.state.secret));
            return _.copy(req_tx).meta.data.address === unit_address;
        });
        console.log("my_unit_buying");
        console.log(my_unit_buying);
        const new_now_buying = script_1.store.state.now_buying || !my_unit_buying;
        if (my_unit_buying)
            script_1.store.commit('buying_unit', false);
        const new_unit_store = _.new_obj(unit_store, (store) => {
            bought_units.forEach(unit => {
                const com = store[unit.request] || [];
                const deleted = com.filter(c => (c.payee != unit.payee && c.index == unit.index && c.output === unit.output) || (c.index != unit.index));
                store[unit.request] = deleted;
            });
            return store;
        });
        bought_units.forEach(unit => {
            script_1.store.commit("delete_unit", _.copy(unit));
        });
        return {
            pool: _.copy(new_pool),
            roots: _.copy(new_roots),
            candidates: _.copy(accepted.candidates),
            chain: _.copy(new_chain),
            not_refreshed_tx: _.copy(new_not_refreshed_tx),
            now_buying: new_now_buying,
            unit_store: _.copy(new_unit_store)
        };
    }
    else {
        console.log("receive invalid block");
        const valids = _.copy(block.txs.concat(block.natives).concat(block.units)).map(pure => {
            const tx = TxSet.pure_to_tx(_.copy(pure), _.copy(block));
            if (tx.meta.kind === "request")
                return TxSet.ValidRequestTx(_.copy(tx), con_1.my_version, con_1.native, con_1.unit, false, _.copy(StateData), _.copy(LocationData));
            else
                return TxSet.ValidRefreshTx(_.copy(tx), _.copy(chain), con_1.my_version, con_1.native, con_1.unit, true, con_1.token_name_maxsize, _.copy(StateData), _.copy(LocationData));
        });
        console.log(valids);
        const deleted_pool = _.copy(block.txs.concat(block.natives).concat(block.units)).reduce((pool, tx, i) => {
            const target_tx = pool[tx.hash];
            if (target_tx == null)
                return pool;
            const valid = _.copy(valids[i]);
            if (valid)
                return pool;
            return _.new_obj(pool, p => {
                delete p[tx.hash];
                return p;
            });
        }, _.copy(pool));
        script_1.store.commit('refresh_pool', _.copy(deleted_pool));
        const now_refreshing = _.copy(script_1.store.state.now_refreshing);
        const refreshed = _.copy(block.txs.concat(block.natives).concat(block.units)).filter((pure, i) => pure.meta.kind === "refresh" && !valids[i]).map(pure => pure.meta.data.request);
        const new_refreshing = now_refreshing.filter(key => refreshed.indexOf(key) === -1);
        script_1.store.commit('new_refreshing', _.copy(new_refreshing));
        /*const last_key = BlockSet.search_key_block(chain);
        const last_micros = BlockSet.search_micro_block(chain,last_key);

        const my_unit_state:T.State = await S_Trie.get(CryptoSet.GenereateAddress(unit,CryptoSet.PublicFromPrivate(secret)));
        const date = new Date();

        if(!store.state.check_mode&&_.reduce_pub(last_key.meta.validatorPub)===CryptoSet.PublicFromPrivate(store.state.secret)&&last_micros.length<=max_blocks) await send_micro_block(_.copy(pool),secret,chain.slice(),accepted.candidates.slice(),_.copy(roots),unit_store);
        else if(!store.state.check_mode&&my_unit_state!=null&&my_unit_state.amount>0&&date.getTime()-last_key.meta.timestamp>block_time*max_blocks) await send_key_block(chain.slice(),secret,accepted.candidates.slice(),_.copy(roots));*/
        return {
            pool: _.copy(pool),
            roots: _.copy(roots),
            candidates: _.copy(candidates),
            chain: _.copy(chain),
            not_refreshed_tx: _.copy(not_refreshed),
            now_buying: now_buying,
            unit_store: _.copy(unit_store)
        };
    }
};
exports.tx_check = (block, chain, StateData, LocationData) => {
    const txs = block.txs.map((tx, i) => {
        return {
            hash: tx.hash,
            meta: tx.meta,
            raw: block.raws[i]
        };
    });
    const natives = block.natives.map((n, i) => {
        return {
            hash: n.hash,
            meta: n.meta,
            raw: block.raws[txs.length + i]
        };
    });
    const units = block.units.map((u, i) => {
        return {
            hash: u.hash,
            meta: u.meta,
            raw: block.raws[txs.length + natives.length + i]
        };
    });
    const target = txs.concat(natives).concat(units);
    return target.reduce((num, tx, i) => {
        if (tx.meta.kind === "request" && !TxSet.ValidRequestTx(tx, con_1.my_version, con_1.native, con_1.unit, true, StateData, LocationData)) {
            return i;
        }
        else if (tx.meta.kind === "refresh" && !TxSet.ValidRefreshTx(tx, chain, con_1.my_version, con_1.native, con_1.unit, true, con_1.token_name_maxsize, StateData, LocationData)) {
            return i;
        }
        else
            return num;
    }, -1);
};
exports.get_balance = async (address) => {
    const S_Trie = exports.trie_ins(script_1.store.state.roots.stateroot || "");
    const state = await S_Trie.get(address);
    if (state == null)
        return 0;
    return new bignumber_js_1.BigNumber(state.amount).toNumber();
};
exports.send_request_tx = async (secret, type, token, base, input_raw, log, roots, chain, pre = TxSet.empty_tx_pure().meta.pre, next = TxSet.empty_tx_pure().meta.next) => {
    try {
        console.log("send_request_tx");
        const pub_key = [CryptoSet.PublicFromPrivate(secret)];
        const solvency = CryptoSet.GenereateAddress(con_1.native, _.reduce_pub(pub_key));
        const pre_tx = TxSet.CreateRequestTx(pub_key, solvency, Math.pow(2, -3), type, token, base, input_raw, log, con_1.my_version, pre, next, Math.pow(2, -18));
        const tx = TxSet.SignTx(pre_tx, secret, pub_key[0]);
        const stateroot = roots.stateroot;
        const S_Trie = exports.trie_ins(stateroot);
        const locationroot = roots.locationroot;
        const L_Trie = exports.trie_ins(locationroot);
        const StateData = await exports.states_for_tx(tx, chain, S_Trie);
        const LocationData = await exports.locations_for_tx(tx, chain, L_Trie);
        if (!TxSet.ValidRequestTx(tx, con_1.my_version, con_1.native, con_1.unit, false, StateData, LocationData))
            console.log("invalid infomations");
        else {
            console.log('remit!');
            script_2.client.publish('/data', { type: 'tx', tx: [tx], block: [] });
            //await store.dispatch("tx_accept",_.copy(tx));
            //await tx_accept(tx,chain,roots,pool,secret,mode,candidates,codes,socket);
            /*const pool = store.state.pool;
            const new_pool = Object.assign({[tx.hash]:tx},pool);
            store.commit('refresh_pool',new_pool);*/
            /*await send_key_block(socket);
            await send_micro_block(socket);*/
        }
    }
    catch (e) {
        throw new Error(e);
    }
};
exports.send_refresh_tx = async (roots, secret, req_tx, index, code, chain) => {
    console.log("send_refresh_tx");
    const stateroot = roots.stateroot;
    const S_Trie = exports.trie_ins(stateroot);
    const locationroot = roots.locationroot;
    const L_Trie = exports.trie_ins(locationroot);
    const pub_key = [CryptoSet.PublicFromPrivate(secret)];
    const payee = CryptoSet.GenereateAddress(con_1.native, _.reduce_pub(pub_key));
    const req_pure = TxSet.tx_to_pure(req_tx);
    const pre_states = await P.map(req_pure.meta.data.base, async (add) => await S_Trie.get(add));
    const token = req_tx.meta.data.token || "";
    const token_state = await S_Trie.get(token) || StateSet.CreateToken(0, token);
    const pure_chain = _.copy(chain).map(b => {
        return {
            hash: _.copy(b).hash,
            meta: _.copy(b).meta
        };
    });
    const relate_pre_tx = (() => {
        if (req_tx.meta.pre.flag === false)
            return TxSet.empty_tx();
        for (let block of _.copy(chain).slice().reverse()) {
            let txs = _.copy(_.copy(block).txs.concat(_.copy(block).natives).concat(_.copy(block).units));
            let hashes = _.copy(txs).map(tx => tx.meta.purehash);
            let i = hashes.indexOf(req_tx.meta.pre.hash);
            if (i != -1) {
                let tx = _.copy(_.copy(txs)[i]);
                if (tx.meta.kind == "request" && tx.meta.next.flag === true && tx.meta.next.hash === req_tx.meta.purehash) {
                    return TxSet.pure_to_tx(_.copy(tx), _.copy(block));
                }
            }
        }
        return TxSet.empty_tx();
    })();
    const relate_next_tx = (() => {
        if (req_tx.meta.next.flag === false)
            return TxSet.empty_tx();
        for (let block of _.copy(chain).slice().reverse()) {
            let txs = _.copy(_.copy(block).txs.concat(_.copy(block).natives).concat(_.copy(block).units));
            let hashes = _.copy(txs).map(tx => tx.meta.purehash);
            let i = hashes.indexOf(req_tx.meta.next.hash);
            if (i != -1) {
                let tx = _.copy(_.copy(txs)[i]);
                if (tx.meta.kind == "request" && tx.meta.pre.flag === true && tx.meta.pre.hash === req_tx.meta.purehash) {
                    return TxSet.pure_to_tx(_.copy(tx), _.copy(block));
                }
            }
        }
        return TxSet.empty_tx();
    })();
    const output_states = (() => {
        if (req_tx.meta.data.token === con_1.native)
            return TxSet.native_code(_.copy(pre_states), _.copy(req_tx), con_1.native);
        else if (req_tx.meta.data.token === con_1.unit)
            return TxSet.unit_code(_.copy(pre_states), _.copy(req_tx), _.copy(relate_pre_tx), con_1.native, con_1.unit, _.copy(chain));
        else
            return code_1.RunVM(code, _.copy(pre_states), _.copy(req_tx.raw.raw), _.copy(req_pure), token_state, _.copy(pure_chain), _.copy(relate_pre_tx), _.copy(relate_next_tx), con_1.gas_limit);
    })();
    const output_raws = output_states.map(state => JSON.stringify(state));
    const pre_tx = TxSet.CreateRefreshTx(con_1.my_version, 0.01, pub_key, con_1.pow_target, Math.pow(2, -18), req_tx.hash, index, payee, output_raws, [], chain);
    const tx = TxSet.SignTx(pre_tx, secret, pub_key[0]);
    const StateData = await exports.states_for_tx(tx, chain, S_Trie);
    const LocationData = await exports.locations_for_tx(tx, chain, L_Trie);
    if (!TxSet.ValidRefreshTx(tx, chain, con_1.my_version, con_1.native, con_1.unit, false, con_1.token_name_maxsize, StateData, LocationData))
        console.log("fail to create valid refresh");
    else {
        //store.commit('del_not_refreshed',[tx.meta.data.request]);
        console.log("create valid refresh tx");
        script_2.client.publish('/data', { type: 'tx', tx: [tx], block: [] });
        //await store.dispatch("tx_accept",_.copy(tx));
        //await tx_accept(tx,chain,roots,pool,secret,mode,candidates,codes,socket);
        /*const pool = store.state.pool;
        const new_pool = Object.assign({[tx.hash]:tx},pool);
        store.commit('refresh_pool',new_pool);*/
    }
};
exports.send_key_block = async (chain, secret, candidates, roots) => {
    console.log("send_key_block");
    const pub_key = [CryptoSet.PublicFromPrivate(secret)];
    const stateroot = roots.stateroot;
    const S_Trie = exports.trie_ins(stateroot);
    const locationroot = roots.locationroot;
    const L_Trie = exports.trie_ins(locationroot);
    const validator_address = CryptoSet.GenereateAddress(con_1.unit, _.reduce_pub(pub_key));
    const validator_state = [await S_Trie.get(validator_address) || StateSet.CreateState(0, validator_address, con_1.unit, 0, {}, [])];
    const pre_block = BlockSet.CreateKeyBlock(con_1.my_version, 0, chain, con_1.block_time, con_1.max_blocks, con_1.pow_target, con_1.pos_diff, con_1.unit, pub_key, _.ObjectHash(candidates), stateroot, locationroot, validator_state);
    const key_block = BlockSet.SignBlock(pre_block, secret, pub_key[0]);
    const StateData = await exports.states_for_block(key_block, chain, S_Trie);
    const LocationData = await exports.locations_for_block(key_block, chain, L_Trie);
    const check = BlockSet.ValidKeyBlock(key_block, chain, 0, con_1.my_version, candidates, stateroot, locationroot, con_1.block_size, con_1.native, con_1.unit, StateData, LocationData);
    if (!check)
        console.log("fail to create valid block");
    else {
        console.log('create valid key block');
        script_2.client.publish('/data', { type: 'block', tx: [], block: [key_block] });
        //await store.dispatch("block_accept",_.copy(key_block));
        //await block_accept(key_block,chain,candidates,roots,pool,codes,secret,mode,socket);
    }
};
exports.send_micro_block = async (pool, secret, chain, candidates, roots, unit_store) => {
    console.log("send_micro_block");
    const stateroot = roots.stateroot;
    const S_Trie = exports.trie_ins(stateroot);
    const locationroot = roots.locationroot;
    const L_Trie = exports.trie_ins(locationroot);
    const pub_key = [CryptoSet.PublicFromPrivate(secret)];
    const native_validator = CryptoSet.GenereateAddress(con_1.native, _.reduce_pub(pub_key));
    const unit_validator = CryptoSet.GenereateAddress(con_1.unit, _.reduce_pub(pub_key));
    console.log(Object.values(pool));
    const pool_txs = Object.values(_.copy(pool));
    const requested_bases = Object.keys(await L_Trie.filter((key, val) => {
        const getted = val;
        if (getted.state === "already")
            return true;
        else
            return false;
    }));
    console.log(requested_bases);
    const already_requests = _.copy(script_1.store.state.now_refreshing);
    console.log(already_requests);
    const not_same = pool_txs.reduce((result, tx) => {
        const bases = result.reduce((r, t) => {
            if (t.meta.kind === "request")
                return r.concat(t.meta.data.base);
            else
                return r;
        }, requested_bases);
        const requests = result.reduce((r, t) => {
            if (t.meta.kind === "refresh")
                return r.concat(t.meta.data.request);
            else
                return r;
        }, []);
        if (tx.meta.kind === "request" && !bases.some(b => tx.meta.data.base.indexOf(b) != -1))
            return result.concat(tx);
        else if (tx.meta.kind === "refresh" && requests.indexOf(tx.meta.data.request) === -1)
            return result.concat(tx);
        else
            return result;
    }, []);
    console.log('not_same:');
    console.log(not_same);
    const related = not_same.filter(tx => {
        if (tx.meta.kind === "request")
            return true;
        const req_tx = TxSet.find_req_tx(tx, chain);
        if (req_tx.meta.pre.flag === true) {
            const pres = TxSet.list_up_related(chain, TxSet.tx_to_pure(req_tx).meta, "pre");
            return pres.length > 0;
        }
        else if (req_tx.meta.next.flag === true) {
            const nexts = TxSet.list_up_related(chain, TxSet.tx_to_pure(req_tx).meta, "next");
            return nexts.length > 0;
        }
        else
            return true;
    });
    console.log('related');
    console.log(related);
    let size_sum = new bignumber_js_1.BigNumber(0);
    const choosed = related.reduce((result, tx) => {
        if (size_sum.isGreaterThan(new bignumber_js_1.BigNumber(con_1.block_size).times(0.9)))
            return result;
        const tx_size = new bignumber_js_1.BigNumber(Buffer.from(JSON.stringify(tx)).length);
        const added_size = size_sum.plus(tx_size);
        size_sum = added_size;
        if (added_size.isGreaterThan(new bignumber_js_1.BigNumber(con_1.block_size).times(0.9)))
            return result;
        else
            return result.concat(tx);
    }, []);
    console.log('choosed');
    console.log(choosed);
    const reduced = choosed.reduce((result, tx) => {
        if (tx.meta.data.token === con_1.native)
            result.natives.push(tx);
        else if (tx.meta.data.token === con_1.unit)
            result.units.push(tx);
        else
            result.txs.push(tx);
        return result;
    }, { txs: [], natives: [], units: [] });
    const txs = reduced.txs;
    const natives = reduced.natives;
    const units = reduced.units;
    const pre_block = BlockSet.CreateMicroBlock(con_1.my_version, 0, chain, con_1.pow_target, con_1.pos_diff, pub_key, _.ObjectHash(candidates), stateroot, locationroot, txs, natives, units, con_1.block_time);
    const micro_block = BlockSet.SignBlock(pre_block, secret, pub_key[0]);
    const StateData = await exports.states_for_block(micro_block, chain, S_Trie);
    const LocationData = await exports.locations_for_block(micro_block, chain, L_Trie);
    //console.log(BlockSet.ValidMicroBlock(micro_block,chain,0,my_version,candidates,stateroot,locationroot,block_time,max_blocks,block_size,native,unit,token_name_maxsize,StateData,LocationData))
    const invalid_index = exports.tx_check(micro_block, chain, StateData, LocationData);
    console.log(invalid_index);
    const block_check = BlockSet.ValidMicroBlock(micro_block, chain, 0, con_1.my_version, candidates, stateroot, locationroot, con_1.block_time, con_1.max_blocks, con_1.block_size, con_1.native, con_1.unit, con_1.token_name_maxsize, StateData, LocationData);
    if (invalid_index === -1 && block_check) {
        const new_pool = _.new_obj(pool, p => {
            micro_block.txs.concat(micro_block.natives).concat(micro_block.units).forEach(tx => {
                if (tx.meta.kind === "refresh")
                    delete p[tx.hash];
            });
            return p;
        });
        script_1.store.commit('refresh_pool', _.copy(new_pool));
        const new_refreshing = already_requests.concat(micro_block.txs.concat(micro_block.natives).concat(micro_block.units).filter(tx => tx.meta.kind === "refresh").map(tx => tx.meta.data.request));
        script_1.store.commit('new_refreshing', _.copy(new_refreshing));
        script_2.client.publish('/data', { type: 'block', tx: [], block: [micro_block] });
        //await store.dispatch("block_accept",_.copy(micro_block));
        //await block_accept(micro_block,chain,candidates,roots,pool,codes,secret,mode,socket);
        console.log("create micro block");
        //await send_micro_block(socket);
    }
    else if (invalid_index != -1) {
        const target_pure = micro_block.txs.concat(micro_block.natives).concat(micro_block.units)[invalid_index];
        const target_tx = TxSet.pure_to_tx(_.copy(target_pure), _.copy(micro_block));
        const valid = (() => {
            if (target_tx.meta.kind === "request")
                return !TxSet.ValidRequestTx(_.copy(target_tx), con_1.my_version, con_1.native, con_1.unit, false, _.copy(StateData), _.copy(LocationData));
            else
                return true;
        })();
        const del_pool = ((p) => {
            if (valid)
                delete p[target_pure.hash];
            return p;
        })(_.copy(pool));
        const add_unit_store = ((store) => {
            if (target_pure.meta.kind === "refresh") {
                const new_unit = {
                    request: target_pure.meta.data.request,
                    index: target_pure.meta.data.index,
                    nonce: target_pure.meta.nonce,
                    payee: target_pure.meta.data.payee,
                    output: target_pure.meta.data.output,
                    unit_price: target_pure.meta.unit_price
                };
                const pre = store[target_pure.meta.data.request] || [];
                if (pre.length > 0 && (pre.map(u => _.toHash(u.payee + u.request + u.index)).indexOf(_.toHash(new_unit.payee + new_unit.request + new_unit.index)) != -1 || pre[0].output != new_unit.output))
                    return store;
                store[target_pure.meta.data.request] = pre.concat(new_unit);
                return store;
            }
            else
                return store;
        })(_.copy(unit_store));
        const new_unit = {
            request: target_pure.meta.data.request,
            index: target_pure.meta.data.index,
            nonce: target_pure.meta.nonce,
            payee: target_pure.meta.data.payee,
            output: target_pure.meta.data.output,
            unit_price: target_pure.meta.unit_price
        };
        script_1.store.commit("refresh_pool", _.copy(del_pool));
        script_1.store.commit("add_unit", _.copy(new_unit));
        await exports.send_micro_block(_.copy(del_pool), secret, _.copy(chain), _.copy(candidates), _.copy(roots), _.copy(unit_store));
    }
    else {
        console.log("fall to create micro block;");
    }
};
const get_pre_info = async (chain) => {
    const pre_block = chain[chain.length - 1] || BlockSet.empty_block();
    const S_Trie = exports.trie_ins(pre_block.meta.stateroot);
    const StateData = await exports.states_for_block(pre_block, chain.slice(0, pre_block.meta.index), S_Trie);
    const L_Trie = exports.trie_ins(pre_block.meta.locationroot);
    const LocationData = await exports.locations_for_block(pre_block, chain.slice(0, pre_block.meta.index), L_Trie);
    /*const pre_block2 = chain[chain.length-2] || BlockSet.empty_block();
    const pre_S_Trie = trie_ins(pre_block2.meta.stateroot);
    const pre_StateData = await states_for_block(pre_block2,chain.slice(0,pre_block.meta.index-1),pre_S_Trie);*/
    const candidates = BlockSet.CandidatesForm(BlockSet.get_units(con_1.unit, StateData));
    const accepted = await BlockSet.AcceptBlock(pre_block, _.copy(chain).slice(0, pre_block.meta.index), 0, con_1.my_version, con_1.block_time, con_1.max_blocks, con_1.block_size, _.copy(candidates), S_Trie.now_root(), L_Trie.now_root(), con_1.native, con_1.unit, con_1.rate, con_1.token_name_maxsize, con_1.all_issue, StateData, LocationData);
    await P.forEach(accepted.state, async (state) => {
        await S_Trie.put(state.owner, state);
    });
    await P.forEach(accepted.location, async (loc) => {
        await L_Trie.put(loc.address, loc);
    });
    const pre_root = {
        stateroot: S_Trie.now_root(),
        locationroot: L_Trie.now_root()
    };
    return [_.copy(pre_root), _.copy(accepted.candidates)];
};
exports.check_chain = async (new_chain, my_chain, pool, codes, secret, unit_store) => {
    if (new_chain.length > my_chain.length) {
        const news = _.copy(new_chain).slice().reverse();
        let target = [];
        for (let index in news) {
            let i = Number(index);
            if (my_chain[news.length - i - 1] != null && my_chain[news.length - i - 1].hash === news[i].hash)
                break;
            else if (news[i].meta.kind === "key")
                target.push(news[i]);
            else if (news[i].meta.kind === "micro")
                target.push(news[i]);
        }
        const add_blocks = _.copy(target).slice().reverse();
        const back_chain = my_chain.slice(0, add_blocks[0].meta.index);
        console.log("add_block:");
        console.log(add_blocks);
        /*const back_chain:T.Block[] = [gen.block];
        const add_blocks = new_chain.slice(1);*/
        script_1.store.commit("replace_chain", _.copy(back_chain));
        const info = await (async () => {
            if (back_chain.length === 1) {
                return {
                    pool: _.copy(pool),
                    roots: _.copy(gen.roots),
                    candidates: _.copy(gen.candidates),
                    chain: _.copy(back_chain)
                };
            }
            const pre_info = await get_pre_info(back_chain);
            return {
                pool: _.copy(pool),
                roots: _.copy(pre_info[0]),
                candidates: _.copy(pre_info)[1],
                chain: _.copy(back_chain)
            };
        })();
        const add_blocks_data = add_blocks.map(block => {
            return {
                type: 'block',
                tx: [],
                block: [block]
            };
        });
        script_1.store.commit("refresh_roots", _.copy(info.roots));
        script_1.store.commit("refresh_candidates", _.copy(info.candidates));
        script_1.store.commit('replaceing', true);
        script_1.store.commit('rep_limit', _.copy(add_blocks[add_blocks.length - 1]).meta.index);
        /*await P.reduce(add_blocks,async (result:{pool:T.Pool,roots:{[key:string]:string},candidates:T.Candidates[],chain:T.Block[]},block:T.Block)=>{
            const accepted = await block_accept(block,result.chain.slice(),result.candidates.slice(),_.copy(result.roots),_.copy(result.pool),codes,secret,unit_store);
            return _.copy(accepted);
        },info);*/
        script_1.store.commit('refresh_yet_data', _.copy(add_blocks_data).concat(_.copy(script_1.store.state.yet_data)));
        //add_blocks.forEach(block=>store.commit('push_yet_block',block));
        /*store.commit("checking",true);
        store.commit("checking",false);*/
        const amount = await exports.get_balance(script_1.store.getters.my_address);
        script_1.store.commit("refresh_balance", amount);
    }
    else {
        console.log("not replace");
        script_1.store.commit('replaceing', false);
    }
};
exports.unit_buying = async (secret, units, roots, chain) => {
    try {
        console.log("unit!");
        const pub_key = [CryptoSet.PublicFromPrivate(secret)];
        const native_remiter = CryptoSet.GenereateAddress(con_1.native, _.reduce_pub(pub_key));
        const unit_remiter = CryptoSet.GenereateAddress(con_1.unit, _.reduce_pub(pub_key));
        console.log(native_remiter);
        const unit_sellers = units.map(u => u.payee);
        console.log(unit_sellers);
        const native_sellers = unit_sellers.reduce((res, add) => {
            const index = res.indexOf(add);
            if (index === -1)
                return res.concat(add);
            else
                return res;
        }, []);
        const prices = Object.values(units.reduce((res, unit) => {
            const amount = res[unit.payee];
            if (amount == null) {
                return _.new_obj(res, r => {
                    r[unit.payee] = unit.unit_price;
                    return r;
                });
            }
            else {
                return _.new_obj(res, r => {
                    r[unit.payee] = new bignumber_js_1.BigNumber(amount).plus(unit.unit_price).toNumber();
                    return r;
                });
            }
        }, {}));
        const pure_native_tx = TxSet.CreateRequestTx(pub_key, native_remiter, Math.pow(2, -3), "issue", con_1.native, _.copy([native_remiter].concat(native_sellers)), ["remit", JSON.stringify(prices)], [], con_1.my_version, TxSet.empty_tx_pure().meta.pre, TxSet.empty_tx_pure().meta.next, Math.pow(2, -18));
        const pure_unit_tx = TxSet.CreateRequestTx(pub_key, native_remiter, Math.pow(2, -3), "issue", con_1.unit, _.copy([unit_remiter].concat("Vr:" + con_1.unit + ":" + _.toHash(''))), ["buy", JSON.stringify(units)], [], con_1.my_version, TxSet.empty_tx_pure().meta.pre, TxSet.empty_tx_pure().meta.next, Math.pow(2, -18));
        console.log(pure_native_tx);
        const native_pure_hash = _.copy(pure_native_tx).meta.purehash;
        const unit_pure_hash = _.copy(pure_unit_tx).meta.purehash;
        const next_rel = {
            flag: true,
            hash: unit_pure_hash
        };
        const pre_rel = {
            flag: true,
            hash: native_pure_hash
        };
        const rel_native_tx = _.new_obj(pure_native_tx, (tx) => {
            const new_meta = _.new_obj(tx.meta, m => {
                m.next = next_rel;
                return m;
            });
            tx.meta = _.copy(new_meta);
            tx.hash = _.ObjectHash(new_meta);
            return tx;
        });
        const rel_unit_tx = _.new_obj(pure_unit_tx, (tx) => {
            const new_meta = _.new_obj(tx.meta, m => {
                m.pre = pre_rel;
                return m;
            });
            tx.meta = _.copy(new_meta);
            tx.hash = _.ObjectHash(new_meta);
            return tx;
        });
        const native_tx = TxSet.SignTx(rel_native_tx, secret, pub_key[0]);
        const unit_tx = TxSet.SignTx(rel_unit_tx, secret, pub_key[0]);
        const stateroot = roots.stateroot;
        const S_Trie = exports.trie_ins(stateroot);
        const locationroot = roots.locationroot;
        const L_Trie = exports.trie_ins(locationroot);
        const native_StateData = await exports.states_for_tx(native_tx, chain, S_Trie);
        const native_LocationData = await exports.locations_for_tx(native_tx, chain, L_Trie);
        const unit_StateData = await exports.states_for_tx(unit_tx, chain, S_Trie);
        const unit_LocationData = await exports.locations_for_tx(unit_tx, chain, L_Trie);
        if (!TxSet.ValidRequestTx(native_tx, con_1.my_version, con_1.native, con_1.unit, false, native_StateData, native_LocationData) || !TxSet.ValidRequestTx(unit_tx, con_1.my_version, con_1.native, con_1.unit, false, unit_StateData, unit_LocationData))
            console.log("fail to buy units");
        else {
            console.log("buy unit!");
            script_1.store.commit('buying_unit', true);
            //console.error(unit_tx.hash);
            units.forEach(u => {
                script_1.store.commit('delete_unit', _.copy(u));
            });
            script_2.client.publish('/data', { type: 'tx', tx: [native_tx], block: [] });
            script_2.client.publish('/data', { type: 'tx', tx: [unit_tx], block: [] });
        }
        /*const pre_tx = TxSet.CreateRequestTx(pub_key,remiter,Math.pow(2,-5),"issue",unit,[from],["buy",remiter,JSON.stringify(units)],[],my_version,TxSet.empty_tx_pure().meta.pre,TxSet.empty_tx_pure().meta.next,Math.pow(10,-18));
        const tx = TxSet.SignTx(pre_tx,secret,pub_key[0
        ]);
        const stateroot = roots.stateroot;
        const S_Trie:Trie = trie_ins(stateroot);
        const locationroot = roots.locationroot;
        const L_Trie:Trie = trie_ins(locationroot);
        const StateData = await states_for_tx(tx,chain,S_Trie);
        const LocationData = await locations_for_tx(tx,chain,L_Trie);*/
        /*if(!TxSet.ValidRequestTx(tx,my_version,native,unit,StateData,LocationData)) console.log("fail to buy units");
        else{
            console.log("buy unit!");
            client.publish('/data',{type:'tx',tx:[tx],block:[]});
        }*/
    }
    catch (e) {
        throw new Error(e);
    }
};
