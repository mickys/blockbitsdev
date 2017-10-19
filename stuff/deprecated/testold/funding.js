// settings
var _debug = true;
var GatewayInterfaceArtifacts = artifacts.require("./Funding.sol");
var LinkDatabaseArtifacts = artifacts.require("./LinkDatabase.sol");
var ApplicationEntityArtifacts = artifacts.require("./ApplicationEntity.sol");


var LinkDatabase ;
var GatewayInterface ;
var ApplicationEntity ;

LinkDatabaseArtifacts.new().then(function(instance) {
    LinkDatabase = instance;
    GatewayInterfaceArtifacts.new(LinkDatabase.address).then(function(instance) {
        GatewayInterface = instance;
        ApplicationEntityArtifacts.new(LinkDatabase.address, LinkDatabase.address).then(function(instance) {
            ApplicationEntity = instance;


            debug(LinkDatabase.address+" => LinkDatabase Address");
            debug(GatewayInterface.address+" => GatewayInterface Address");
            debug(ApplicationEntity.address+" => ApplicationEntity Address");

            LinkDatabase.getApplicationEntityAddress.call().then(function(address) {
                debug(address+" => ApplicationEntity Address @LinkDatabase ");
            });

            LinkDatabase.getApplicationEntityAddress().then(function(address) {
                debug(address+" => ApplicationEntity Address @LinkDatabase 2");
            });

            LinkDatabase.current().then(function(address) {
                debug(address+" => ApplicationEntity Address @LinkDatabase current");
            });

            // console.log(LinkDatabase);

        });
    });
    return instance;
});

contract('LinkDatabase', function(accounts) {

    /*
    LinkDatabase.deployed().then(function(instance) {
        return instance.getApplicationEntityAddress();
    }).then(function(address) {
        debug(address+" => ApplicationEntity Address @LinkDatabase ");
    });

    LinkDatabase.deployed().then(function(instance) {
        return instance.getApplicationEntityAddress.call();
    }).then(function(address) {
        debug(address+" => ApplicationEntity Address @LinkDatabase 2 ");
    });

    LinkDatabase.deployed().then(function(instance) {
        return instance.current();
    }).then(function(address) {
        debug(address+" => ApplicationEntity Address @LinkDatabase 3 ");
    });
    */
});
/*
contract('LinkDatabase', function(accounts) {
   debug(LinkDatabase.address+" => LinkDatabase Address");
   debug(GatewayInterface.address+" => GatewayInterface Address");
   debug(ApplicationEntity.address+" => ApplicationEntity Address");


   LinkDatabase.deployed().then(function(instance) {
       return instance.getApplicationEntityAddress();
   }).then(function(address) {
       debug(address+" => ApplicationEntity Address @LinkDatabase ");
   });

   LinkDatabase.deployed().then(function(instance) {
       return instance.getApplicationEntityAddress.call();
   }).then(function(address) {
       debug(address+" => ApplicationEntity Address @LinkDatabase 2 ");
   });

   LinkDatabase.deployed().then(function(instance) {
       return instance.current();
   }).then(function(address) {
       debug(address+" => ApplicationEntity Address @LinkDatabase 3 ");
   });


   LinkDatabase.deployed().then(function(instance) {
   //    console.log( instance );
   });


});
*/
// var utils = require("../utils.js");
// contracts
// var GatewayInterface = artifacts.require("./GatewayInterface.sol");
// var ApplicationEntity = artifacts.require("./ApplicationEntity.sol");

