/**
 * auth0-opt-in-mfa
 * Copyright © 2024 Joel A Mussman. All rights reserved.
 * 
 * This Action code is released under the MIT license and is free to copy and modify as
 * long as the source is attributed.
 * 
 * If the user has the mfaOptIn attribute set to true in the user metadata, this
 * action will check for existing enrollment, and if not present trigger the opt-in
 * enrollment of mfa before the user moves on. If the mfaOptIn attribute is set
 * to trun and MFA enrollment was previously accomplished, this action will
 * trigger MFA.
 *
 * Add a secret value 'debug' of true to enable console logging, remove it to disable
 * console logging. Remember to force a deployment of the action if you change the
 * secret.
 * 
 * Add the 'auth0' Node.js dependency at the latest version (4.4.0 at this time).
 */
exports.onExecutePostLogin = async (event, api) => {

    const DEBUG = event.secrets.debug;

    if (event.user.user_metadata.mfaOptIn) {

        DEBUG ? console.log(`User ${event.user.user_id} has MFA opt-in enabled`) : null;

        // Split the MFA types allowed.

        let mfaTypes = event.secrets.mfaTypes?.split(',').map(mfaType => { mfaType.trim(); return { type: mfaType }});
        let username = event.user.username ?? event.user.email;

        if (event.user.multifactor?.length != 0) {

            DEBUG ? console.log(`Challenge user ${event.user.user_id} (${username}) authentication with ${JSON.stringify(mfaTypes)}`) : null;

            await api.authentication.challengeWithAny(mfaTypes);

        } else {
        
            DEBUG ? console.log(`Enroll ${event.user.user_id} (${username}) with ${JSON.stringify(mfaTypes)}`) : null;
            
            await api.authentication.enrollWithAny(mfaTypes);
        
        }

        DEBUG ? console.log(`Completed show passkey enrollment option for ${event.user.user_id} (${username})`) : null;
    }
};