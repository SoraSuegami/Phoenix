var Trie = require('merkle-patricia-tree');
var Proof = require('merkle-patricia-tree/proof');
var fs = require('fs');
var CryptoSet = require('./crypto_set.js');
var crypto = require("crypto");
var levelup = require('levelup');
var leveldown = require('leveldown');
var rlp = require('rlp');
var db = levelup(leveldown('./db/blockchain'));
var currency_name = 'nix';
var txlimit = 10;
var password = "Sora"
var beneficiaryPub = CryptoSet.PullMyPublic(password);
var beneficiary = CryptoSet.AddressFromPublic(beneficiaryPub);


function toHash(str){
  var sha256 = crypto.createHash('sha256');
  sha256.update(str);
  var pre_hash = sha256.digest('hex');
  var sha512 = crypto.createHash('sha512');
  sha512.update(pre_hash);
  var hash = sha512.digest('hex');
  return hash;
}

function calculateHashForTx(Tx){
  var edit_tx = Tx;
  delete edit_tx.meta.hash;
  delete edit_tx.meta.signature;
  return toHash(JSON.stringify(edit_tx));
}

function ReadState(){
  try{
    var State = JSON.parse(fs.readFileSync('./jsons/PhoenixAccountState.json', 'utf8'));
  }catch(err){
    var State = {};
    fs.writeFile('./jsons/PhoenixAccountState.json', JSON.stringify(State),function(err){
      if (err) {
          throw err;
      }
    });
  }
  return State;
}

function ReadBlocks(){
  try{
    var BlockChain = JSON.parse(fs.readFileSync('./jsons/PhoenixBlockChain.json', 'utf8'));
  }catch(err){
    var BlockChain = [];
    fs.writeFile('./jsons/PhoenixBlockChain.json', JSON.stringify(BlockChain),function(err){
      if (err) {
          throw err;
      }
    });
  }
  return BlockChain;
}

function ReadPool(){
  try{
    var Pool = JSON.parse(fs.readFileSync('./jsons/PhoenixTransactionPool.json', 'utf8'));
  }catch(err){
    var Pool = [];
    fs.writeFile('./jsons/PhoenixTransactionPool.json', JSON.stringify(Pool),function(err){
      if (err) {
          throw err;
      }
    });
  }
  return Pool;
}

function ReadDagData(){
  try{
    const DagData = JSON.parse(fs.readFileSync('./jsons/PhoenixDagData.json', 'utf8'));
  }catch(err){
    const DagData = {};
    fs.writeFile('./jsons/PhoenixDagData.json', JSON.stringify(DagData),function(err){
      if (err) {
          throw err;
      }
    });
  }
  return DagData;
}

function TxJson(from,to,option,timestamp,fee,nonce,pure_hash,evidence,pre_tx=null,next_tx=null,hash){
  return{
    type:type,
    from:from,
    to:to,
    timestamp:timestamp,
    options:options,
    fee:fee,
    nonce:nonce,
    pure_hash:pure_hash,
    evidence:evidence,
    pre_tx:pre_tx,
    next_tx:next_tx,
    hash:hash
  }
}

function TxList(Txs){
  return{
    meta:{
      num:num,
      root_hash:root_hash
    }
    transactions:Txs;
  }
}

function StateJson(address,nonce,balance,deposit,used_hash,issue_token,storage,code){
  return{
    address:address,
    nonce:nonce,
    balance:balance,
    deposit:deposit,
    used_hash:used_hash,
    issue_token:issue_token,
    storage:storage,
    code:code
  }
}

function SetState(address,StateData){
  if(StateData[address]==null){
    return StateJson(address,0,{[currency_name]:0},{},{},{},{},{});
  }
  else{
    return StateData[address]
  }
}


