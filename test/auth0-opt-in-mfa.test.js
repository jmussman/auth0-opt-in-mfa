// auth0-opt-in-mfa.test.js
// Copyright © 2024 Joel A Mussman. All rights reserved.
//
// This Action code is released under the MIT license and is free to copy and modify as
// long as the source is attributed.
//
// Note: EVERY test is limited to 20000ms (see the config), because Auth0 constrains actions to 20 seconds.
//

import { beforeAll, beforeEach, describe, expect, it, mockReset, vi } from 'vitest'

import { onExecutePostLogin } from '../src/auth0-opt-in-mfa'

const mocks = vi.hoisted(() => {

    return {

        apiMock: {

            authentication: {
                
                challengeWithAny: vi.fn(() => {
                }),

                enrollWithAny: vi.fn(() => {
                })
            }
        }
    }
})
  
describe('Action tests', async () => {

    let consoleLogMock
    let factors = [ 'opt', 'email' ]
    let mfaFactors = factors.map(factor => { return { 'type': factor }})    // This mirrors the factors as objects

    beforeAll(() => {

        consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    })

    beforeEach(() => {

        mocks.apiMock.authentication.challengeWithAny.mockReset()
        mocks.apiMock.authentication.enrollWithAny.mockReset()
        consoleLogMock.mockReset()

        mocks.eventMock = {

            secrets: {

                debug: true,
                mfaTypes: factors.join(',')
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
    })

    it('Ignores everything if user_metadata.mfaOptIn is undefined', async () => {

        delete mocks.eventMock.user.user_metadata.mfaOptIn

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    });

    it('Ignores everything if user_metadata.mfaOptIn is false', async () => {

        mocks.eventMock.user.user_metadata.mfaOptIn = false

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Assigns priority to username attribute', async () => {

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.username))
    })

    it ('Selects email when username is undefined', async () => {

        delete mocks.eventMock.user.username

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it ('Selects email when username is empty', () => {

        mocks.eventMock.user.username = ''

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it ('Selects email when username is blank', () => {

        mocks.eventMock.user.username = '     '

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        // Check the console log that we showed the correct value.

        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining(mocks.eventMock.user.email))
    })

    it ('Invokes challengeWithAny with the enabled factors', () => {

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).toHaveBeenCalledWith(mfaFactors)
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it('Enrolls MFA when multifactor is undefined', async () => {

        delete mocks.eventMock.user.multifactor

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalled()
    })

    it('Enrolls MFA when multifactor is null', async () => {

        mocks.eventMock.user.multifactor = null

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalled()
    })

    it('Enrolls MFA when multifactor is empty', async () => {

        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalled()
    })

    it ('Invokes enrollWithAny with the list of proviers from event.secrets', async () => {

        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(mfaFactors)
    })

    it ('Splits providers from the secret value with spaces before commas', async () => {

        mocks.eventMock.secrets.mfaTypes = factors.join(' ,')
        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(mfaFactors)
    })

    it ('Splits providers from the secret value with spaces after commas', async () => {

        mocks.eventMock.secrets.mfaTypes = factors.join(', ')
        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(mfaFactors)
    })

    it ('Splits providers from the secret value with spaces before and after commas', async () => {
        
        mocks.eventMock.secrets.mfaTypes = factors.join(' , ')
        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(mfaFactors)
    })

    if ('Ignores invalid provider specifications', async () => {
        
        mocks.eventMock.secrets.mfaTypes = factors.concat([ 'badprovider' ]).join(',')
        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(mfaFactors)      
    })

    if ('Recognizes all providers without options', async () => {
        
        const expectedFactors = factors.concat([ 'recovery-code', 'webauthn-platform', 'webauthn-roaming' ]);
        const expectedMfaFactors = factors.map(factor => { return { 'type': factor }})

        mocks.eventMock.secrets.mfaTypes = expectedFactors.join(',')
        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(expectedMfaFactors)      
    })

    it ('Accepts push-notification with option true', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'push-notification/optFallback=true';

        const expectedMfaFactors = [ { 'type': 'push-notification', options: { optFallback: 'true' }} ]

        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(expectedMfaFactors)      
    })

    it ('Accepts push-notification with option false', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'push-notification/optFallback=false';

        const expectedMfaFactors = [ { 'type': 'push-notification', options: { optFallback: 'false' }} ]

        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(expectedMfaFactors)
    })

    it ('Discards push-notification with bad option name', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'push-notification/opt=false';
        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalledWith()
    })

    it ('Discards push-notification with bad option value', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'push-notification/optFallback=unknown';
        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalledWith()
    })

    it ('Accepts phone with option voice', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'phone/preferredMethod=voice';

        const expectedMfaFactors = [ { 'type': 'phone', options: { preferredMethod: 'voice' }} ]

        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(expectedMfaFactors)      
    })

    it ('Accepts phone with option sms', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'phone/preferredMethod=sms';

        const expectedMfaFactors = [ { 'type': 'phone', options: { preferredMethod: 'sms' }} ]

        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(expectedMfaFactors)      
    })

    it ('Accepts phone with option both', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'phone/preferredMethod=both';

        const expectedMfaFactors = [ { 'type': 'phone', options: { preferredMethod: 'both' }} ]

        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).toHaveBeenCalledWith(expectedMfaFactors)      
    })

    it ('Discards phone with bad option name', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'phone/preferredMethod=voice';
        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalledWith()
    })

    it ('Discards phone with bad option value', async () => {
        
        mocks.eventMock.secrets.mfaTypes = 'phone/preferredMethod=unknown';
        mocks.eventMock.user.multifactor = []
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalledWith()
    })

    it ('Ignores opt-in MFA if there are authenticators in the secret data is undefined', async () => {

        delete mocks.eventMock.secrets.mfaTypes

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it ('Ignores opt-in MFA if there are authenticators in the secret data is null', async () => {

        mocks.eventMock.secrets.mfaTypes = null

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it ('Ignores opt-in MFA if there are authenticators in the secret data is empty', async () => {

        mocks.eventMock.secrets.mfaTypes = ''

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it ('Ignores opt-in MFA if there are authenticators in the secret data is blank', async () => {

        mocks.eventMock.secrets.mfaTypes = '     '

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(mocks.apiMock.authentication.challengeWithAny).not.toHaveBeenCalled()
        expect(mocks.apiMock.authentication.enrollWithAny).not.toHaveBeenCalled()
    })

    it ('Challenge emits debugging messages to the console if event.secrets.debug is true', () => {

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).toHaveBeenCalled()
    })

    it ('Challenge does not emit debugging messages to the console if event.secrets.debug is undefined', () => {
        
        delete mocks.eventMock.secrets.debug

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Challenge does not emit debugging messages to the console if event.secrets.debug is null', () => {
        
        mocks.eventMock.secrets.debug = null

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Challenge does not emit debugging messages to the console if event.secrets.debug is false', () => {

        mocks.eventMock.secrets.debug = false
        
        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Challenge does not emit debugging messages to the console if event.secrets.debug is 0', () => {
        
        mocks.eventMock.secrets.debug = 0

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Enroll emits debugging messages to the console if event.secrets.debug is true', () => {

        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).toHaveBeenCalled()
    })

    it ('Enroll does not emit debugging messages to the console if event.secrets.debug is undefined', () => {
        
        delete mocks.eventMock.secrets.debug
        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Enroll does not emit debugging messages to the console if event.secrets.debug is null', () => {
        
        mocks.eventMock.secrets.debug = null
        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Enroll does not emit debugging messages to the console if event.secrets.debug is false', () => {

        mocks.eventMock.secrets.debug = false
        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })

    it ('Enroll does not emit debugging messages to the console if event.secrets.debug is 0', () => {
        
        mocks.eventMock.secrets.debug = 0
        mocks.eventMock.user.multifactor = []

        onExecutePostLogin(mocks.eventMock, mocks.apiMock)

        expect(consoleLogMock).not.toHaveBeenCalled()
    })
})