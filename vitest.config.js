// vitest.config.js
// Copyright © 2024 Joel A Mussman. All rights reserved.
//

import { defineConfig } from 'vitest/config';

const config = defineConfig({
    test: {
        coverage: {
            provider: 'v8'
        },
        pool: 'forks',
        testTimeout: 20000          // Auth0 constrains actions to 20 seconds, so fail any test that takes longer.
    }
})

export default config