function pull_tx_type(tx){
  return tx.type;
}
function pull_tx_from(tx){
  return tx.from;
}
function pull_tx_to(tx){
  return tx.to;
}
function pull_tx_timestamp(tx){
  return tx.timestamp;
}
function pull_tx_options(tx){
  return tx.options;
}
function pull_tx_fee(tx){
  return tx.fee;
}
function pull_tx_nonce(tx){
  return tx.nonce;
}
function pull_tx_pure_hash(tx){
  return tx.pure_hash;
}
function pull_tx_evidence(tx){
  return tx.evidence;
}
function pull_tx_pre_tx(tx){
  return tx.pre_tx;
}
function pull_tx_next_tx(tx){
  return tx.next_tx;
}
function pull_tx_hash(tx){
  return tx.hash;
}
function pull_txlist_num(tx_list){
  return tx_list.num;
}
function pull_txlist_root_hash(tx_list){
  return tx_list.root_hash;
}
function pull_txlist_txs(tx_list){
  return tx_list.transactions;
}

function calculateHashForPureTx(tx){
  var edit_tx = tx;
  delete edit_tx.pure_tx;
  delete edit_tx.pre_tx;
  delete edit_tx.next_tx;
  delete edit_tx.hash;
  return toHash(JSON.stringify(edit_dag));
}

function calculateHashForTx(tx){
  var edit_tx = tx;
  delete edit_tx.hash;
  return toHash(JSON.stringify(edit_dag));
}

function Confirmes(dag,DagData){
  var first_confirm = null;
  var second_confirm = null;
  for(var d of DagData){
    if(pull_parenthash(d)==pull_hash(dag)){
      first_confirm = pull_hash(d);
      break;
    }
  }
  for(var d of DagData){
    if(pull_parenthash(d)==pull_hash(first_confirm)){
      second_confirm = pull_hash(d);
      break;
    }
  }
  return second_confirm;
}

function invaildTx(tx,StateData,DagData){
  const date = new Date();
  const from = pull_tx_from(tx);
  const state = SetState(from,StateData);
  const dag = DagData[pull_tx_evidence(tx)];
  if(pull_tx_timestamp(tx)>date.getTime()){
    console.error("invalid timestamp");
    return false;
  }
  else if(pull_tx_nonce(tx)!=state.nonce){
    console.error("invalid nonce");
    return false;
  }
  else if(pull_tx_pure_hash(tx)!=calculateHashForPureTx(tx)){
    console.error("invalid pure hash");
    return false;
  }
  else if((dag.meta.app!=from)||(state.used_hash[pull_tx_evidence(tx)]!=null)||(Confirmes(dag,DagData)==null)){
    console.error("invalid evidence");
    return false;
  }
  else if(pull_tx_hash(tx)!=calculateHashForTx(tx)){
    console.error("invalid hash");
    return false;
  }
  else if(1){
    switch (pull_tx_type(tx)) {
      case "remit":
        const value = pull_tx_options(tx);
        for(var kind in value){
          if(state.balance[kind]==null || state.balance[kind]<value[kind]){
            console.error("invaild value");
            return false;
            break;
          }
        }
        break;
      case "register_app":
        const code = pull_tx_options(tx);
        const code_id = code.code_id;
        const code_buf = Buffer.from(code.data);
        if(!from.match(/^PH/)){
          console.error("You can't register code to this address");
          return false;
        }
        else if(state.code[code_id]!=null){
          console.error("This code id is already used");
          return false;
        }
        else if(code_buf.length!=code.size){
          console.error("invalid code size");
          return false;
        }
        break;
      case "issue_token":
       break;
      case "add_data":
        break;
      case "deposit":
        break;
      case "withdrawal":
        break;
      default:
        console.error("invaild type");
        return false;
        break;
    }
  }

}




















































































try{
  var States = JSON.parse(fs.readFileSync('./jsons/PhoenixAccountState.json', 'utf8'));
}catch(err){
  var States = {};
  fs.writeFile('./jsons/PhoenixAccountState.json', JSON.stringify(States),function(err){
    if (err) {
        throw err;
    }
  });
}


try{
  var Pool = JSON.parse(fs.readFileSync('./jsons/PhoenixTransactionPool.json', 'utf8'));
}catch(err){
  var Pool = [];
  fs.writeFile('./jsons/PhoenixTransactionPool.json', JSON.stringify(Pool),function(err){
    if (err) {
        throw err;
    }
  });
}

