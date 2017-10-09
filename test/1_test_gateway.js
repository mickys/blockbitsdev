const { assertInvalidOpcode } = require('./helpers/assertThrow');
const GatewayInterface = artifacts.require('GatewayInterface');
const LinkDatabase = artifacts.require('LinkDatabase');
const ApplicationEntity = artifacts.require('ApplicationEntity');

contract('Link Database', accounts => {
    let gateway, app, linkdb = {};

    beforeEach(async () => {
        // linkdb = await LinkDatabase.new();
        gateway = await GatewayInterface.new();
        app = await ApplicationEntity.new();
    });

    it('gateway: current app address should be empty', async () => {
        assert.equal(await gateway.getApplicationEntityAddress(), 0x0, 'app should have returned correct parent address')
    });

    it('app: parent address should be empty', async () => {
        assert.equal(await app.ParentAddress(), 0x0, 'app should have returned correct parent address')
    });

    /*
    it('throws when called by unauthorized entity', async () => {
        return assertInvalidOpcode(async () => {
            await linkdb.add(10, { from: accounts[1] })
        })
    })
    */

    // linkdb.add( address _new, bytes32 _url)
    /*
    context('link database deployed', async 0xc4fc67e7ad06d848d89e6c6628e53c0b9871709c() => {
        beforeEach(async () => {
            await linkdb.setAppCode(appId, appCode1.address)
        })

        it('app has correct parent address (gateway)', async () => {
            // app2 returns the double of the value in storage
            let parent = await app.ParentAddress();
            console.log("Parent Address: "+parent);

            assert.equal(parent, gateway.address, 'app should have returned correct parent address')
        })

    })
    */

    /*

    it('app has correct parent address (gateway)', async () => {
        // app2 returns the double of the value in storage
        let parent = await app.ParentAddress();
        console.log("Parent Address: "+parent);

        assert.equal(parent, gateway.address, 'app should have returned correct parent address')
    })

    */



    /*

    context('setting app code in kernel', async () => {

        beforeEach(async () => {
            await kernel.setAppCode(appId, appCode1.address)
        })

        it('app call works if sent from authed entity', async () => {
            await app.setValue(10)
            assert.equal(await app.getValue(), 10, 'should have returned correct value')
        })

        it('throws when called by unauthorized entity', async () => {
            return assertInvalidOpcode(async () => {
                await app.setValue(10, { from: accounts[1] })
            })
        })

        it('can update app code and storage is preserved', async () => {
            await app.setValue(10)
            await kernel.setAppCode(appId, appCode2.address)
            // app2 returns the double of the value in storage
            assert.equal(await app.getValue(), 20, 'app 2 should have returned correct value')
        })

        it('can update app code and removed functions throw', async () => {
            await app.setValue(10)
            await kernel.setAppCode(appId, appCode2.address)
            return assertInvalidOpcode(async () => {
                await app.setValue(10)
            })
        })
    })

    */

});
/*
const Kernel = artifacts.require('Kernel')
const AppProxy = artifacts.require('AppProxy')
const AppStub = artifacts.require('AppStub')
const AppStub2 = artifacts.require('AppStub2')


contract('Kernel apps', accounts => {
    let kernel, app, appCode1, appCode2 = {}
    const appId = hash('stub.aragonpm.test')

    beforeEach(async () => {
        kernel = await Kernel.new()
        await kernel.initialize(accounts[0])
        const r = await kernel.APP_UPGRADER_ROLE()
        await kernel.createPermission(accounts[0], kernel.address, r, accounts[0])

        appCode1 = await AppStub.new()
        appCode2 = await AppStub2.new()

        const appProxy = await AppProxy.new(kernel.address, appId)
        const r2 = await appCode1.ROLE()
        await kernel.createPermission(accounts[0], appProxy.address, r2, accounts[0])
        app = AppStub.at(appProxy.address)
    })

    it('throws if using app without reference in kernel', async () => {
        return assertInvalidOpcode(async () => {
            await app.setValue(10)
        })
    })

    context('setting app code in kernel', async () => {
        beforeEach(async () => {
            await kernel.setAppCode(appId, appCode1.address)
        })

        it('app call works if sent from authed entity', async () => {
            await app.setValue(10)
            assert.equal(await app.getValue(), 10, 'should have returned correct value')
        })

        it('throws when called by unauthorized entity', async () => {
            return assertInvalidOpcode(async () => {
                await app.setValue(10, { from: accounts[1] })
            })
        })

        it('can update app code and storage is preserved', async () => {
            await app.setValue(10)
            await kernel.setAppCode(appId, appCode2.address)
            // app2 returns the double of the value in storage
            assert.equal(await app.getValue(), 20, 'app 2 should have returned correct value')
        })

        it('can update app code and removed functions throw', async () => {
            await app.setValue(10)
            await kernel.setAppCode(appId, appCode2.address)
            return assertInvalidOpcode(async () => {
                await app.setValue(10)
            })
        })
    })
})
*/