/*
contract('GatewayInterface', function(accounts) {
    var testingInterface = GatewayInterface;

    var onwerAccount = accounts[0];
    var buyerAccount = accounts[1];
    debug("Onwer address: "+ onwerAccount);
    debug("Buyer address: "+ buyerAccount);
    debug("GI address: "+ GatewayInterface.address);
    debug("AE address: "+ ApplicationEntity.address);


    it("should have a valid 0k owner address set", function() {
        return testingInterface.deployed().then(function(instance) {
            return instance.owner();
        }).then(function(owner) {
            debug("Set onwer address: "+ owner);
            assert.isOk(owner, "Address is not 0x.");
        });
    });

    it("should assign an ApplicationEntity contract at first run", function() {
        testingInterface.deployed().then(function(instance) {
            return instance.requestLinkageUpdate(ApplicationEntity.address, 'http://test.url/', {from: onwerAccount} );
        }).then(function (result) {
            var eventFound = false;
            for (var e in result.logs ){
                if(result.logs[e].event == "EventLinkageUpdateDone") {
                    eventFound = true;
                }
            }
            assert.isTrue(eventFound, "requestLinkageUpdate: EventLinkageUpdateDone not fired.");
        });
    });




});
*/
/*

contract('CrowdFunding', function(accounts) {

    it("should have a valid owner set", function() {
        return CrowdFunding.deployed().then(function(instance) {
            return instance.owner();
        }).then(function(owner) {
            debug("Owner address: "+owner);
            assert.isOk(owner, "Address is not 0x.");
        });
    });

    var testOneTitle = "should have a valid bylaws type in [ "+ListObject(available_bylaw_types)+ " ]";

    it(testOneTitle, function() {
        return CrowdFunding.deployed().then(function(instance) {
            return instance.bylawsType();
        }).then(function(type) {

            var test = false;
            if(available_bylaw_types[type] !== "") {
                test = true;
            }
            var expected = true;
            debug("Bylaws type: "+type);
            assert.equal(test, expected, "Bylaws type invalid");
        });
    });

    it("should have a valid CrowdToken contract linked", function() {
        return CrowdFunding.deployed().then(function(instance) {
            return instance.CrowdTokenContractAddress();
        }).then(function(token) {
            tokenAddress = token;
            debug("Token contract address: "+token);
            assert.isOk(token, "Address is not 0x.");
        });
    });


    it("should have a valid bountyType if the property is present", function() {
        return CrowdFunding.deployed().then(function(instance) {
            var test = false;
            if (typeof instance.bountyType === 'function') {
                return instance.bountyType();
            }
            assert.isFalse(test, "Should never get here!");
            return test;
        }).then(function(type) {
            debug("Bounty Type: " + type);
            if(type !== false) {
                assert.isAtLeast(type, 1, "bountyType error");
            }
        });
    });



    // start ico
    it("add ico only", function() {
        return CrowdFunding.deployed().then(function(instance) {
            var ts = Math.round((new Date()).getTime() / 1000);
            var dateStart = ts;
            var dateEnd = ts + 5;
            return instance.addIco(
                dateStart,
                dateEnd,
                1,
                10,
                50
            );
        }).then(function(newFundingMilesoneCall) {

            CrowdFunding.deployed().then(function(instance){
                return instance.numFundingMilestones();
            }).then(function(numFundingMilestones) {
                debug("Ico added. Funding Milestones available: "+numFundingMilestones);
                assert.isAtLeast(numFundingMilestones, 1, "No funding milestones available.");
            });

        });
    });


    it("should have a valid bountyType if the property is present", function() {
        return CrowdFunding.deployed().then(function(instance) {
            var test = false;
            if (typeof instance.bountyType === 'function') {
                return instance.bountyType();
            }
            assert.isFalse(test, "Should never get here!");
            return test;
        }).then(function(type) {
            debug("Bounty Type: " + type);
            if(type !== false) {
                assert.isAtLeast(type, 1, "bountyType error");
            }
        });
    });


    printBalances(accounts);



    it("should put 10000 Crowdfunding in the first account", function() {
      return Crowdfunding.deployed().then(function(instance) {
        return instance.getBalance.call(accounts[0]);
      }).then(function(balance) {
        assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
      });
    });
    it("should call a function that depends on a linked library", function() {
      var meta;
      var CrowdfundingBalance;
      var CrowdfundingEthBalance;

      return Crowdfunding.deployed().then(function(instance) {
        meta = instance;
        return meta.getBalance.call(accounts[0]);
      }).then(function(outCoinBalance) {
        CrowdfundingBalance = outCoinBalance.toNumber();
        return meta.getBalanceInEth.call(accounts[0]);
      }).then(function(outCoinBalanceEth) {
        CrowdfundingEthBalance = outCoinBalanceEth.toNumber();
      }).then(function() {
        assert.equal(CrowdfundingEthBalance, 2 * CrowdfundingBalance, "Library function returned unexpected function, linkage may be broken");
      });
    });
    it("should send coin correctly", function() {
      var meta;

      // Get initial balances of first and second account.
      var account_one = accounts[0];
      var account_two = accounts[1];

      var account_one_starting_balance;
      var account_two_starting_balance;
      var account_one_ending_balance;
      var account_two_ending_balance;

      var amount = 10;

      return Crowdfunding.deployed().then(function(instance) {
        meta = instance;
        return meta.getBalance.call(account_one);
      }).then(function(balance) {
        account_one_starting_balance = balance.toNumber();
        return meta.getBalance.call(account_two);
      }).then(function(balance) {
        account_two_starting_balance = balance.toNumber();
        return meta.sendCoin(account_two, amount, {from: account_one});
      }).then(function() {
        return meta.getBalance.call(account_one);
      }).then(function(balance) {
        account_one_ending_balance = balance.toNumber();
        return meta.getBalance.call(account_two);
      }).then(function(balance) {
        account_two_ending_balance = balance.toNumber();

        assert.equal(account_one_ending_balance, account_one_starting_balance - amount, "Amount wasn't correctly taken from the sender");
        assert.equal(account_two_ending_balance, account_two_starting_balance + amount, "Amount wasn't correctly sent to the receiver");
      });
    });

});
 */
