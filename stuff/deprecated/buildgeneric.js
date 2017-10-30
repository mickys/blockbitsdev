
function TestBuildHelper(setup){
    this.setup = setup;
    this.actions = [];
    this.deployed = [];
}

TestBuildHelper.prototype.addAction = function (title, method, args ) {
    this.actions.push ({
        title:title,
        method:method,
        args:args
    });
};

TestBuildHelper.prototype.execute = async function () {
    for(let i = 0; i < this.actions.length; i++) {
        let action = this.actions[i];

        if(typeof this[action.method] !== "undefined") {
            console.log(action.title);
            await this[action.method](action.args);
        } else {
            console.log("Error: ",action.title, " Method not found: ",action.method );
        }
    }
    // empty
    this.actions = [];
};

TestBuildHelper.prototype.getInstance = async function (name) {
    return await this.deployed[name];
};

TestBuildHelper.prototype.deploy = async function (args) {
    console.log("deploy: ", args.name);
    let truffleContract = await this.setup.helpers.getContract(args.name);
    let object = await truffleContract.new();
    this.deployed[args.name] = object;
    return object;
};

TestBuildHelper.prototype.transaction = async function (args) {
    if(typeof this.deployed[args.name] !== "undefined") {
        let object = this.deployed[args.name];
        console.log(object);
        return await object[args.method](args.args, args.truffle);
    } else {
        throw('Error: first deploy contract, then call methods on it.');
    }
};

TestBuildHelper.prototype.call = async function (args) {
    if(typeof this.deployed[args.name] !== "undefined") {
        let object = this.deployed[args.name];
            return await object[parameters.method].call(args.args, args.truffle);
    } else {
        throw('Error: first deploy contract, then call methods on it.');
    }
};

module.exports = TestBuildHelper;



/*
async function runBuilder() {

    let TestBuilder = new TestBuildHelper(setup);
    TestBuilder.addAction("Deploy Application Entity", "deploy", {name:"ApplicationEntity"});
    TestBuilder.addAction("Deploy Gateway Interface", "deploy", {name:"GatewayInterface"});
    TestBuilder.addAction("Deploy Proposals Asset", "deploy", {name:"Proposals"});
    await TestBuilder.execute();

    let instance = await TestBuilder.getInstance('Proposals');

    TestBuilder.addAction("Link Proposals Asset to Application Entity", "transaction", {
        name:"ApplicationEntity",
        args: {
            method: "addAssetProposals",
            args: [
                instance.address,
                setup.settings.sourceCodeUrl
            ]
        }
    });

    instance = await TestBuilder.getInstance('GatewayInterface');

    TestBuilder.addAction("Link Application Entity to Gateway Interface", "transaction", {
        name:"ApplicationEntity",
        args: {
            method: "linkToGateway",
            args: [
                instance.address,
                setup.settings.sourceCodeUrl
            ]
        }
    });
    await TestBuilder.execute();
}

runBuilder();
*/