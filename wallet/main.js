"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const _ = __importStar(require("../core/basic"));
const merkle_patricia_1 = require("../core/merkle_patricia");
const StateSet = __importStar(require("../core/state"));
const DagSet = __importStar(require("../core/dag"));
const TxSet = __importStar(require("../core/tx"));
const ChainSet = __importStar(require("../core/chain"));
const PoolSet = __importStar(require("../core/tx_pool"));
const con_1 = require("./con");
const R = __importStar(require("ramda"));
const util = __importStar(require("util"));
const CryptoSet = require('../core/crypto_set.js');
const { map, reduce, filter, forEach, find } = require('p-iteration');
const RadixTree = require('dfinity-radix-tree');
const rlp = require('rlp');
const request = require('request');
/*const express = require('express');
const app = express();*/
const url = require('url');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const lib_func = (name, args) => {
    switch (name) {
        case "GetAddress":
            return CryptoSet.AddressFromPublic(CryptoSet.PullMyPublic.apply(this, args));
    }
};
const headers = {
    'Content-Type': 'application/json'
};
/*const set = async ()=>{
  console.log(db)
  const StateData = new Trie(db);
  const pre_1:StateSet.State = {
    hash:"",
    amount:1000000,
    contents:{
      owner:"PHe71b07d255f652bf137074b5af146d",
      token:key_currency,
      tag:{},
      data:"",
      product:"",
    }
  };
  const state_hash = _.toHash(JSON.stringify(pre_1));
  const first_state:StateSet.State = {
    hash:state_hash,
    amount:1000000,
    contents:{
      owner:"PHe71b07d255f652bf137074b5af146d",
      token:key_currency,
      tag:{},
      data:"",
      product:"",
    }
  };
  //await StateData.put(first_state.hash,first_state);
  const filtered = await StateData.filter();
  console.log(filtered);
  console.log(StateData.now_root());
}
set().then(()=>{console.log('OK')})*/
/*
(async ()=>{
  const StateData = new Trie(db,genesis_root_json.stateroot);
  await StateData.delete("91dbfd9fb2c104eedac4ea7539bd62660363401854fc581912c4861c1c0b9ec8e981644cb97a29317688fa34fccd51ded5ea5146e5015a5a7cc16ec0bb52d738");
  const pre_1:StateSet.State = {
    hash:"",
    amount:1000000,
    contents:{
      owner:"PHe71b07d255f652bf137074b5af146d",
      token:key_currency,
      tag:{},
      data:"",
      product:"",
    }
  };
  const state_hash = _.toHash(JSON.stringify(pre_1));
  const first_state:StateSet.State = {
    hash:state_hash,
    amount:1000000,
    contents:{
      owner:"PHe71b07d255f652bf137074b5af146d",
      token:key_currency,
      tag:{},
      data:"",
      product:"",
    }
  };
  await StateData.put(first_state.hash,first_state);
  const filtered = await StateData.filter();
  console.log(filtered);
  console.log(StateData.now_root());
})()

/*app.set('a','b');
app.get('/', function (req, res) {
  res.send(module.parent.exports.set('a'));
});*/
//import * as express from 'express'
/*const first_token:StateSet.Token = {
  token:key_currency,
  issued:10,
  codehash:"d90a9e605f88735006abaf513d38f91212aa9b5e339b8babe5c034f32f98a9e7de7c8e010715aefbd49e734c2617098d560719d78617217131fcf9e118b96744",
  developer:""
};
let tokens_json = {};
tokens_json[_.toHash(first_token.token)] = first_token;
fs.writeFileSync("./json/token.json",JSON.stringify(tokens_json));*/
/*
const first_state:StateSet.State = {
  hash:"91dbfd9fb2c104eedac4ea7539bd62660363401854fc581912c4861c1c0b9ec8e981644cb97a29317688fa34fccd51ded5ea5146e5015a5a7cc16ec0bb52d738",
  amount:10,
  contents:{
    owner:"PHbe5d786186c2715f6cd0dee771c78d",
    token:key_currency,
    tag:{},
    data:"",
    product:"",
  }
};*/ /*
const genesis_root = "56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421";

let genesis_root_json = JSON.parse(fs.readFileSync("./json/root.json","utf-8"));

const first_StateData = new Trie(db,genesis_root_json.stateroot);

CryptoSet.GenerateKeys("phoenix");
const test_pub = CryptoSet.PullMyPublic("phoenix");
console.log(test_pub)
const test_address = CryptoSet.AddressFromPublic(test_pub);

const DagData = new Trie(db,genesis_root_json.dag_root);

async function first_set(){

  await first_StateData.put(first_state.hash,first_state);
  const first_dag = await DagSet.CreateUnit("phoenix",test_pub,"",0,"",genesis_root_json.dag_root,1,["Hello Phoenix"],db);
  await DagData.put(first_dag.meta.hash,first_dag);
  return [first_StateData,DagData];
}*/
/*first_set().then(result=>{
  const state_root = result[0].now_root();
  const dag_root = result[1].now_root();
  console.log(dag_root);
  genesis_root_json.stateroot = state_root;
  genesis_root_json.dag_root = dag_root;
  console.log(genesis_root_json);
  fs.writeFileSync("./json/root.json",JSON.stringify(genesis_root_json));
});*/
/*
const RequestData = new Trie(db);

const sacrifice_state:StateSet.State = {
  hash:"",
  amount:100,
  contents:{
    owner:"PHbe5d786186c2715f6cd0dee771c78d",
    token:"sacrifice",
    tag:{},
    data:"0beb01318795598921c9f1da8cd5ffb7bb4f38da697a701c31a8751d5e4ae4af461b98f9001737f7d791f7f7e852d32d18043d5ec59239b17423c0e568a49508",
    product:"",
  }
};

(async ()=>{
  /*await DagData.delete("0beb01318795598921c9f1da8cd5ffb7bb4f38da697a701c31a8751d5e4ae4af461b98f9001737f7d791f7f7e852d32d18043d5ec59239b17423c0e568a49508");
  const first_dag = await DagSet.CreateUnit("phoenix",test_pub,"",0,"",genesis_root_json.dag_root,1,["Hello Phoenix"],db);
  await DagData.put(first_dag.meta.hash,first_dag);
  const filtered = await DagData.filter();
  console.log(filtered);
  console.log(first_dag.meta.hash);*/
