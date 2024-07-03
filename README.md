![Banner Light](./.assets/banner-auth0-opt-in-mfa-light.png#gh-light-mode-only)
![banner Dark](./.assets/banner-auth0-opt-in-mfa-dark.png#gh-dark-mode-only)

# Auth0-Opt-In-MFA

## Overview

Customer identity cloud scenarios may benefit from passwordless and multi-factor authentication, but in CIC
the user needs to opt-in for this instead of having it forced upon them.
This action is designed to look for the opt-in and check to see if the user is not enrolled with MFA,
and if not trigger enrollment during the login process.

This is one of a series of action examples that may be used as a foundation for building
what you need.
Search GitHub for *jmussman/auth0* to find other examples in the series.

## Implementation

The implementation looks at the user profile for a 'mfaOptIn' attribute set to true in the user
metadata.
If the opt-in attribute is set, it checks the multifactor list for the user via the event object.
If no MFA is set, it triggers passkey enrollment before the login flow proceeds.

Changing the opt-in attribute to false or removing it causes the action to skip the check for passkeys and
triggering enrollment.
The customer portal can clear the MFA registration if the user opts-out.
If the registration is not cleared and the user re-opts-in, then the original MFA continues to work.
This may be the desired behavior.

## Configuration

This assumes basic knowledge of working with actions and adding actions to flows in Auth0.
This is an overview of the configuration that must be established.

### Steps

1. Create a new post-login action using the code in the *auth0-opt-in-mfa.js* file.
1. Add a secret *mfaTypes* with a list of desired providers: otp, recovery-key, etc.
The providers selected must be enabled in Security -> Mult-factor Auth.
The definition of the providers is in the API object schema at https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow/api-object.
Note that some of the providers have options; in mfaTypes follow this format with a slash and assignment: 'phone/preferredMethod=sms'.
Also, the toggle Customize MFA Factors during Actions must be enabled.
There are limits as to which factor enrollments or challenges may be triggered during an action, check the documentation for current restrictions.
1. Add a secret *debug* with a true value console messages during testing, clear it for production.
A re-deployment is neccessary after changing a secret.
1. Save and deploy the contents of the action file ./src/auth0-opt-in-mfa.js as a custom action in the Auth0 tenant.
1. Add the action to the post-login flow.

## Unit Tests

Auth0 flow actions provide a rduimentary mechanism for testing.
The custom database actions do not provide a testing feature.
All actions can be monitored for console output using the *Realtime WebTask Logs Extension* in the Auth0 tenant.
When launched by clicking the extension, consent must be provided for it to access the console.
All messages written to console.log will be visible here; a strong recommendation is to only use this in the development sandbox or there will be too many
messages to wade through.

The flow actions testing mechanism allows a mock event to be edited and then the action tested.
Unfortunately, the only way to managem multiple tests with any success is to manage different event configurations outside of the console,
and then paste them in turn to perform tests.

Because of the weak testing features, any significant action must have all possible paths checked.
That is what unit tests are designed to do.
There is no reason that the event and api objects cannot be mocked, and actions tested, outside of Auth0.
This project has a full suite of unit tests for the action, written in *Vitest*.
Vitest performs much better than Jest at asynchromous testing, which is often the case with an action.

At the command line in the project folder:

* Execute *npm install* to add the Vitest packages.
* Run *npm test* to run all the unit tests
* Run *npm run test-coverage* to run the test suite with code-coverage (currently at 100%).

## License

The code is licensed under the MIT license. You may use and modify all or part of it as you choose, as long as attribution to the source is provided per the license. See the details in the [license file](./LICENSE.md) or at the [Open Source Initiative](https://opensource.org/licenses/MIT).


<hr>
Copyright © 2024 Joel A Mussman. All rights reserved.