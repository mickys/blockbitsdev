function assertError(error, s, message) {
    /*
    console.log(error)
    console.log(s)
    console.log(message)
    */
    assert.isAbove(error.message.search(s), -1, message);
}

async function assertThrows(block, message, errorCode) {
    try {
        await block()
    } catch (e) {
        return assertError(e, errorCode, message)
    }

    console.log();
    console.log("Assert failed: ");
    console.log("block:", block);
    console.log("message:", message);

    assert.fail('should have thrown before')
}

module.exports = {
    async assertJump(block, message = 'should have failed with invalid JUMP') {
        return assertThrows(block, message, 'invalid JUMP')
    },

    async assertInvalidOpcode(block, message = 'should have failed with invalid opcode') {
        return assertThrows(block, message, 'invalid opcode')
    }
}
