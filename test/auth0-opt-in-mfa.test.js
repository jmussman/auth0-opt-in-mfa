// auth0-opt-in-mfa.test.js
// Copyright © 2024 Joel A Mussman. All rights reserved.
//
// This Action code is released under the MIT license and is free to copy and modify as
// long as the source is attributed.
//
// Note: EVERY test is limited to 20000ms (see the config), because Auth0 constrains actions to 20 seconds.
//
// By definition actions cannot fail; if an action does fail it does not interrupt the flow. So there is
// little point in failling an action because of a misconfiguration; the best option is to muddle through
// with the bad data and let an administrator investigate why the action didn't do what it should.
//
// For example, in this action which MFA factors the user may choose from is determined by which factors
// are in the mfaTypes secret. If the secret has bad data, the expected factor will not appear. That
// should trigger an admin to look at the problem, and is a better trigger than no providers appear.
//

import { beforeAll, beforeEach, describe, expect, it, mockReset, vi } from 'vitest'

import { onExecutePostLogin } from '../src/auth0-opt-in-mfa'

const mocks = vi.hoisted(() => {

    return {

        apiMock: {

            authentication: {
                
                challengeWithAny: vi.fn(() => {}),
                enrollWithAny: vi.fn(() => {})
            }
        },

        eventMock: {

            secrets: {

                debug: true,
                mfaTypes: 'opt, recovery-code, email, webauthn-platform, webauthn-roaming, push-notification/optFallback=true, phone/preferredMethod=sms'
            },

            user: {

                email: 'jack.rackham@pyrates.live',
                multifactor: [ 'guardian' ],
                user_id: 'auth0|5f7c8ec7c33c6c004bbafe82',
                user_metadata: {
                    mfaOptIn: true
                },
                username: 'jackrackham'
            }
        }
    }
})

function buildFactorListFromString(factorStringList) {

    let mfaFactors = factorStringList.split(',').map(factorName => factorName.trim()).filter(factorName => factorName).map(factorName => { return { 'type': factorName }})

    mfaFactors.forEach(factor => {
 
        const index = factor.type.indexOf('/')

        if (index >= 0) {

            const [ optionName, optionValue ] = factor.type.substr(index + 1).split('=')
 
            factor.type = factor.type.substr(0, index)
            factor.option = { }      
            factor.option[optionName] = optionValue    
        }
    })

    return mfaFactors
}