try{
  var BlockChain = JSON.parse(fs.readFileSync('./jsons/PhoenixBlockChain.json', 'utf8'));
}catch(err){
  var BlockChain = [];
  fs.writeFile('./jsons/PhoenixBlockChain.json', JSON.stringify(BlockChain),function(err){
    if (err) {
        throw err;
    }
  });
}



function toHash(str){
  var sha256 = crypto.createHash('sha256');
  sha256.update(str);
  var pre_hash = sha256.digest('hex');
  var sha512 = crypto.createHash('sha512');
  sha512.update(pre_hash);
  var hash = sha512.digest('hex');
  return hash;
}

class AccountState{
  constructor(address){
    this.address = address;
    if(this.nonce==null){
      this.nonce=0;
    }
    if(this.balance==null){
      this.balance = {[currency_name]:0};
    }
  }
  SendMoney(nonce,value){
    if(this.nonce != nonce-1){
      throw new Error("Your nonce is wrong");
      return false;
    }
    else{
      this.nonce ++;
    }
    for(var kind in value){
      if(this.balance==null || this.balance[kind]==null){
        throw new Error("Sender don't have enough "+kind);
        return false;
      }
      else if(this.balance[kind] < value[kind]){
        throw new Error("Sender don't have enough "+kind);
        return false;
      }
      else{
        this.balance[kind] -= value[kind];
      }
    }
    States[this.address] = {
      address:this.address,
      nonce:this.nonce,
      balance:this.balance
    };
    fs.writeFile('./jsons/PhoenixAccountState.json', JSON.stringify(States),function(err){
      if (err) {
          throw err;
      }
    });
    ChangeWorld(this);
  }
  ReceiveMoney(value){
    for(var kind in value){
      if(this.balance==null || this.balance[kind]==null){
        this.balance[kind] = value[kind];
      }
      else{
        this.balance[kind] += value[kind];
      }
    }
    States[this.address] = {
      address:this.address,
      nonce:this.nonce,
      balance:this.balance
    };
    fs.writeFile('./jsons/PhoenixAccountState.json', JSON.stringify(States),function(err){
      if (err) {
          throw err;
      }
    });
    ChangeWorld(this);
  }
  Json(){
    return{
      address:this.address,
      nonce:this.nonce,
      balance:this.balance
    };
  }
};

var World = new Trie(db);
function ChangeWorld(acstate){
  var address = Buffer.from(acstate.address,'utf-8');
  var state = rlp.encode(JSON.stringify(acstate.Json()));
  World.put(address,state,function(){
    return true;
  });
}


/*var me = new AccoutState('PHaaaf75971931bbf95933d48941edb0');
States[me.address] = me.Json();
ChangeWorld(me);
fs.writeFile('./jsons/PhoenixAccountState.json', JSON.stringify(States),function(err){
  if (err) {
      throw err;
  }
});*/



