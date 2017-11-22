module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    contract('ListingContract Asset', accounts => {
        let assetContract, tx, TestBuildHelper = {};
        let assetName = "ListingContract";
        let platformWalletAddress = accounts[19];

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept(assetName);
            assetContract = await TestBuildHelper.getDeployedByName(assetName);
        });

        context("addItem()", async () => {

            it('throws if addItem caller is not applicationEntity', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addItem("TestName", await assetContract.address.toString());
                });

            });

            it('works if caller is applicationEntity', async () => {
                let testName = "TestName";
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");
                let deployer = await application.deployerAddress.call();
                assert.equal(deployer, accounts[0], "Deployer address mismatch!");
                await application.callTestListingContractAddItem(testName, await assetContract.address.toString());

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch");

                let item = await assetContract.items.call(1);
                let itemName = helpers.web3util.toUtf8(item[0]);
                assert.equal(itemName, testName, "Item name mismatch!");
            });
        });

        context("getNewsContractAddress()", async () => {


            it('throws if the child does not actually exist', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.getNewsContractAddress.call(99);
                });
            });

            it('throws if the child itemAddress is invalid', async () => {

                let testName = "TestName";
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");

                let EmptyStubContract = await helpers.getContract("EmptyStub");
                let EmptyStub = await EmptyStubContract.new();

                await application.callTestListingContractAddItem(testName, "0x0");

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch");

                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.getNewsContractAddress.call(1);
                });
            });


            it('returns a news contract address if the child is an actual ApplicationEntity', async () => {
                let testName = "TestName";
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");

                let TestBuildHelperSecond = new helpers.TestBuildHelper(setup, assert, accounts);
                let ChildNewsContract = await TestBuildHelperSecond.deployAndInitializeAsset("NewsContract");
                let childApplication = await TestBuildHelperSecond.getDeployedByName("ApplicationEntity");

                await application.callTestListingContractAddItem(testName, await childApplication.address.toString());

                let linkedChildAddress = await assetContract.getNewsContractAddress.call(1);
                let ChildNewsContractAddress = await ChildNewsContract.address.toString();

                assert.equal(linkedChildAddress, ChildNewsContractAddress, "Address mismatch!");
            });

        });


        context("delistChild()", async () => {

            beforeEach(async () => {

                let testName = "TestName";
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");

                let TestBuildHelperSecond = new helpers.TestBuildHelper(setup, assert, accounts);
                let ChildNewsContract = await TestBuildHelperSecond.deployAndInitializeAsset("NewsContract");
                let childApplication = await TestBuildHelperSecond.getDeployedByName("ApplicationEntity");

                await application.callTestListingContractAddItem(testName, await childApplication.address.toString());
            });

            it('throws if called by any address other than Proposals Asset', async () => {

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch");

                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.delistChild(1);
                });
            });

            it('works if called by proposals asset, resulting in a child with status == false', async () => {

                let ProposalsAsset = TestBuildHelper.getDeployedByName("Proposals");

                let itemStatus = await assetContract.getItemStatus.call(1);
                assert.isTrue(itemStatus, "Status should be true!");

                await ProposalsAsset.callTestListingContractDelistChild(1);

                itemStatus = await assetContract.getItemStatus.call(1);
                assert.isFalse(itemStatus, "Status should be false!");
            });

        });

    });
};