/*const state:StateSet.State = await first_StateData.get("91dbfd9fb2c104eedac4ea7539bd62660363401854fc581912c4861c1c0b9ec8e981644cb97a29317688fa34fccd51ded5ea5146e5015a5a7cc16ec0bb52d738");
const request_tx = await TxSet.CreateRequestTx("phoenix","","",test_pub,0.1,state.hash,"issue","sacrifice",[],["00d7955885c7b97eff849c23786ed0a1d4b1bb9f5a17bcbc1cdbe75c55edd810a8c53a40e78346a148f1bb64b22ba2d459f7491c21f8a5c910ee3cd73a00e5d9"],[],[],[sacrifice_state],genesis_root_json.stateroot,db);
console.log(request_tx)
await RequestData.put(request_tx.meta.hash,request_tx);
const request_root = RequestData.now_root();
genesis_root_json.request_root = request_root;
fs.writeFileSync("./json/root.json",JSON.stringify(genesis_root_json));
const block = ChainSet.CreateBlock("phoenix",[],genesis_root_json.stateroot,request_root,0.001,1,test_pub,[],[request_tx]);

//fs.writeFileSync("./json/blockchain.json",JSON.stringify([block]));
console.log(await first_StateData.filter());
return ""
})()*/
// サーバーを起動する部分
//var server = app.listen(3000, "127.0.0.1");/*, function () {
/*var host = server.address().address;
var port = server.address().port;
console.log('Example app listening at http://%s:%s', host, port);*/
/*});*/
const electron = require("electron");
// アプリケーションをコントロールするモジュール
const main = electron.app;
// ウィンドウを作成するモジュール
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;
// メインウィンドウはGCされないようにグローバル宣言
let mainWindow;
con_1.db.close().then(() => {
    //execSync('node ./wallet/server.js');
    // 全てのウィンドウが閉じたら終了
    main.on('window-all-closed', function () {
        if (process.platform != 'darwin') {
            main.quit();
        }
    });
    // Electronの初期化完了後に実行
    main.on('ready', () => {
        // メイン画面の表示。ウィンドウの幅、高さを指定できる
        //execSync('node ./wallet/server.js');
        mainWindow = new BrowserWindow({ width: 1000, height: 800, 'node_integration': false });
        mainWindow.loadURL('file://' + __dirname + '/src/index.html');
        /*const peer_json = [
          {ip:"127.0.0.1",port:51753},
          {ip:"localhost",port:51754}
        ];
        fs.writeFileSync("./json/peer.json",JSON.stringify(peer_json));*/
        const fsw = fs.watch('./wallet/messages.json', {}, () => {
            /* console.log('changed');
             const genesis_root_json = JSON.parse(fs.readFileSync("./json/root.json","utf-8"));
             const DagData = new Trie(db,genesis_root_json.dag_root);
             const filtered = await DagData.filter();
             const logs:string[] = R.values(filtered).reduce((logs:string[],unit:DagSet.Unit)=>{
               return logs.concat(unit.log_raw);
             },[]);
             //console.log(logs)
             await db.close();*/
            const messages = JSON.parse(fs.readFileSync('./wallet/messages.json', 'utf-8'));
            mainWindow.webContents.send('new_message', messages);
        });
        ipc.on('GetAddress', async (event, arg) => {
            const result = ((arg) => {
                const pub_key = CryptoSet.PullMyPublic(arg);
                if (pub_key == null)
                    CryptoSet.GenerateKeys(arg);
                return CryptoSet.AddressFromPublic(CryptoSet.PullMyPublic(arg));
            })(arg);
            event.sender.send('R_GetAddress', result);
        });
        ipc.on('GetBalance', async (event, address) => {
            await con_1.db.open();
            const genesis_root_json = JSON.parse(fs.readFileSync("./json/root.json", "utf-8"));
            const StateData = new merkle_patricia_1.Trie(con_1.db, genesis_root_json.stateroot);
            let sum = 0;
            const result = await StateData.filter((key, value) => {
                return address == value.contents.owner && con_1.key_currency == value.contents.token;
            });
            for (let key in result) {
                sum += result[key].amount;
            }
            await con_1.db.close();
            event.sender.send('R_GetBalance', sum);
        });
        ipc.on('CreateRequestTx', async (event, arg) => {
            await con_1.db.open();
            const genesis_root_json = JSON.parse(fs.readFileSync("./json/root.json", "utf-8"));
            const password = arg[0];
            const amount = arg[1];
            const destination = arg[2];
            const pub_key = CryptoSet.PullMyPublic(password);
            const address = CryptoSet.AddressFromPublic(pub_key);
            const StateData = new merkle_patricia_1.Trie(con_1.db, genesis_root_json.stateroot);
            const result = await StateData.filter((key, value) => {
                return (address == value.contents.owner || destination == value.contents.owner) && con_1.key_currency == value.contents.token;
            });
            const states = R.values(result).reduce((reduced, state) => {
                if (state.contents.owner === address) {
                    reduced.base.push(state.hash);
                    reduced.from.push(state);
                    return reduced;
                }
                else if (state.contents.owner === destination) {
                    reduced.base.push(state.hash);
                    reduced.to.push(state);
                    return reduced;
                }
                else
                    return reduced;
            }, { from: [], to: [], base: [] });
            const from = states.from[0];
            const to = states.to[0] || StateSet.CreateState(amount, destination, con_1.key_currency, {}, _.toHash(""), "");
            const base = states.base;
            const new_state = ((from, to, amount) => {
                from.amount = (-1) * amount;
                to.amount = amount;
                return [from, to];
            })(from, to, amount);
            const tx = await TxSet.CreateRequestTx(password, "", "", pub_key, 0, from.hash, "change", con_1.key_currency, base, [], [], [], new_state, StateData);
            const chain = JSON.parse(fs.readFileSync("./json/blockchain.json", "utf-8"));
            const block = ChainSet.CreateBlock(password, chain, genesis_root_json.stateroot, genesis_root_json.request_root, con_1.fee_by_size, 1, from.hash, pub_key, [], [tx]);
            await con_1.db.close();
            const peers = JSON.parse(fs.readFileSync("./json/peer.json", "utf-8"));
            await forEach(peers, async (peer) => {
                await util.promisify(request.post)({
                    url: "http://" + peer.ip + ":" + peer.port + "/tx",
                    headers: headers,
                    json: tx
                });
                console.log("tx_sended");
                await util.promisify(request.post)({
                    url: "http://" + peer.ip + ":" + peer.port + "/block",
                    headers: headers,
                    json: block
                });
                console.log("block_sended");
            });
            event.sender.send('R_CreateRequestTx', tx);
        });
        ipc.on('CreateUnit', async (event, arg) => {
            await con_1.db.open();
            const genesis_root_json = JSON.parse(fs.readFileSync("./json/root.json", "utf-8"));
            const password = arg[0];
            const log = arg[1];
            const pub_key = CryptoSet.PullMyPublic(password);
            const chain = JSON.parse(fs.readFileSync("./json/blockchain.json", "utf-8"));
            const RequestData = new merkle_patricia_1.Trie(con_1.db, genesis_root_json.request_root);
            const requests = await reduce(chain, async (result, block, index) => {
                const reduced = await reduce(block.transactions, async (r, tx) => {
                    if (tx.kind == "refresh")
                        return r;
                    const req = await RequestData.get(tx.meta.hash);
                    if (Object.keys(req).length != 0)
                        return r;
                    r.hash = tx.meta.hash;
                    r.index = index;
                    return r;
                }, result);
                return reduced;
            });
            const StateData = new merkle_patricia_1.Trie(con_1.db, genesis_root_json.stateroot);
            const payee = await StateData.filter((key, value) => {
                return value.contents.owner == CryptoSet.AddressFromPublic(pub_key);
            });
            const DagData = new merkle_patricia_1.Trie(con_1.db, genesis_root_json.dag_root);
            /*await DagData.delete("07adeb4ec8dba3f6c60e2148ad818f78e01e72955d1517b2710826db81e02c6a8e96a059175b6906e1922d5a1679a2ae6637cc7776af1bca98c94de22f54ce31");*/
            const unit = await DagSet.CreateUnit(password, pub_key, requests.hash, requests.index, R.values(payee)[0].hash, 1, log, DagData);
            console.log(unit);
            const refresh = TxSet.CreateRefreshTx(password, unit);
            const block = ChainSet.CreateBlock(password, chain, genesis_root_json.stateroot, genesis_root_json.request_root, con_1.fee_by_size, 1, R.values(payee)[0].hash, pub_key, [], [refresh]);
            console.log(block);
            /*await db.close();
            await db.open();
            const DagData = new Trie(db);
            await DagData.put(unit.meta.hash,unit);
            console.log(await DagData.filter());
            console.log(DagData.now_root())*/
            await con_1.db.close();
            const peers = JSON.parse(fs.readFileSync("./json/peer.json", "utf-8"));
            await forEach(peers, async (peer) => {
                await util.promisify(request.post)({
                    url: "http://" + peer.ip + ":" + peer.port + "/unit",
                    headers: headers,
                    json: unit
                }).catch(e => { console.log(e); });
            });
            console.log("unit sended");
            await forEach(peers, async (peer) => {
                await util.promisify(request.post)({
                    url: "http://" + peer.ip + ":" + peer.port + "/tx",
                    headers: headers,
                    json: refresh
                }).catch(e => { console.log(e); });
            });
            console.log("refresh sended");
            await forEach(peers, async (peer) => {
                await util.promisify(request.post)({
                    url: "http://" + peer.ip + ":" + peer.port + "/block",
                    headers: headers,
                    json: block
                }).catch(e => { console.log(e); });
            });
            console.log("block sended");
        });
        // ウィンドウが閉じられたらアプリも終了
        mainWindow.on('closed', function () {
            mainWindow = null;
        });
        const app = express();
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.use(bodyParser.json());
        app.post('/tx', async (req, res) => {
            await con_1.db.open();
            const tx = req.body;
            console.log(tx);
            const pool = JSON.parse(fs.readFileSync('./json/tx_pool.json', 'utf-8'));
            const chain = JSON.parse(fs.readFileSync('./json/blockchain.json', 'utf-8'));
            const roots = JSON.parse(fs.readFileSync('./json/root.json', 'utf-8'));
            const stateroot = roots.stateroot;
            const dag_root = roots.dag_root;
            const request_root = roots.request_root;
            const StateData = new merkle_patricia_1.Trie(con_1.db, stateroot);
            const DagData = new merkle_patricia_1.Trie(con_1.db, dag_root);
            const RequestData = new merkle_patricia_1.Trie(con_1.db, request_root);
            const new_pool = await PoolSet.Tx_to_Pool(pool, tx, con_1.tag_limit, con_1.key_currency, con_1.fee_by_size, chain, StateData, DagData, RequestData);
            console.log("OK");
            await con_1.db.close();
            fs.writeFileSync("./json/tx_pool.json", JSON.stringify(new_pool));
            res.json(new_pool);
        });
        app.post('/block', async (req, res) => {
            await con_1.db.open();
            const block = req.body;
            console.log(block);
            const chain = JSON.parse(fs.readFileSync('./json/blockchain.json', 'utf-8'));
            const roots = JSON.parse(fs.readFileSync('./json/root.json', 'utf-8'));
            const stateroot = roots.stateroot;
            const dag_root = roots.dag_root;
            const request_root = roots.request_root;
            const StateData = new merkle_patricia_1.Trie(con_1.db, stateroot);
            const DagData = new merkle_patricia_1.Trie(con_1.db, dag_root);
            const RequestData = new merkle_patricia_1.Trie(con_1.db, request_root);
            const accepted = await ChainSet.AcceptBlock(block, chain, con_1.tag_limit, con_1.fee_by_size, con_1.key_currency, StateData, DagData, RequestData);
            fs.writeFileSync("./json/blockchain.json", JSON.stringify(accepted.chain));
            const new_roots = ((pre, accepted) => {
                roots.stateroot = accepted.state;
                roots.request_root = accepted.request;
                return roots;
            })(roots, accepted);
            console.log(new_roots);
            await con_1.db.close();
            fs.writeFileSync("./json/root.json", JSON.stringify(new_roots));
            res.json(accepted);
        });
        app.post('/unit', async (req, res) => {
            await con_1.db.open();
            const unit = req.body;
            //console.log(unit);
            const chain = JSON.parse(fs.readFileSync('./json/blockchain.json', 'utf-8'));
            const roots = JSON.parse(fs.readFileSync('./json/root.json', 'utf-8'));
            const dag_root = roots.dag_root;
            const memory_root = roots.memory_root;
            const DagData = new merkle_patricia_1.Trie(con_1.db, dag_root);
            const MemoryData = new merkle_patricia_1.Trie(con_1.db, memory_root);
            const accepted = await DagSet.AcceptUnit(unit, con_1.log_limit, chain, DagData, MemoryData);
            const new_roots = ((pre, accepted) => {
                roots.dag_root = accepted[0].now_root();
                roots.memory_root = accepted[1].now_root();
                return roots;
            })(roots, accepted);
            await con_1.db.close();
            fs.writeFileSync('./json/root.json', JSON.stringify(new_roots));
            const old_msgs = JSON.parse(fs.readFileSync('./wallet/messages.json', 'utf-8'));
            fs.writeFileSync('./wallet/messages.json', JSON.stringify(old_msgs.concat(unit.log_raw[0])));
            res.json(unit);
        });
        const server = app.listen(process.env.Phoenix_PORT, process.env.Phoenix_IP);
    });
});