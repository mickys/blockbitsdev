const BigNumber = require('bignumber.js');    // using bn.js from web3-utils
// these settings are used in both deployments and tests

// ethereum network related variables
let ether = 1000000000000000000;                        // 1 ether in wei
let days = 3600 * 24;                                   // 1 day in seconds
let now = parseInt(( Date.now() / 1000 ).toFixed());    // unixtime now in seconds

let solidity = {
    ether:ether,
    days:days,
    now:now
};

// Project Token settings

let token_settings = {
    supply: new BigNumber(5).mul(10 ** 6).mul( 10 ** 18 ),   // 5 mil tokens * decimals
    decimals: 18,                           // make sure to update supply decimals if updated
    name: "Block Bits IO Tokens",
    symbol: "BBX",
    version: "v1"                           // required in order to be able to deploy a new version if need arises
};

/*
    Project Token SCADA - Token Stake Calculation And Distribution Algorithm
    - TokenSCADA1Market   - requires a global hard cap, individual caps need to be 0
    - TokenSCADA2Fixed    - requires individual hard caps, global is calculated
    - TokenSCADA3Variable - requires individual hard caps, global is calculated
*/
let tokenSCADA = {
    type:"TokenSCADA1Market",
    requires_global_hard_cap: false
};

let funding_global_soft_cap = new BigNumber(20000).mul( 10 ** 18 );
let funding_global_hard_cap = new BigNumber(60000).mul( 10 ** 18 );

let funding_next_phase_price_increase = 20; // percentage increase in next funding phase

let pre_ico_duration = 7 * days;
let pre_ico_start = now + 10 * days;
let pre_ico_end = pre_ico_start + pre_ico_duration;

let pre_ico_settings = {
    name: "PRE ICO",                            //  bytes32 _name,
    description: "PRE ICO Funding Phase",       //  bytes32 _description,
    start_time: pre_ico_start,                  //  uint256 _time_start,
    end_time: pre_ico_end,                      //  uint256 _time_end,
    amount_cap_soft: 0,                         //  uint256 _amount_cap_soft,
    amount_cap_hard: 0,                         //  uint256 _amount_cap_hard,
    methods: 3,                                 //  uint8   _methods, 3 = DIRECT_AND_MILESTONE
    minimum_entry: new BigNumber(1).mul(ether), //  uint256 _minimum_entry,
    start_parity: 0,                            //  uint256 _start_parity,
    use_parity_from_previous: false,            //  bool
    token_share_percentage: 10,                 //  uint8
};

let ico_duration = 30 * days;
let ico_start = pre_ico_end + 7 * days;
let ico_end = ico_start + ico_duration;

let ico_settings = {
    name: "ICO",
    description: "ICO Funding Phase",
    start_time: ico_start,
    end_time: ico_end,
    amount_cap_soft: 0,
    amount_cap_hard: 0,
    methods: 3,
    minimum_entry: 0,
    start_parity: 0,
    use_parity_from_previous: true,
    token_share_percentage: 40,
};

let funding_periods = [pre_ico_settings, ico_settings];

/*
if(tokenSCADA.requires_global_hard_cap === false) {
    // remove hard caps if SCADA requires them to not be set
    funding_global_soft_cap = 0;
    funding_global_hard_cap = 0;
    for(let i = 0; i < funding_periods.length; i++) {
        funding_global_soft_cap+= funding_periods[i].amount_cap_soft;
        funding_global_hard_cap+= funding_periods[i].amount_cap_hard;
        funding_periods[i].amount_cap_soft = 0;
        funding_periods[i].amount_cap_hard = 0;
    }
}
*/

let project_milestones = [];
/*
let milestone_one = {
    name: "ICO",
    description: "ICO Funding Phase",
    start_time: ico_start,
    end_time: ico_end,
    amount_cap_soft: 0,
    amount_cap_hard: 0,
    methods: 3,
    minimum_entry: 0,
    start_parity: 0,
    use_parity_from_previous: true,
    token_share_percentage: 40,
};
project_milestones.push(milestone_one);
*/

let project_bylaws = {
    // funding bylaws
    "funding_next_phase_price_increase": funding_next_phase_price_increase,
    "funding_global_soft_cap": funding_global_soft_cap,
    "funding_global_hard_cap": funding_global_hard_cap,

    // token bylaws
    "token_fixed_supply": true,
    "owner_token_locked_until_project_finished": true,
    "tokenSCADA": "TokenSCADA1Market",

    // proposals
    "proposal_duration": 7 * days,

    // meetings
    "meeting_time_set_before_time": 7 * days,

    // cashback

};

let team_wallets = [
    {
        name: "micky",
        address: 0,
        address_rpc: 24,
        allocation: {
            units: 20,
            numerator: 50
        }

    },
    {
        name: "calin",
        address: 0,
        address_rpc: 23,
        allocation: {
            units: 12,
            numerator: 50
        }
    },
    {
        name: "mitza",
        address: 0,
        address_rpc: 22,
        allocation: {
            units: 8,
            numerator: 50
        }
    },
    {
        name: "vlad",
        address: 0,
        address_rpc: 21,
        allocation: {
            units: 1,
            numerator: 50
        }
    },
    {
        name: "ionut",
        address: 0,
        address_rpc: 20,
        allocation: {
            units: 1,
            numerator: 50
        }
    },
    {
        name: "radu",
        address: 0,
        address_rpc: 19,
        allocation: {
            units: 1,
            numerator: 50
        }
    }
];

let application_settings = {
    bylaws:project_bylaws,
    funding_periods:funding_periods,
    milestones:project_milestones,
    token:token_settings,
    tokenSCADA:tokenSCADA,
    solidity:solidity,
    team_wallets:team_wallets,
    doDeployments: false
};

module.exports = {
    application_settings:application_settings
};