/*
contract('SlaveCrowdToken', function(accounts) {

    it("should have a public name property", function() {
        return SlaveCrowdToken.deployed().then(function(instance) {
            var test = false;
            if (typeof instance.name === 'function') {
                test = true;
            }
            assert.isTrue( test, "Name property missing.");
        });
    });

    it("should have a public symbol property", function() {
        return SlaveCrowdToken.deployed().then(function(instance) {
            var test = false;
            if (typeof instance.symbol === 'function') {
                test = true;
            }
            assert.isTrue( test, "Symbol property missing.");
        });
    });

    it("should have a public version property", function() {
        return SlaveCrowdToken.deployed().then(function(instance) {
            var test = false;
            if (typeof instance.version === 'function') {
                test = true;
            }
            assert.isTrue( test, "Version property missing.");
        });
    });

    it("should have a public decimals property", function() {
        return SlaveCrowdToken.deployed().then(function(instance) {
            var test = false;
            if (typeof instance.decimals === 'function') {
                test = true;
            }
            assert.isTrue( test, "Decimals property missing.");
        });
    });

    it("should have decimals property at least 0", function() {
        return SlaveCrowdToken.deployed().then(function(instance) {
            return instance.decimals();
        }).then(function(decimals) {
            debug("Token decimals: "+ decimals );
            assert.isAtLeast(decimals, 0, "Invalid decimals.");
        });
    });

    it("should have decimals property at most 32", function() {
        return SlaveCrowdToken.deployed().then(function(instance) {
            return instance.decimals();
        }).then(function(decimals) {
            // debug("Token decimals: "+ decimals );
            assert.isAtMost(decimals, 32, "Invalid decimals.");
        });
    });

    it("should have a valid name", function() {
        return SlaveCrowdToken.deployed().then(function(instance) {
            return instance.name();
        }).then(function(name) {
            debug("Token name: "+stringFromBytes(name));
            assert.equal(1, 1, "Token name missing.");
        });
    });

    it("should have a valid symbol", function() {
        return SlaveCrowdToken.deployed().then(function(instance) {
            return instance.symbol();
        }).then(function(symbol) {
            debug("Token symbol: "+stringFromBytes(symbol));
            assert.equal(1, 1, "Token symbol missing.");
        });
    });



});

*/

function ListObject(object) {
    var values = [];

    for (var k in object){
        if (object.hasOwnProperty(k)) {
            values.push( k+":"+object[k] );
        }
    }

    return values.join(", ");
}

function inArray(needle, haystack) {
    var length = haystack.length;
    for(var i = 0; i < length; i++) {
        if(haystack[i] == needle) return true;
    }
    return false;
}

function debug(message) {
    if(_debug === true) {
        console.log("    D: "+message+"");
    }
}

function stringFromBytes(bytes) {
    return web3.toAscii(bytes);
}

// Utility function to display the balances of each account.
function printBalances(accounts) {
    console.log("\nBalances:");
    accounts.forEach(function(ac, i) {
        console.log(i, ac, web3.fromWei(web3.eth.getBalance(ac), 'ether').toNumber())
    })
}