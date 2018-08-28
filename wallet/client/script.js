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
const rxjs_socket_io_1 = require("rxjs-socket.io");
const index_1 = require("./index");
const CryptoSet = __importStar(require("../../core/crypto_set"));
const _ = __importStar(require("../../core/basic"));
const con_1 = require("../con");
const vue_1 = __importDefault(require("vue"));
const vuex_1 = __importDefault(require("vuex"));
const at_ui_1 = __importDefault(require("at-ui"));
const vue_router_1 = __importDefault(require("vue-router"));
const gen = __importStar(require("../../genesis/index"));
const P = __importStar(require("p-iteration"));
const port = process.env.vreath_port || "57750";
const ip = process.env.vreath_ip || "localhost";
console.log(ip);
const socket = new rxjs_socket_io_1.IO();
socket.connect('http://' + ip + ':' + port);
const onTx = new rxjs_socket_io_1.ioEvent('tx');
const onBlock = new rxjs_socket_io_1.ioEvent('block');
const checkChain = new rxjs_socket_io_1.ioEvent('checkchain');
const replaceChain = new rxjs_socket_io_1.ioEvent('replacechain');
const tx$ = socket.listenToEvent(onTx).event$.subscribe(async (data) => {
    try {
        const tx = JSON.parse(data);
        console.log(tx);
        await exports.store.dispatch("tx_accept", _.copy(tx));
    }
    catch (e) {
        console.log(e);
    }
});
const block$ = socket.listenToEvent(onBlock).event$.subscribe(async (data) => {
    try {
        const block = JSON.parse(data);
        const chain = exports.store.state.chain;
        if (block.meta.version >= con_1.compatible_version) {
            if (block.meta.index > chain.length)
                socket.emit("checkchain");
            else if (block.meta.index === chain.length)
                await exports.store.dispatch("block_accept", _.copy(block));
            console.log(block);
        }
    }
    catch (e) {
        console.log(e);
    }
});
const checkchain$ = socket.listenToEvent(checkChain).event$.subscribe(async (data) => {
    socket.emit('replacechain', JSON.stringify(exports.store.state.chain.slice()));
});
const replacehain$ = socket.listenToEvent(replaceChain).event$.subscribe(async (data) => {
    try {
        const chain = JSON.parse(data);
        console.log("replace:");
        console.log(chain);
        await index_1.check_chain(chain.slice(), JSON.parse(localStorage.getItem("chain") || JSON.stringify([gen.block])), _.copy(exports.store.state.pool), _.copy(exports.store.state.roots), exports.store.state.candidates.slice(), _.copy(exports.store.state.code), exports.store.state.secret, exports.store.state.validator_mode, exports.store.state.unit_store, socket);
        const S_Trie = index_1.trie_ins(exports.store.state.roots.stateroot);
        const unit_state = await S_Trie.get(CryptoSet.GenereateAddress(con_1.unit, CryptoSet.PublicFromPrivate(exports.store.state.secret)));
        if (chain.length === 1 && unit_state != null && unit_state.amount > 0)
            await index_1.send_key_block(JSON.parse(localStorage.getItem("chain") || JSON.stringify([gen.block])), exports.store.state.secret, exports.store.state.candidates.slice(), _.copy(exports.store.state.roots), _.copy(exports.store.state.pool), _.copy(exports.store.state.code), exports.store.state.validator_mode, socket);
    }
    catch (e) {
        console.log(e);
    }
});
vue_1.default.use(vuex_1.default);
vue_1.default.use(vue_router_1.default);
vue_1.default.use(at_ui_1.default);
const wallet = {
    name: "wallet",
    icon: "./img/vreathrogoi.jpg",
    pub_keys: [],
    deposited: 0
};
const setting = {
    name: "setting",
    icon: "./img/setting_icon.png",
    pub_keys: [],
    deposited: 0
};
const def_apps = {
    wallet: wallet,
    setting: setting
};
const codes = {
    "native": "const main = () => {};",
    "unit": "const main = () => {};"
};
localStorage.removeItem("data");
localStorage.removeItem("apps");
localStorage.removeItem("code");
localStorage.removeItem("pool");
localStorage.removeItem("chain");
localStorage.removeItem("roots");
localStorage.removeItem("candidates");
localStorage.removeItem("unit_store");
const test_secret = "f836d7c5aa3f9fcf663d56e803972a573465a988d6457f1111e29e43ed7a1041";
exports.store = new vuex_1.default.Store({
    state: {
        data: JSON.parse(localStorage.getItem("data") || "{}"),
        apps: JSON.parse(localStorage.getItem("apps") || JSON.stringify(def_apps)),
        code: JSON.parse(localStorage.getItem("code") || JSON.stringify(codes)),
        pool: JSON.parse(localStorage.getItem("pool") || "{}"),
        chain: JSON.parse(localStorage.getItem("chain") || JSON.stringify([gen.block])),
        roots: JSON.parse(localStorage.getItem("roots") || JSON.stringify(gen.roots)),
        candidates: JSON.parse(localStorage.getItem("candidates") || JSON.stringify(gen.candidates)),
        unit_store: JSON.parse(localStorage.getItem("unit_store") || JSON.stringify({})),
        secret: localStorage.getItem("secret") || CryptoSet.GenerateKeys(),
        balance: 0,
        validator_mode: false
    },
    mutations: {
        add_app(state, obj) {
            state.apps[obj.name] = _.copy(obj);
            localStorage.setItem("apps", JSON.stringify(_.copy(state.apps)));
        },
        del_app(state, key) {
            delete state.apps[key];
            localStorage.setItem("apps", JSON.stringify(_.copy(state.apps)));
        },
        refresh_pool(state, pool) {
            state.pool = _.copy(pool);
            localStorage.setItem("pool", JSON.stringify(_.copy(state.pool)));
        },
        add_block(state, block) {
            state.chain = state.chain.concat(block).sort((a, b) => {
                return a.meta.index - b.meta.index;
            });
            localStorage.setItem("chain", JSON.stringify(state.chain.slice()));
        },
        replace_chain(state, chain) {
            state.chain = chain.slice().sort((a, b) => {
                return a.meta.index - b.meta.index;
            });
            localStorage.setItem("chain", JSON.stringify(state.chain.slice()));
        },
        refresh_roots(state, roots) {
            state.roots = _.copy(roots);
            localStorage.setItem("roots", _.copy(state.roots));
        },
        refresh_candidates(state, candidates) {
            state.candidates = candidates.slice();
            localStorage.setItem("candidates", JSON.stringify(state.candidates.slice()));
        },
        refresh_unit_store(state, store) {
            state.unit_store = _.copy(store);
            localStorage.setItem("unit_store", JSON.stringify(_.copy(state.unit_store)));
        },
        refresh_secret(state, secret) {
            state.secret = secret;
            localStorage.setItem("secret", state.secret);
        },
        refresh_balance(state, amount) {
            state.balance = amount;
        },
        validator_time(state) {
            state.validator_mode = true;
            setTimeout(() => {
                state.validator_mode = false;
            }, con_1.block_time * con_1.max_blocks);
        }
    },
    getters: {
        my_address: (state) => CryptoSet.GenereateAddress(con_1.native, CryptoSet.PublicFromPrivate(state.secret)) || ""
    },
    actions: {
        tx_accept(commit, tx) {
            try {
                index_1.tx_accept(tx, exports.store.state.chain.slice(), _.copy(exports.store.state.roots), _.copy(exports.store.state.pool), exports.store.state.secret, exports.store.state.validator_mode, exports.store.state.candidates.slice(), exports.store.state.code, _.copy(exports.store.state.unit_store), socket).then(() => {
                    console.log("tx accept");
                });
            }
            catch (e) {
                console.log(e);
            }
        },
        block_accept(commit, block) {
            try {
                index_1.block_accept(block, exports.store.state.chain.slice(), exports.store.state.candidates.slice(), _.copy(exports.store.state.roots), _.copy(exports.store.state.pool), _.copy(exports.store.state.code), exports.store.state.secret, _.copy(exports.store.state.code), _.copy(exports.store.state.unit_store), socket).then(() => {
                    console.log("block accept");
                    index_1.get_balance(exports.store.getters.my_address).then((amount) => {
                        commit.commit("refresh_balance", amount);
                    });
                });
            }
            catch (e) {
                console.log(e);
            }
        },
    }
});
(async () => {
    const S_Trie = index_1.trie_ins("");
    await P.forEach(gen.state, async (s) => {
        if (s.kind === "state")
            await S_Trie.put(s.owner, s);
        else
            await S_Trie.put(s.token, s);
    });
    console.log("stateroot:");
    console.log(S_Trie.now_root());
    socket.emit("checkchain");
    let pre_length = 0;
    let new_length = exports.store.state.chain.length;
    setInterval(async () => {
        pre_length = new_length;
        new_length = exports.store.state.chain.length;
        console.log(pre_length);
        console.log(new_length);
        if (pre_length === new_length)
            await index_1.send_key_block(exports.store.state.chain, exports.store.state.secret, exports.store.state.candidates, exports.store.state.roots, exports.store.state.pool, exports.store.state.code, exports.store.state.validator_mode, socket);
    }, con_1.block_time * con_1.max_blocks * 10);
})();
const Home = {
    data: function () {
        return {
            installed: _.copy(this.$store.state.apps)
        };
    },
    store: exports.store,
    template: `
    <div id="vreath_home_apps">
        <ul>
            <li v-for="item in installed"
            class="vreath_app_unit">
                <div>
                <at-card>
                <router-link v-bind:to="item.name">
                <img v-bind:src="item.icon" width="150" height="150"/>
                </router-link>
                <h2 class="vreath_app_name">{{item.name}}</h2>
                </at-card>
                </div>
            </li>
        </ul>
    </div>
    `
};
const Wallet = {
    store: exports.store,
    data: function () {
        return {
            to: "Vr:native:cc57286592f4029e666e4f0b589fda1d8d295248510698e45f16b4aadef7592b",
            amount: "0.01"
        };
    },
    created: async function () {
        socket.emit("checkchain");
        const balance = await index_1.get_balance(this.from);
        console.log(balance);
        exports.store.commit("refresh_balance", balance);
    },
    watch: {
        refresh_balance: async function () {
            const balance = await index_1.get_balance(this.from);
            console.log(balance);
            exports.store.commit("refresh_balance", balance);
        }
    },
    computed: {
        from: function () {
            return this.$store.getters.my_address;
        },
        balance: function () {
            return this.$store.state.balance.toFixed(18);
        },
        secret: function () {
            return this.$store.state.secret;
        }
    },
    methods: {
        remit: async function () {
            try {
                console.log("request");
                await index_1.send_request_tx(this.$store.state.secret, this.to, this.amount, _.copy(this.$store.state.roots), this.$store.state.chain.slice(), _.copy(this.$store.state.pool), this.$store.state.validator_mode, this.$store.state.candidates.slice(), this.$store.state.code, socket);
            }
            catch (e) {
                console.log(e);
            }
        }
    },
    template: `
    <div>
        <h2>Wallet</h2>
        <at-input placeholder="from" v-model="from"></at-input>
        <at-input placeholder="to" v-model="to"></at-input>
        <at-input placeholder="amount" v-model="amount"></at-input>
        <at-input placeholder="secret" type="password" v-model="secret"></at-input>
        <at-button v-on:click="remit">Remit</at-button>
        <h3>Balance:{{ balance }}</h3>
    </div>
    `
};
const Setting = {
    computed: {
        menu_flag: function () {
            return this.$route.path === "/setting";
        }
    },
    methods: {
        back: function () {
            router.go(-1);
        }
    },
    template: `
    <div>
        <div v-if="menu_flag">
            <at-button><router-link to="/setting/account">Account</router-link></at-button><br>
            <at-button><router-link to="/setting/deposit">Deposit</router-link></at-button>
        </div>
        <div v-else>
            <at-button @click="back">Back</at-button>
            <router-view></router-view>
        </div>
    </div>
    `
};
const Account = {
    store: exports.store,
    data: function () {
        return {
            secret: this.$store.state.secret
        };
    },
    computed: {
        pub_key: function () {
            try {
                console.log(CryptoSet.PublicFromPrivate(this.secret));
                return CryptoSet.PublicFromPrivate(this.secret);
            }
            catch (e) {
                return "";
            }
        },
        address: function () {
            if (this.pub_key === "")
                return "";
            try {
                console.log(CryptoSet.GenereateAddress(con_1.native, this.pub_key));
                return CryptoSet.GenereateAddress(con_1.native, this.pub_key);
            }
            catch (e) {
                return "";
            }
        }
    },
    methods: {
        save: function () {
            this.$store.commit('refresh_secret', this.secret);
        }
    },
    template: `
    <div>
        <h2>Account</h2>
        <at-input v-model="secret" placeholder="secret" type="passowrd" size="large" status="info"></at-input><br>
        <p>address:{{address}}</p>
        <at-button v-on:click="save">Save</at-button>
    </div>
    `
};
const Deposit = {
    store: exports.store,
    computed: {
        installed: function () {
            console.log(this.$store.state.apps);
            return this.$store.state.apps;
        }
    },
    methods: {
        uninstall: function (key) {
            this.$store.commit('del_app', key);
        }
    },
    template: `
    <div>
        <h2>Deposit List</h2>
        <h1></h1>
        <div>
            <ul id="deposit_ul">
                <li v-for="inst in installed">
                    <at-card>
                    <img v-bind:src="inst.icon" width="70" height="70"/><h3>{{inst.name}}</h3>
                    <h4>deposited:{{inst.deposited}}</h4>
                    <at-button>deposit</at-button>
                    <at-button v-on:click="uninstall(inst.name)">uninstall</at-button>
                    </at-card>
                </li>
            </ul>
        </div>
    </div>
    `
};
let routes = [
    { path: '/', component: Home },
    { path: '/wallet', component: Wallet },
    { path: '/setting', component: Setting,
        children: [
            { path: 'account', component: Account },
            { path: 'deposit', component: Deposit }
        ]
    }
];
const router = new vue_router_1.default({
    routes: routes
});
const app = new vue_1.default({
    router: router
}).$mount('#app');