class Tx{
  constructor(from,from_key,to,to_key,value,gas,timestamp,nonce,hash,signature,timelock={bigin:null,end:null}) {
    this.from = from;
    this.from_key = from_key;
    this.to = to;
    this.to_key = to_key;
    this.value = value;
    this.gas = gas;
    this.timestamp = timestamp;
    this.nonce = nonce;
    this.hash = hash.toString();
    this.signature = signature;
    this.timelock = timelock;
  }
  Json(){
    return{
      from:this.from,
      from_key:this.from_key,
      to:this.to,
      to_key:this.to_key,
      value:this.value,
      gas:this.gas,
      timestamp:this.timestamp,
      nonce:this.nonce,
      hash:this.hash,
      signature:this.signature,
      timelock:this.timelock
    }
  }
  ChangeAcState(){
    var sender = SetMyState(this.from);
    try{
      sender.SendMoney(this.nonce,this.value);
      var receiver = SetMyState(this.to);
      receiver.ReceiveMoney(this.value);
    }catch(err){
      console.log(err);
    }
  }
  inValidTx(){
    if(this.from!=CryptoSet.AddressFromPublic(this.from_key)){
      console.error("invalid sender's publicKey");
      return false;
    }
    else if (this.to!=CryptoSet.AddressFromPublic(this.to_key)) {
      console.error("invalid receiver's publicKey");
      return false;
    }
    else if(this.value<0){
      console.error("invalid value");
      return false;
    }
    else if(this.nonce!=SetMyState(this.address).nonce+1){
      console.error("invalid nonce");
      return false;
    }
    else if (calculateHashForTx(this)!=this.hash){
      console.error("invalid hash");
      return false;
    }
    else if (CryptoSet.verifyData(this.hash,this.signature,this.from_key)==false){
      console.error("invalid signature");
      return false;
    }
    else if (DAGScript.inValidTxFromDag(this)) {
      console.error("invalid signature");
      return false;
    }
    else if(this.timelock!=null&&this.timelock.bigin!=null&&this.timelock.end!=null&&this.timelock.bigin>=this.timelock.end){
      console.error("invalid timelock");
      return false;
    }
    return true;
  }
}

function SetMyState(address){
  var my_state;
  if(States[address] == null){
    my_state = new AccountState(address);
    my_state.nonce = 0;
    my_state.balance = {[currency_name]:0};
    States[address] = my_state.Json();
  }
  else{
    my_state = new AccountState(address);
    my_state.nonce = States[address].nonce;
    //console.log(my_state.nonce);
    my_state.balance = States[address].balance;
  }
  return my_state;
}

function calculateHashForTx(tx){
  if(tx.from==null||tx.from_key==null||tx.to==null||tx.to_key==null||tx.value==null||tx.gas==null||tx.timestamp==null||tx.nonce==null){
    console.error("invalid tx data");
    return false;
  }
  if(tx.timelock==null){
    tx.timelock="";
  }
  var hash = toHash(tx.from+tx.from_key+tx.to+tx.to_key+JSON.stringify(tx.value)+JSON.stringify(tx.gas)+tx.timestamp+tx.nonce+JSON.stringify(tx.timelock));
  return hash;
}

function CreateTx(password,from,from_key,to,to_key,value,gas,timelock={bigin:null,end:null}){
  var date = new Date();
  var timestamp = date.getTime();
  var nonce = SetMyState(from).nonce+1;
  var hash = toHash(from+from_key+to+to_key+JSON.stringify(value)+JSON.stringify(gas)+timestamp+nonce+JSON.stringify(timelock));
  var signature = CryptoSet.SignData(hash,password);
  var NewTx = new Tx(from,from_key,to,to_key,value,gas,timestamp,nonce,hash,signature,timelock);
  return NewTx;
}


