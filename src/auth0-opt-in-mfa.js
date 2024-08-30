// auth0-opt-in-mfa
// Copyright © 2024 Joel A Mussman. All rights reserved.
// 
// This Action code is released under the MIT license and is free to copy and modify as
// long as the source is attributed.
// 
// If the user has the mfaOptIn attribute set to true in the user metadata, this
// action will check for existing enrollment, and if not present trigger the opt-in
// enrollment of mfa before the user moves on. If the mfaOptIn attribute is set
// to trun and MFA enrollment was previously accomplished, this action will
// trigger MFA.
// 
// A secret value for the supported MFA providers needs to be created; since this is
// a string and not objects, the dataformat is provider or provider/option=value. The
// details of a 'factor' object are documented at:
// https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow/api-object.
// Invalid providers are ignored. If there are no providers, opt-in MFA is ignored.
//
// Add a secret value 'debug' of true to enable console logging, remove it to disable
// console logging. Remember to force a deployment of the action if you change the
// secret.
// 
// Add the 'auth0' Node.js dependency at the latest version (4.4.0 at this time).
//
exports.onExecutePostLogin = async (event, api) => {

    const DEBUG = event.secrets.debug;

    if (event.user.user_metadata.mfaOptIn) {

        // Fall back to the email if username is not set.

        let username = event.user.username?.trim().length ? event.user.username.trim() : event.user.email.trim();

        DEBUG ? console.log(`User ${event.user.user_id} (${username}) has MFA opt-in enabled`) : null;

        // Split the MFA types allowed. Without MFA types, challenge or enrollment is moot.

        let mfaTypes = event.secrets.mfaTypes?.split(',').map(mfaType => mfaType.trim());

        if (mfaTypes?.length) {

            const factorTypeFromFactor = (factor, options) => {

                const factorType = { type: factor.trim() };

                if (options) {
        
                    const [ optionName, optionValue ] = options.split('=').map(option => option.trim());
        
                    factorType.option = { };
                    factorType.option[optionName] = optionValue;
                }

                return factorType
            }

            // Verify each provider in the list, replace an invalid provider with null. Some providers have sub-data provided here in
            // the form provider/sub-data. The providers, data and sub-data, must be set up as an array of objects. Details of valid 
            // options are at https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow/api-object.

            mfaTypes = mfaTypes.map(mfaType => {
                
                let result = null
                const [ provider, option ] = mfaType.split('/');

                switch (provider) {
                    case 'opt':
                    case 'recovery-code':
                    case 'email':
                    case 'webauthn-platform':
                    case 'webauthn-roaming':
                        result = factorTypeFromFactor(provider);
                        break;

                    case 'push-notification':
                        result = factorTypeFromFactor(provider, option);

                        if (result.option.optFallback !== 'true' && result.option.optFallback !== 'false' ) {

                            result = null;
                        }
                        break;

                    case 'phone':
                        result = factorTypeFromFactor(provider, option);

                        if (result.option.preferredMethod !== 'sms' && result.option.preferredMethod !== 'voice' && result.option.preferredMethod !== 'both') {

                            result = null;
                        }
                        break;
    
                    default:
                        break;
                }
                
                return result;
            })

            // Drop the null entries (invalid provider data). If there are no providers, MFA is ignored.

            mfaTypes = mfaTypes.filter(mfaType => mfaType)

            if (mfaTypes.length) {

                try {

                    if (event.user.multifactor?.length && event.user.multifactor[0] == 'guardian') {

                        // Contratry to the api object documentation:
                        // https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow/api-object,
                        // if the user is enrolled "multifactor" is always a single array element with the
                        // value "guardian", not a list of the providers. See
                        // https://community.auth0.com/t/event-user-multifactor-property-not-showing-each-factor/115069.
                        // The list of factors can be pulled via the management API as the guardian profile property.
                        //
                        // We simply invoke MFA challenge with all of the providers listed in mfaTypes, regardless of what
                        // the user has enrolled in. If a provider is listed but the user is not enrolled, it will not
                        // be offered during a challenge (api object documentation).

                        DEBUG ? console.log(`Challenge user ${event.user.user_id} (${username}) authentication with ${JSON.stringify(mfaTypes)}`) : null;

                        await api.authentication.challengeWithAny(mfaTypes);

                    } else {
                    
                        DEBUG ? console.log(`Enroll ${event.user.user_id} (${username}) with ${JSON.stringify(mfaTypes)}`) : null;
                        
                        await api.authentication.enrollWithAny(mfaTypes);
                    }
                }

                catch (e) {

                    DEBUG ? console.log(e) : null;

                    throw e;
                }
            }
        }
    }
};