describe('Action tests', async () => {

    let consoleLogMock

    beforeAll(() => {

        consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    })

    beforeEach(() => {

        mocks.eventMock.secrets.debug = true
        mocks.eventMock.secrets.mfaTypes = 'opt, recovery-code, email, webauthn-platform, webauthn-roaming, push-notification/optFallback=true, phone/preferredMethod=sms'
        mocks.eventMock.user.multifactor = [ 'guardian' ]
        mocks.eventMock.user.username = null
        mocks.eventMock.user.email = 'calicojack@pyrates.live'
        mocks.eventMock.user.user_id = 'auth0|5f7c8ec7c33c6c004bbafe82'
        mocks.eventMock.user.user_metadata.mfaOptIn = true

        mocks.apiMock.authentication.challengeWithAny.mockReset()
        mocks.apiMock.authentication.enrollWithAny.mockReset()
        consoleLogMock.mockReset()
    })

    it('Emits debugging messages to the console if event.secrets.debug is true', async () => {

        mocks.eventMock.secrets.debug = true

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).toHaveBeenCalled()
    })

    it('Does not emit debugging messages to the console if event.secrets.debug is undefined', async () => {
       
        delete mocks.eventMock.secrets.debug

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it('Does not emit debugging messages to the console if event.secrets.debug is null', async () => {
        
        mocks.eventMock.secrets.debug = null

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it('Does not emit debugging messages to the console if event.secrets.debug is false', async () => {
        
        mocks.eventMock.secrets.debug = false

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it('Does not emit debugging messages to the console if event.secrets.debug is 0', async () => {
        
        mocks.eventMock.secrets.debug = 0

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it('Ignores everything if user_metadata.mfaOptIn is undefined', async () => {

        delete mocks.eventMock.user.user_metadata.mfaOptIn

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    });

    it('Ignores everything if user_metadata.mfaOptIn is false', async () => {

        mocks.eventMock.user.user_metadata.mfaOptIn = false

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Assigns priority to username attribute', async () => {

        mocks.eventMock.user.username = 'jackrackham'
        mocks.eventMock.user.email = 'calicojack@pyrates.live'

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.username))
    })

    it('Selects email when username is undefined', async () => {

        delete mocks.eventMock.user.username

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it('Selects email when username is null', async () => {

        mocks.eventMock.user.username = null

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it('Selects email when username is empty', async () => {

        mocks.eventMock.user.username = ''

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it('Selects email when username is blank', async () => {

        mocks.eventMock.user.username = '     '

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it('Ignores opt-in MFA if the mfaTypes is undefined', async () => {

        delete mocks.eventMock.secrets.mfaTypes

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Ignores opt-in MFA if the mfaTypes is null', async () => {

        mocks.eventMock.secrets.mfaTypes = null

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Ignores opt-in MFA if the mfaTypes is empty', async () => {

        mocks.eventMock.secrets.mfaTypes = ''

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Ignores opt-in MFA if the mfaTypes is blank', async () => {

        mocks.eventMock.secrets.mfaTypes = '     '

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA with the enabled factors when multifactor is set', async () => {

        mocks.eventMock.secrets.mfaTypes = 'opt, recovery-code, email, webauthn-platform, webauthn-roaming, push-notification/optFallback=true, phone/preferredMethod=sms'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and does not include factors that are not requested in event.secrets.mfaTypes', async () => {

        mocks.eventMock.secrets.mfaTypes = 'webauthn-platform, webauthn-roaming'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and does not include factors that are not understood by Auth0', async () => {

        mocks.eventMock.secrets.mfaTypes = 'webauthn-platform, webauthn-roaming, facial-recognition'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        expectedMfaTypes.splice(2, 1) // Remove facial-recognition from the expected results.
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA with a single requested factor', async () => {

        mocks.eventMock.secrets.mfaTypes = 'webauthn-platform'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Does not challenge MFA when no valid factors are requested'), async () => {

        mocks.eventMock.secrets.mfaTypes = 'facial-recognition'

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    }

    it('Challenges MFA and accepts providers with no spaces in the list', async () => {

        mocks.eventMock.secrets.mfaTypes = 'webauthn-platform,webauthn-roaming,opt'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and accepts providers with spaces before commas', async () => {

        mocks.eventMock.secrets.mfaTypes = 'webauthn-platform ,webauthn-roaming ,opt'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and accepts providers with spaces after commas', async () => {

        mocks.eventMock.secrets.mfaTypes = 'webauthn-platform, webauthn-roaming, opt'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and accepts providers with spaces before and after commas', async () => {

        mocks.eventMock.secrets.mfaTypes = 'webauthn-platform , webauthn-roaming , opt'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and passes all providers without options', async () => {

        mocks.eventMock.secrets.mfaTypes = 'opt, recovery-code, email, webauthn-platform, webauthn-roaming'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA with push-notification with option optFallback=true', async () => {

        mocks.eventMock.secrets.mfaTypes = 'push-notification/optFallback=true'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA with push-notification with option optFallback=false', async () => {

        mocks.eventMock.secrets.mfaTypes = 'push-notification/optFallback=false'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA but discards push-notification with bad option name', async () => {

        mocks.eventMock.secrets.mfaTypes = 'email, push-notification/fallback=true'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)
        
        expectedMfaTypes.splice(1, 1) // Remove the bad entry from the expected results.
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA but discards push-notification with bad option value', async () => {

        mocks.eventMock.secrets.mfaTypes = 'email, push-notification/optFallback=xyze'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)
        
        expectedMfaTypes.splice(1, 1) // Remove the bad entry from the expected results.
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and accepts phone with option voice', async () => {

        mocks.eventMock.secrets.mfaTypes = 'phone/preferredMethod=voice'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and accepts phone with option sms', async () => {

        mocks.eventMock.secrets.mfaTypes = 'phone/preferredMethod=sms'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and ccepts phone with option both', async () => {

        mocks.eventMock.secrets.mfaTypes = 'phone/preferredMethod=both'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)
        
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and discards phone with bad option name', async () => {

        mocks.eventMock.secrets.mfaTypes = 'email, phone/method=voice'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        expectedMfaTypes.splice(1, 1) // Remove the bad entry from the expected results.
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Challenges MFA and discards phone with bad option value', async () => {

        mocks.eventMock.secrets.mfaTypes = 'email, phone/preferredMethod=telepathy'

        const expectedMfaTypes = buildFactorListFromString(mocks.eventMock.secrets.mfaTypes)

        expectedMfaTypes.splice(1, 1) // Remove the bad entry from the expected results.
        await onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(expectedMfaTypes)      
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Logs API exception for MFA challenge', async () => {

        // Redefine the API deny call to throw an exception.

        const message = 'This message should be logged'

        mocks.apiMock.authentication.challengeWithAny = vi.fn(() => { throw message })
 
        expect(async () => await onExecutePostLogin(mocks.eventMock, mocks.apiMock)).rejects.toThrow(expect.stringContaining(message))
    })
   
    // Gray-box tests... we know that the evaluation of the providers is done before the selection of challenge or enroll,
    // so we already tested that above.

    it('Invoke MFA enrollment when multifactor is undefined', async () => {

        mocks.eventMock.user.username = null
        mocks.eventMock.user.email = 'calicojack@pyrates.live'
        mocks.eventMock.user.user_id = 'auth0|5f7c8ec7c33c6c004bbafe82'

        delete mocks.eventMock.user.multifactor

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalled()
    })

    it('Invoke MFA enrollment when multifactor is null', async () => {

        mocks.eventMock.user.multifactor = null
        mocks.eventMock.user.username = null
        mocks.eventMock.user.email = 'calicojack@pyrates.live'
        mocks.eventMock.user.user_id = 'auth0|5f7c8ec7c33c6c004bbafe82'

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalled()
    })

    it('Invoke MFA enrollment when multifactor is empty', async () => {

        mocks.eventMock.user.multifactor = []
        mocks.eventMock.user.username = null
        mocks.eventMock.user.email = 'calicojack@pyrates.live'
        mocks.eventMock.user.user_id = 'auth0|5f7c8ec7c33c6c004bbafe82'

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalled()
    })

    it('Logs API exception for MFA enrollment', async () => {

        // Redefine the API deny call to throw an exception.

        const message = 'This message should be logged'

        delete mocks.eventMock.user.multifactor

        mocks.apiMock.authentication.enrollWithAny = vi.fn(() => { throw message })
 
        expect(async () => await onExecutePostLogin(mocks.eventMock, mocks.apiMock)).rejects.toThrow(expect.stringContaining(message))

    })
})