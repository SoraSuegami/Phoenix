import * as T from '../../core/types'
import * as _ from '../../core/basic'
import * as CryptoSet from '../../core/crypto_set'
import {Trie} from '../../core/merkle_patricia'
import * as TxSet from '../../core/tx'
import * as BlockSet from '../../core/block'
import * as StateSet from '../../core/state'
import * as P from 'p-iteration'
import {my_version,native,unit,token_name_maxsize,block_time,max_blocks,block_size,gas_limit,rate, pow_target,pos_diff,all_issue} from '../con'
import { Tx_to_Pool } from '../../core/tx_pool';
import {store} from './script'
import level from 'level-browserify'
import * as gen from '../../genesis/index';
import {IO} from 'rxjs-socket.io'
import { RunVM } from '../../core/code';

const db = level('./db');
export const trie_ins = (root:string)=>{
    try{
        return new Trie(db,root);
    }
    catch(e){
        console.log(e);
        return new Trie(db);
    }
}

const output_keys = (tx:T.Tx)=>{
    if(tx.meta.kind==="request") return [];
    else if(tx.meta.data.type==="create"||tx.meta.data.type==="update"){
        const token:T.State = JSON.parse(tx.raw.raw[0]);
        return [token.token];
    }
    const states:T.State[] = tx.raw.raw.map(r=>JSON.parse(r));
    return states.map(s=>s.owner);
}

const pays = (tx:T.Tx,chain:T.Block[])=>{
    if(tx.meta.kind==="request"){
        return [tx.meta.data.solvency];
    }
    else if(tx.meta.kind==="refresh"){
        const req_tx = TxSet.find_req_tx(tx,chain);
        return [req_tx.meta.data.solvency,tx.meta.data.payee];
    }
    else return [];
}

export const states_for_tx = async (tx:T.Tx,chain:T.Block[],S_Trie:Trie)=>{
    console.log(tx);
    const base = tx.meta.data.base;
    const outputs = output_keys(tx);
    const payes = pays(tx,chain);
    const concated = base.concat(outputs).concat(payes);
    const target = concated.reduce((result,key,index)=>{
        if(result.filter(val=>val===key).length>=2) return result.filter((key,i)=>index!=i);
        else return result;
    },concated);
    const states:T.State[] =  Object.values(await S_Trie.filter((key)=>{
        const i = target.indexOf(key);
        if(i!=-1) return true;
        else return false;
    }));
    return states;
}

export const locations_for_tx = async (tx:T.Tx,chain:T.Block[],L_Trie:Trie)=>{
    const target = (()=>{
        if(tx.meta.kind==="request") return tx;
        else return TxSet.find_req_tx(tx,chain);
    })();
    const result:T.Location[] = Object.values(await L_Trie.filter(key=>{
        if(target.meta.data.base.indexOf(key)!=-1) return true;
        else if(target.meta.data.solvency===key&&target.meta.data.base.indexOf(key)===-1) return true;
        else return false;
    }));
    return result;
}

