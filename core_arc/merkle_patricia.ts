/*const Trie = require('merkle-patricia-tree');
const levelup = require('levelup');
const leveldown = require('leveldown');
const db = levelup(leveldown('./db/state'));
trie = new Trie(db,Buffer.from('2b77e8547bc55e2a95227c939f9f9d67952de1e970a017e0910be510b090aff3','hex'));
trie.put('test', 'one', function () {
  console.log(trie.root.toString('hex'));
});
const geted  = trie.get('test');
geted.then((err,val)=>{
  console.log(val.toString('utf-8'));
})

const stream = trie.createReadStream();
stream.on('data', function (data) {
  console.log('key:' + data.key.toString('hex'));
  console.log(data.value.toString());
});*/

import * as DagSet from './dag'
import * as StateSet from './state'
import * as ChainSet from './chain'
import * as util from 'util'
import * as PromiseSet from 'es6-promise'

const Merkle = require('merkle-patricia-tree');
const {map,reduce,filter,forEach} = require('p-iteration');
const promise = PromiseSet.Promise;
/*const levelup = require('levelup');
const leveldown = require('leveldown');
const db = levelup(leveldown('./db/state'));*/
const rlp = require('rlp');

/*export const en_key = (key:string):string[]=>{
  const result:string[] =  key.split("").reduce((array:string[],val:string)=>{
    const asclled:string = val.charCodeAt(0).toString(16);
    const splited:string[] = asclled.split("").reduce((a:string[],v:string)=>{
      const new_a = a.concat(v);
      return new_a;
    },[]);
    const new_array = array.concat(splited);
    return new_array;
  },[]);
  return result;
};*/

const en_key = (key:string):string=>{
  return rlp.encode(key);
}

const de_key = (key:string):string=>{
  return rlp.decode(key);
}

const en_value = (value):string=>{
  return rlp.encode(JSON.stringify(value));
}

const de_value = (value)=>{
  return JSON.parse(rlp.decode(value));
}

export class Trie {
  private trie
  constructor(db,root:string=""){
    if(root=="") this.trie = new Merkle(db);
    else this.trie = new Merkle(db,Buffer.from(root,'hex'));
  }

  async get(key:string){
    const result = await util.promisify(this.trie.get).bind(this.trie)(en_key(key));
    if(result==null) return {};
    return de_value(result);
  }

  async put(key:string,value){
    await util.promisify(this.trie.put).bind(this.trie)(en_key(key),en_value(value));
    return this.trie;
  }

  async delete(key:string){
    await util.promisify(this.trie.del).bind(this.trie)(en_key(key));
    return this.trie;
  }

  now_root():string{
    return this.trie.root.toString("hex");
  }

  checkpoint(){
    this.trie.checkpoint();
    return this.trie;
  }

  async commit(){
    await util.promisify(this.trie.commit).bind(this.trie)();
    return this.trie;
  }

  async revert(){
    await util.promisify(this.trie.revert).bind(this.trie)();
    return this.trie;
  }

  async filter(check:(key:string,value:any)=>boolean=(key:string,value)=>{return true}){
    let result:{[key:string]:any;} = {};
    const stream = this.trie.createReadStream();
    /*stream.on('data',(data)=>{
      const key = de_key(data.key);
      const value = de_value(data.value);
      if(check(key,value)) result[key] = value;
    });
    return result;*/
    return new promise<{[key:string]:any;}>((resolve,reject)=>{
      stream.on('data',(data)=>{
        const key = de_key(data.key);
        const value = de_value(data.value);
        if(check(key,value)) result[key] = value;
      });

      stream.on('end',(val)=>{
        resolve(result);
      });
    });
  }
}



/*export async function ChangeTrie(unit:DagSet.Unit,world_root:string,addressroot:string){
  const trie = new RadixTree({
    db: db,
    root: world_root
  });
  const token:string = unit.contents.token;
  const input_ids:string[] = unit.contents.input.token_id;
  const outputs:DagSet.Output = unit.contents.output;

  const token_root:string = await trie.get(en_key(token));
  const token_trie = new RadixTree({
    db: db,
    root: token_root
  });
  const removed = await reduce(input_ids,async (Trie,key:string)=>{
    await Trie.delete(en_key(key));
    return Trie;
  },token_trie);
  const seted = await reduce(outputs.states,async (Trie,state:StateSet.State)=>{
    await Trie.set(en_key(state.hash),state);
    return Trie;
  },removed);
  const new_token_root = await seted.flush();
  const new_token = await trie.set(en_key(token),new_token_root);
  const new_world_root = await new_token.flush();
  const AddressData = new RadixTree({
    db: db,
    root: addressroot
  });
  const address_aliases:ChainSet.AddressAlias[] = await AddressData.get(en_key(unit.contents.address));
  const address_added =outputs.states.reduce((aliases,state:StateSet.State)=>{
    return aliases.concat({
      kind:token,
      key:state.hash
    });
  },address_aliases);
  const new_address_data = address_added.reduce((new_aliases:ChainSet.AddressAlias[],alias:ChainSet.AddressAlias)=>{
    if(alias.kind==unit.contents.token&&input_ids.indexOf(alias.key)==-1){
      return new_aliases.concat(alias)
    }
  },[]);
  await AddressData.set(en_key(unit.contents.address),state);
  const new_address_root = await AddressData.flush();
  return {worldroot:new_world_root,addressroot:new_address_root};
}*/