class Block{
  constructor(index,parentHash,Hash,timestamp,txnum,beneficiary,beneficiaryPub,stake,dags,gassum,signature,transactionsRoot,stateRoot,transactions){
    this.index = index;
    this.parentHash = parentHash;
    this.Hash = Hash;
    this.timestamp = timestamp;
    this.txnum = txnum;
    this.beneficiary = beneficiary;
    this.beneficiaryPub = beneficiaryPub;
    this.stake = stake;
    this.dags = dags;
    this.gassum = gassum;
    this.signature = signature;
    this.transactionsRoot = transactionsRoot;
    this.stateRoot = stateRoot;
    this.transactions = transactions;
  }
  Json(){
    return{
      header:{
        index:this.index,
        parentHash:this.parentHash,
        Hash:this.Hash,
        timestamp:this.timestamp,
        txnum:this.txnum,
        beneficiary:this.beneficiary,
        beneficiaryPub:this.beneficiaryPub,
        stake:this.stake,
        dags:this.dags,
        gassum:this.gassum,
        signature:this.signature,
        transactionsRoot:this.transactionsRoot,
        stateRoot:this.stateRoot
      },
      transactions:this.transactions
    }
  }
  inValidBlock(){
    var date = new Date();
    var acstate = new AccoutState(beneficiary);
    if(this.index!=BlockChain.length){
      console.error("invalid index");
      return false;
    }
    else if(this.parentHash!=BlockChain[this.index-1].Hash){
      console.error("invalid parentHash");
      return false;
    }
    else if(this.timestamp>date.getTime()){
      console.error("invalid timestamp");
      return false;
    }
    else if (this.txnum!=this.transactions.length) {
      console.error("invalid txnum");
      return false;
    }
    else if (acstate==null){
      console.error("invalid beneficiary");
      return false;
    }
    else if (acstate.balance==null||acstate.balance[currency_name]==null||this.stake>acstate.balance[currency_name]) {
      console.error("invalid stake");
      return false;
    }
    else if (this.transactionsRoot!=GetTreeroot(this.transactions)){
      console.error("invalid transactionsRoot");
      return false;
    }
    else if (this.stateRoot!=World.root.toString('hex')){
      console.error("invalid stateRoot");
      return false;
    }
    else if
    (this.Hash!=toHash(this.index+this.parentHash+this.timestamp+this.beneficiary+this.beneficiaryPub+this.stake+this.dags+this.txnum+JSON.stringify(this.gassum)+this.transactionsRoot+this.stateRoot)) {
      onsole.error("invalid hash");
      return false;
    }
    else if (CryptoSet.verifyData(this.Hash,this.signature,this.beneficiaryPub)==false) {
      console.error("invalid signature");
      return false;
    }
    return true;
  }
  Add(){
    if(this.inValidBlock()==false) return false;
    BlockChain.push(this.Json());
    fs.writeFile('./jsons/PhoenixBlockChain.json', JSON.stringify(BlockChain),function(err){
      if (err) {
          throw err;
      }
    });
    for(tx of transactions){
      tx.ChangeAcState();
    }
    return this.Json();
  }
}

function AddtoPool(tx,password){
  Pool.push(tx);
  if(tx.inValidTx()==false) return false;
  else if(Pool.length==txlimit){
    var new_block = MakeBlock(Pool,beneficiary,stake,dags,password);
    Pool.shift();
  }
  else if(Pool.length>txlimit){
    var yet_tx = Pool.slice(0,txlimit);
    var new_block = MakeBlock(yet_tx,beneficiary,stake,dags,password);
    Pool.splice(0,txlimit);
  }
}

function GetTreeroot(txs) {
  if(txs==null)return false;
  var pre;
  for(var tx of txs){
    pre.push(tx.hash);
  }
  var next;
  while (pre.length>1) {
    next = [];
    for (var i = 0; i < pre.length; i++){
      i = Number(i);
      if(i%2==1)continue;
      var left = pre[i];
      var right;
      if(pre[i+1]==null) right = toHash("");
      else right = pre[i+1];
      next.push(toHash(left+right));
    }
    pre = next;
  }
  return pre[0];
}

function MakeBlock(transactions,beneficiary,beneficiaryPub,stake,dags,password) {
  var index = BlockChain.length;
  var parentHash = BlockChain[index-1].Hash;
  var date = new Date();
  var timestamp = date.getTime();
  var txnum = transactions.length;
  var gassum = {};
  for(var tx of transactions){
    var gas = tx.gas;
    for(var kind in gas){
      if(gassum[kind]==null){
        gassum[kind]=gas[kind];
      }
      else{
        gassum[kind] += gas[kind];
      }
    }
  }
  var transactionsRoot = GetTreeroot(transactions);
  var stateRoot = World.root.toString('hex');
  var Hash = toHash(index+parentHash+timestamp+beneficiary+beneficiaryPub+stake+dags+txnum+JSON.stringify(gassum)+transactionsRoot+stateRoot);
  var signature = CryptoSet.SignData(Hash,password);
  var make_block =
  new Block(index,parentHash,Hash,timestamp,txnum,beneficiary,beneficiaryPub,stake,dags,gassum,signature,transactionsRoot,stateRoot,transactions);
  return make_block;
}
module.exports = {
  CreateTx:CreateTx
}