export const states_for_block = async (block:T.Block,chain:T.Block[],S_Trie:Trie)=>{
    const native_validator = CryptoSet.GenereateAddress(native,_.reduce_pub(block.meta.validatorPub));
    const native_validator_state:T.State = await S_Trie.get(native_validator) || [];
    const unit_validator = CryptoSet.GenereateAddress(unit,_.reduce_pub(block.meta.validatorPub));
    const unit_validator_state:T.State = await S_Trie.get(unit_validator) || [];
    const targets = block.txs.concat(block.natives).concat(block.units).map(pure=>pure_to_tx(pure,block));
    const tx_states:T.State[] = await P.reduce(targets,async (result:T.State[],tx:T.Tx)=>result.concat(await states_for_tx(tx,chain,S_Trie)),[]);
    const native_states:T.State[] = await P.map(block.natives,async (tx:T.Tx)=>{
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
    const unit_states:T.State[] = await P.map(block.units,async (tx:T.Tx)=>{
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
        const remiter:T.State = await S_Trie.get(raw.raw[1])||StateSet.CreateState(0,raw.raw[1],unit,0);
        const items:T.Tx[] = JSON.parse(raw.raw[2]) || [TxSet.empty_tx()];
        const sellers:T.State[] = await P.map(items, async (it:T.Tx)=>await S_Trie.get(it.meta.data.payee)||StateSet.CreateState(0,it.meta.data.payee,unit,0));
        return sellers.concat(remiter);
    }) || [];
    const native_token = await S_Trie.get(native);
    const unit_token = await S_Trie.get(unit);
    const concated = tx_states.concat(native_validator_state).concat(unit_validator_state).concat(native_states).concat(unit_states).concat(native_token).concat(unit_token);
    return concated.reduce((result,state,index)=>{
        if(result.filter(val=>_.ObjectHash(val)===_.ObjectHash(state)).length>=2) return result.filter((val,i)=>index!=i)
        else return result;
    },concated);
}

export const locations_for_block = async (block:T.Block,chain:T.Block[],L_Trie:Trie)=>{
    const targets = block.txs.concat(block.natives).concat(block.units);
    const result:T.Location[] = await P.reduce(targets,async (result:T.Location[],tx:T.Tx)=>result.concat(await locations_for_tx(tx,chain,L_Trie)),[]);
    return result;
}

export const pure_to_tx = (pure:T.TxPure,block:T.Block):T.Tx=>{
    const index = block.txs.concat(block.natives).concat(block.units).indexOf(pure);
    if(index===-1) return TxSet.empty_tx();
    const raw = block.raws[index];
    return {
        hash:pure.hash,
        meta:pure.meta,
        raw:raw
    }
}

const random_chose = (array:any[], num:number)=>{
    for(let i = array.length - 1; i > 0; i--){
        let r = Math.floor(Math.random() * (i + 1));
        let tmp = array[i];
        array[i] = array[r];
        array[r] = tmp;
    }
    return array.slice(0,num);
}

export const tx_accept = async (tx:T.Tx,chain:T.Block[],roots:{[key:string]:string},pool:T.Pool,secret:string,validator_mode:boolean,candidates:T.Candidates[],codes:{[key:string]:string},unit_store:{[key:string]:T.Unit[]},socket:IO)=>{
    console.log("tx_accept");
    console.log(tx.meta.data.address)
    console.log(tx.meta.kind);
    const stateroot = roots.stateroot;
    const S_Trie:Trie = trie_ins(stateroot);
    const locationroot = roots.locationroot;
    const L_Trie:Trie = trie_ins(locationroot);
    const states = await states_for_tx(tx,chain,S_Trie) || [];
    const locations = await locations_for_tx(tx,chain,L_Trie) || [];
    const new_pool = Tx_to_Pool(pool,tx,my_version,native,unit,chain,token_name_maxsize,states,locations);
    if(tx.meta.kind==="refresh"){
        const new_unit:T.Unit = {
            request:tx.meta.data.request,
            index:tx.meta.data.index,
            nonce:tx.meta.nonce,
            payee:tx.meta.data.payee,
            output:tx.meta.data.output,
            unit_price:tx.meta.unit_price
        }
        const new_unit_store = _.new_obj(
            unit_store,
            (store)=>{
                const pre = store[tx.meta.data.request] || [];
                store[tx.meta.data.request] = pre.concat(new_unit);
                return store;
            }
        )
        store.commit("refresh_unit_store",new_unit_store);
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
        const unit_array = Object.values(new_unit_store).reduce((result,us)=>result.concat(us),[]).filter(u=>{
            for(let block of chain.slice(u.index).reverse()){
                for(let tx of block.txs.concat(block.natives).concat(block.units)){
                    if(tx.meta.kind==="refresh"&&tx.meta.data.request===u.request&&tx.meta.data.index===u.index) return true;
                }
            }
            return false;
        });
        const buy_units = random_chose(unit_array,10);
        console.log(buy_units);
        if(buy_units.length>=1) await unit_buying(secret,buy_units.slice(),_.copy(roots),chain.slice(),socket);
    }
    if(_.ObjectHash(new_pool)!=_.ObjectHash(pool)){
        store.commit("refresh_pool",_.copy(new_pool));
        const unit_address = CryptoSet.GenereateAddress(unit,_.reduce_pub([CryptoSet.PublicFromPrivate(secret)]));
        const unit_state:T.State = await S_Trie.get(unit_address) || StateSet.CreateState(0,unit_address,unit,0,{},[]);
        const unit_amount = unit_state.amount;
        /*if(Object.keys(new_pool).length>=10&&unit_amount>0){
            if(validator_mode&&tx.meta.kind==="refresh") await send_micro_block(_.copy(new_pool),secret,chain.slice(),candidates.slice(),_.copy(roots),unit_store,socket);
            else await send_key_block(chain.slice(),secret,candidates.slice(),_.copy(roots),_.copy(new_pool),codes,validator_mode,socket);
        }*/
        return _.copy(new_pool);
    }
    else return _.copy(pool);
}

export const block_accept = async (block:T.Block,chain:T.Block[],candidates:T.Candidates[],roots:{[key:string]:string},pool:T.Pool,codes:{[key:string]:string},secret:string,mode:boolean,unit_store:{[key:string]:T.Unit[]},socket:IO)=>{
    try{
        console.log("block_accept");
        console.log(block.meta.index);
        const stateroot = roots.stateroot;
        const S_Trie:Trie = trie_ins(stateroot);
        const locationroot = roots.locationroot;
        const L_Trie:Trie = trie_ins(locationroot);
        const StateData = await states_for_block(block,chain,S_Trie);
        const LocationData = await locations_for_block(block,chain,L_Trie);
        const accepted = await BlockSet.AcceptBlock(block,chain,0,my_version,block_time,max_blocks,block_size,candidates,stateroot,locationroot,native,unit,rate,token_name_maxsize,all_issue,StateData,LocationData);
        if(accepted.block.length>0){
            await P.forEach(accepted.state, async (state:T.State)=>{
                if(state.kind==="state") await S_Trie.put(state.owner,state);
                else await S_Trie.put(state.token,state);
            });
            await P.forEach(accepted.location, async (loc:T.Location)=>{
                await L_Trie.put(loc.address,loc);
            });
            const new_roots = {
                stateroot:S_Trie.now_root(),
                locationroot:L_Trie.now_root()
            }
            const new_pool = ((p)=>{
                block.txs.concat(block.natives).concat(block.units).forEach(tx=>{
                    delete p[tx.hash];
                });
                return p;
            })(_.copy(pool));
            await store.commit('refresh_pool',_.copy(new_pool));
            await store.commit("refresh_roots",_.copy(new_roots));
            await store.commit("refresh_candidates",accepted.candidates.slice());
            await store.commit("add_block",_.copy(accepted.block[0]));
            //socket.emit('block',JSON.stringify(block));
            const reqs_pure = block.txs.filter(tx=>tx.meta.kind==="request").concat(block.natives.filter(tx=>tx.meta.kind==="request")).concat(block.units.filter(tx=>tx.meta.kind==="request"));
            const refs_pure = block.txs.filter(tx=>tx.meta.kind==="refresh").concat(block.natives.filter(tx=>tx.meta.kind==="refresh")).concat(block.units.filter(tx=>tx.meta.kind==="refresh"));
            await send_micro_block(_.copy(new_pool),secret,chain.slice().concat(accepted.block[0]),accepted.candidates.slice(),_.copy(new_roots),unit_store,socket);
            if(reqs_pure.length>0){
                await P.forEach(reqs_pure,async (pure:T.TxPure)=>{
                    console.log("refresh!")
                    const req_tx = pure_to_tx(pure,block);
                    const code:string = codes[req_tx.meta.data.token]
                    await send_refresh_tx(_.copy(new_roots),secret,req_tx,block.meta.index,code,chain.slice().concat(accepted.block[0]),_.copy(new_pool),mode,accepted.candidates.slice(),codes,socket);
                });
            }
            if(refs_pure.length>0){
                /*await P.forEach(refs_pure, async (pure:T.TxPure)=>{
                    const units = unit_store[pure.meta.data.request] || [];
                    if(units.length>0) await unit_buying(secret,units.slice(),_.copy(roots),chain.slice(),_.copy(pool),mode,candidates.slice(),_.copy(codes),socket);
                });*/
                const bought_units = block.units.reduce((result:T.Unit[],u)=>{
                    if(u.meta.kind==="request") return result;
                    const ref_tx = pure_to_tx(u,block);
                    const req_tx = TxSet.find_req_tx(ref_tx,chain);
                    const raw = req_tx.raw || TxSet.empty_tx().raw;
                    const this_units:T.Unit[] = JSON.parse(raw.raw[2])||[];
                    return result.concat(this_units);
                },[]);
                const new_unit_store = _.new_obj(
                    unit_store,
                    (store:{[key:string]:T.Unit[]})=>{
                        bought_units.forEach(unit=>{
                            const com = store[unit.request] || [];
                            const deleted = com.filter(c=>_.ObjectHash(c)!=_.ObjectHash(unit))
                            store[unit.request] = deleted;
                        });
                        return store;
                    }
                )
                store.commit("refresh_unit_store",new_unit_store);
            }
            return {
                pool:_.copy(new_pool),
                roots:_.copy(new_roots),
                candidates:accepted.candidates.slice(),
                chain:chain.slice().concat(accepted.block[0]),
            }
        }
        else{
            console.log("receive invalid block")
            return{
                pool:_.copy(pool),
                roots:_.copy(roots),
                candidates:candidates.slice(),
                chain:chain.slice()
            }
        }
    }
    catch(e){console.log(e)}
}

export const tx_check = (block:T.Block,chain:T.Block[],StateData:T.State[],LocationData:T.Location[])=>{
    const txs = block.txs.map((tx,i):T.Tx=>{
        return {
            hash:tx.hash,
            meta:tx.meta,
            raw:block.raws[i]
        }
    });
    const natives:T.Tx[] = block.natives.map((n,i)=>{
        return {
            hash:n.hash,
            meta:n.meta,
            raw:block.raws[i]
        }
    });
    const units:T.Tx[] = block.units.map((u,i)=>{
        return {
            hash:u.hash,
            meta:u.meta,
            raw:block.raws[i]
        }
    });

    const target = txs.concat(natives).concat(units);
    return target.reduce((num:number,tx:T.Tx,i)=>{
        if(tx.meta.kind==="request"&&!TxSet.ValidRequestTx(tx,my_version,native,unit,StateData,LocationData)){
            return i;
        }
        else if(tx.meta.kind==="refresh"&&!TxSet.ValidRefreshTx(tx,chain,my_version,native,unit,token_name_maxsize,StateData,LocationData)){
            return i;
        }
        else return num;
    },-1);
}

export const get_balance = async (address:string)=>{
    const S_Trie = trie_ins(store.state.roots.stateroot||"");
    const state:T.State = await S_Trie.get(address);
    if(state==null) return 0;
    return state.amount;
}

export const send_request_tx = async (secret:string,to:string,amount:string,roots:{[key:string]:string},chain:T.Block[],pool:T.Pool,mode:boolean,candidates:T.Candidates[],codes:{[key:string]:string},socket:IO)=>{
    try{
        console.log("send_request_tx");
        const pub_key:string[] = [CryptoSet.PublicFromPrivate(secret)]
        const from:string = CryptoSet.GenereateAddress(native,_.reduce_pub(pub_key));
        const pre_tx = TxSet.CreateRequestTx(pub_key,from,Math.pow(2,-18),"scrap",native,[from],["remit",to,"-"+amount],[],my_version,TxSet.empty_tx_pure().meta.pre,TxSet.empty_tx_pure().meta.next,Math.pow(2,-18));
        const tx = TxSet.SignTx(pre_tx,secret,from);
        const stateroot = roots.stateroot;
        const S_Trie:Trie = trie_ins(stateroot);
        const locationroot = roots.locationroot;
        const L_Trie:Trie = trie_ins(locationroot);
        const StateData = await states_for_tx(tx,chain,S_Trie);
        const LocationData = await locations_for_tx(tx,chain,L_Trie);
        if(!TxSet.ValidRequestTx(tx,my_version,native,unit,StateData,LocationData)) alert("invalid infomations");
        else{
            alert("remit!");
            socket.emit('tx',JSON.stringify(tx));
            //await store.dispatch("tx_accept",_.copy(tx));
            //await tx_accept(tx,chain,roots,pool,secret,mode,candidates,codes,socket);
            /*const pool = store.state.pool;
            const new_pool = Object.assign({[tx.hash]:tx},pool);
            store.commit('refresh_pool',new_pool);*/
            /*await send_key_block(socket);
            await send_micro_block(socket);*/
        }
    }
    catch(e){
        console.log(e);
    }
}

export const send_refresh_tx = async (roots:{[key:string]:string},secret:string,req_tx:T.Tx,index:number,code:string,chain:T.Block[],pool:T.Pool,mode:boolean,candidates:T.Candidates[],codes:{[key:string]:string},socket:IO)=>{
    try{
        console.log("send_refresh_tx");
        const stateroot = roots.stateroot;
        const S_Trie:Trie = trie_ins(stateroot);
        const locationroot = roots.locationroot;
        const L_Trie:Trie = trie_ins(locationroot);
        const pub_key:string[] = [CryptoSet.PublicFromPrivate(secret)]
        const payee = CryptoSet.GenereateAddress(native,_.reduce_pub(pub_key));
        const req_pure = TxSet.tx_to_pure(req_tx);
        const pre_states = await P.map(req_pure.meta.data.base,async (add:string)=>await S_Trie.get(add));
        const token = req_tx.meta.data.token || "";
        const token_state:T.State = await S_Trie.get(token) || StateSet.CreateToken(0,token);
        const pure_chain = chain.map(b=>{
            return {
                hash:b.hash,
                meta:b.meta
            }
        })
        const relate_pre_tx = (()=>{
            for(let block of chain.slice().reverse()){
                const index = block.txs.map(t=>t.hash).concat(block.natives.map(t=>t.hash)).concat(block.units.map(t=>t.hash)).indexOf(req_tx.meta.pre.hash)|| -1;
                if(index===-1) continue;
                const pure = block.txs.concat(block.natives).concat(block.units)[index]
                return {
                    hash:pure.hash,
                    meta:pure.meta,
                    raw:block.raws[index]
                }
            }
            return TxSet.empty_tx();
        })();
        const relate_next_tx = (()=>{
            for(let block of chain.slice().reverse()){
                const index = block.txs.map(t=>t.hash).concat(block.natives.map(t=>t.hash)).concat(block.units.map(t=>t.hash)).indexOf(req_tx.meta.next.hash)|| -1;
                if(index===-1) continue;
                const pure = block.txs.concat(block.natives).concat(block.units)[index]
                return {
                    hash:pure.hash,
                    meta:pure.meta,
                    raw:block.raws[index]
                }
            }
            return TxSet.empty_tx();
        })();
        const output_states = RunVM(code,pre_states,req_tx.raw.raw,req_pure,token_state,pure_chain,relate_pre_tx,relate_next_tx,gas_limit);
        const output_raws = output_states.map(state=>JSON.stringify(state));
        const pre_tx = TxSet.CreateRefreshTx(my_version,10,pub_key,pow_target,Math.pow(2,-18),req_tx.hash,index,payee,output_raws,[],chain);
        const tx = TxSet.SignTx(pre_tx,secret,payee);
        const StateData = await states_for_tx(tx,chain,S_Trie);
        const LocationData = await locations_for_tx(tx,chain,L_Trie);
        if(!TxSet.ValidRefreshTx(tx,chain,my_version,native,unit,token_name_maxsize,StateData,LocationData)) console.log("fail to create valid refresh");
        else{
            console.log("create valid refresh tx");
            socket.emit('tx',JSON.stringify(tx));
            //await store.dispatch("tx_accept",_.copy(tx));
            //await tx_accept(tx,chain,roots,pool,secret,mode,candidates,codes,socket);
            /*const pool = store.state.pool;
            const new_pool = Object.assign({[tx.hash]:tx},pool);
            store.commit('refresh_pool',new_pool);*/
        }
    }
    catch(e){
        console.log(e);
    }
}


export const send_key_block = async (chain:T.Block[],secret:string,candidates:T.Candidates[],roots:{[key:string]:string},pool:T.Pool,codes:{[key:string]:string},mode:boolean,socket:IO)=>{
    console.log("send_key_block");
    const pub_key:string[] = [CryptoSet.PublicFromPrivate(secret)];
    const stateroot = roots.stateroot;
    const S_Trie:Trie = trie_ins(stateroot);
    const locationroot = roots.locationroot;
    const L_Trie:Trie = trie_ins(locationroot);
    const validator_address = CryptoSet.GenereateAddress(unit,_.reduce_pub(pub_key))
    const validator_state = [await S_Trie.get(validator_address)||StateSet.CreateState(0,validator_address,unit,0,{},[])];
    const pre_block = BlockSet.CreateKeyBlock(my_version,0,chain,block_time,max_blocks,pow_target,pos_diff,unit,pub_key,_.ObjectHash(candidates),stateroot,locationroot,validator_state);
    const key_block = BlockSet.SignBlock(pre_block,secret,pub_key[0]);
    const StateData = await states_for_block(key_block,chain,S_Trie);
    const LocationData = await locations_for_block(key_block,chain,L_Trie);
    const check = BlockSet.ValidKeyBlock(key_block,chain,0,my_version,candidates,stateroot,locationroot,block_time,max_blocks,block_size,unit,StateData);
    if(!check) console.log("fail to create valid block");
    else{
        socket.emit('block',JSON.stringify(key_block));
        //await store.dispatch("block_accept",_.copy(key_block));
        //await block_accept(key_block,chain,candidates,roots,pool,codes,secret,mode,socket);
    }
}

export const send_micro_block = async (pool:T.Pool,secret:string,chain:T.Block[],candidates:T.Candidates[],roots:{[key:string]:string},unit_store:{[key:string]:T.Unit[]},socket:IO)=>{
    if(Object.keys(pool).length>0){
        console.log("send_micro_block");
        const stateroot = roots.stateroot;
        const S_Trie:Trie = trie_ins(stateroot);
        const locationroot = roots.locationroot;
        const L_Trie:Trie = trie_ins(locationroot);
        const splited:T.Tx[] = random_chose(Object.values(pool),block_size/1000);
        const not_same = splited.reduce((result:T.Tx[],tx)=>{
            const bases = result.reduce((r:string[],t)=>{
                if(t.meta.kind==="request") return r.concat(t.meta.data.base);
                else return r;
            },[]);
            const requests = result.reduce((r:string[],t)=>{
                if(t.meta.kind==="refresh") return r.concat(t.meta.data.request);
                else return r;
            },[]);
            if(tx.meta.kind==="request"&&!bases.some(b=>tx.meta.data.base.indexOf(b)!=-1)) return result.concat(tx);
            else if(tx.meta.kind==="refresh"&&requests.indexOf(tx.meta.data.request)===-1) return result.concat(tx);
            else return result;
        },[]);
        const reduced = not_same.reduce((result:{txs:T.Tx[],natives:T.Tx[],units:T.Tx[]},tx)=>{
            if(tx.meta.data.token===native) result.natives.push(tx);
            else if(tx.meta.data.token===unit) result.units.push(tx);
            else result.txs.push(tx);
            return result;
        },{txs:[],natives:[],units:[]});
        const pub_key:string[] = [CryptoSet.PublicFromPrivate(secret)];
        const txs = reduced.txs;
        const natives = reduced.natives;
        const units = reduced.units;
        const pre_block = BlockSet.CreateMicroBlock(my_version,0,chain,pow_target,pos_diff,pub_key,_.ObjectHash(candidates),stateroot,locationroot,txs,natives,units,block_time);
        const micro_block = BlockSet.SignBlock(pre_block,secret,pub_key[0]);
        const StateData = await states_for_block(micro_block,chain,S_Trie);
        const LocationData = await locations_for_block(micro_block,chain,L_Trie);
        //console.log(BlockSet.ValidMicroBlock(micro_block,chain,0,my_version,candidates,stateroot,locationroot,block_time,max_blocks,block_size,native,unit,token_name_maxsize,StateData,LocationData))
        const invalid_index = tx_check(micro_block,chain,StateData,LocationData);
        const block_check = BlockSet.ValidMicroBlock(micro_block,chain,0,my_version,candidates,stateroot,locationroot,block_time,max_blocks,block_size,native,unit,token_name_maxsize,StateData,LocationData);
        if(invalid_index===-1&&block_check){
            /*const new_pool = ((p)=>{
                micro_block.txs.concat(micro_block.natives).concat(micro_block.units).forEach(tx=>{
                    delete p[tx.hash];
                });
                return p;
            })(pool);
            store.commit('refresh_pool',new_pool);*/
            socket.emit('block',JSON.stringify(micro_block));
            //await store.dispatch("block_accept",_.copy(micro_block));
            //await block_accept(micro_block,chain,candidates,roots,pool,codes,secret,mode,socket);
            console.log("create micro block");
            //await send_micro_block(socket);
        }
        else if(invalid_index!=-1){
            const target_pure = micro_block.txs.concat(micro_block.natives).concat(micro_block.units)[invalid_index];
            const del_pool = ((p)=>{
                delete p[target_pure.hash];
                return p;
            })(_.copy(pool));
            const add_unit_store = ((store)=>{
                if(target_pure.meta.kind==="refresh"){
                    const new_unit:T.Unit = {
                        request:target_pure.meta.data.request,
                        index:target_pure.meta.data.index,
                        nonce:target_pure.meta.nonce,
                        payee:target_pure.meta.data.payee,
                        output:target_pure.meta.data.output,
                        unit_price:target_pure.meta.unit_price
                    }
                    const pre = store[target_pure.meta.data.request] || []
                    store[target_pure.meta.data.request] = pre.concat(new_unit);
                    return store;
                }
                else return store;
            })(_.copy(unit_store))
            store.commit("refresh_pool",_.copy(del_pool));
            store.commit("refresh_unit_store",_.copy(add_unit_store));
            //await send_micro_block(_.copy(del_pool),secret,chain.slice(),candidates.slice(),_.copy(roots),codes,mode,socket);
        }
        else{console.log("fall to create micro block;");}
    }else store.commit('validator_time');
}

const get_pre_info = async (block:T.Block,chain:T.Block[]):Promise<[{stateroot:string,locationroot:string},T.Candidates[]]>=>{
    const pre_block = chain[chain.length-1] || BlockSet.empty_block();
    const S_Trie = trie_ins(pre_block.meta.stateroot);
    const StateData = await states_for_block(pre_block,chain,S_Trie);
    const L_Trie = trie_ins(pre_block.meta.locationroot);
    const LocationData = await locations_for_block(pre_block,chain,L_Trie);
    const candidates = BlockSet.NewCandidates(unit,rate,StateData);
    const accepted = await BlockSet.AcceptBlock(block,chain,0,my_version,block_time,max_blocks,block_size,candidates,S_Trie.now_root(),L_Trie.now_root(),native,unit,rate,token_name_maxsize,all_issue,StateData,LocationData);
    await P.forEach(accepted.state, async (state:T.State)=>{
        if(state.kind==="state") await S_Trie.put(state.owner,state);
        else await S_Trie.put(state.token,state);
    });
    await P.forEach(accepted.location, async (loc:T.Location)=>{
        await L_Trie.put(loc.address,loc);
    });
    const pre_root = {
        stateroot:S_Trie.now_root(),
        locationroot:L_Trie.now_root()
    }
    return [_.copy(pre_root),accepted.candidates.slice()];
}

export const check_chain = async (new_chain:T.Block[],my_chain:T.Block[],pool:T.Pool,roots:{[key:string]:string},candidates:T.Candidates[],codes:{[key:string]:string},secret:string,mode:boolean,unit_store:{[key:string]:T.Unit[]},socket:IO)=>{
    if(new_chain.length>my_chain.length){
        /*const news = new_chain.slice().reverse();
        let target:T.Block[] = [];
        for(let index in news){
            let i = Number(index);
            if(my_chain[news.length-i-1]!=null&&_.ObjectHash(my_chain[news.length-i-1])===_.ObjectHash(news[i])) break;
            else if(news[i].meta.kind==="key") target.push(news[i]);
            else if(news[i].meta.kind==="micro") target.push(news[i]);
        }
        const add_blocks = target.slice().reverse();
        const back_chain = my_chain.slice(0,add_blocks[0].meta.index);
        console.log("add_block:");
        console.log(add_blocks);*/
        const back_chain:T.Block[] = [gen.block];
        const add_blocks = new_chain.slice(1);
        store.commit("replace_chain",back_chain.slice());
        const info = await (async ()=>{
            if(back_chain.length===1){
                return{
                    pool:_.copy(pool),
                    roots:_.copy(roots),
                    candidates:candidates.slice(),
                    chain:back_chain.slice()
                }
            }
            console.log(back_chain.length)
            const pre_info = await get_pre_info(back_chain[back_chain.length-1],back_chain);
            return {
                pool:_.copy(pool),
                roots:_.copy(pre_info[0]),
                candidates:pre_info[1].slice(),
                chain:back_chain.slice()
            }
        })();
        await P.reduce(add_blocks,async (result:{pool:T.Pool,roots:{[key:string]:string},candidates:T.Candidates[],chain:T.Block[]},block:T.Block)=>{
            const accepted = await block_accept(block,result.chain,result.candidates,result.roots,result.pool,codes,secret,mode,unit_store,socket);
            const amount = await get_balance(store.getters.my_address);
            store.commit("refresh_balance",amount);
            return _.copy(accepted);
        },info);
    }else console.log("not replace")
}

export const unit_buying = async (secret:string,units:T.Unit[],roots:{[key:string]:string},chain:T.Block[],socket:IO)=>{
    try{
        console.log("unit!");
        const pub_key:string[] = [CryptoSet.PublicFromPrivate(secret)]
        const from:string = CryptoSet.GenereateAddress(unit,_.reduce_pub(pub_key));
        const remiter = CryptoSet.GenereateAddress(native,_.reduce_pub(pub_key));
        const pre_tx = TxSet.CreateRequestTx(pub_key,remiter,10,"issue",unit,[from],["buy",remiter,JSON.stringify(units)],[],my_version,TxSet.empty_tx_pure().meta.pre,TxSet.empty_tx_pure().meta.next,0.05);
        const tx = TxSet.SignTx(pre_tx,secret,from);
        const stateroot = roots.stateroot;
        const S_Trie:Trie = trie_ins(stateroot);
        const locationroot = roots.locationroot;
        const L_Trie:Trie = trie_ins(locationroot);
        const StateData = await states_for_tx(tx,chain,S_Trie);
        const LocationData = await locations_for_tx(tx,chain,L_Trie);
        if(!TxSet.ValidRequestTx(tx,my_version,native,unit,StateData,LocationData)) console.log("fail to buy units");
        else{
            console.log("buy unit!");
            socket.emit('tx',JSON.stringify(tx));
        }
    }
    catch(e){console.log(e);}
}