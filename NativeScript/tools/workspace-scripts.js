module.exports = {
  message: 'NativeScript ~ made with โค๏ธ  Choose a command to start...',
  pageSize: 32,
	scripts: {
		default: 'nps-i',
		nx: {
      script: 'nx',
      description: 'Execute any command with the @nrwl/cli'
    },
		format: {
      script: 'nx format:write',
      description: 'Format source code of the entire workspace (auto-run on precommit hook)'
    },
    "๐ง": {
      script: `npx cowsay "NativeScript apps are key to a user's โค๏ธ"`,
      description: '_____________  Apps to develop and experiment with  _____________'
    },
		// app testing targets
		apps: {
      "...Automated...": {
        script: `npx cowsay "These run fast, watch the fireworks! ๐"`,
        description: ` ๐ป Automated test runner which executes e2e tests on the target platform ๐`
      },
			// Automated test runner which executes e2e tests on the target platform
			automated: {
				clean: {
          script: 'nx run apps-automated:clean',
          description: 'โ  Clean  ๐งน'
        },
				ios: {
          script: 'nx run apps-automated:ios',
          description: 'โ  Run iOS  ๏ฃฟ'
        },
				android: {
          script: 'nx run apps-automated:android',
          description: 'โ  Run Android  ๐ค'
        },
      },
      "...ToolBox...": {
        script: `npx cowsay "๐ฏ The best development target to experiment with ideas and debug core"`,
        description: ` ๐ป Toolbox for livesyncing changes and experimenting ๐ฏ`
      },
			// Toolbox useful for livesyncing changes and experimenting
			toolbox: {
				clean: {
          script: 'nx run apps-toolbox:clean',
          description: 'โ  Clean  ๐งน'
        },
				ios: {
          script: 'nx run apps-toolbox:ios',
          description: 'โ  Run iOS  ๏ฃฟ'
        },
				android: {
          script: 'nx run apps-toolbox:android',
          description: 'โ  Run Android  ๐ค'
        },
      },
      "...UI...": {
        script: `npx cowsay "Tons of ui samples to prove out core behavior and validate github issue fixes โ๏ธ"`,
        description: ` ๐ป Tons of ui samples to prove out core behavior and validate github issue fixes โ๏ธ`
      },
			// Various UI level setups for @nativescript/core testing
			ui: {
				clean: {
          script: 'nx run apps-ui:clean',
          description: 'โ  Clean  ๐งน'
        },
				ios: {
          script: 'nx run apps-ui:ios',
          description: 'โ  Run iOS  ๏ฃฟ'
        },
				android: {
          script: 'nx run apps-ui:android',
          description: 'โ  Run Android  ๐ค'
        },
			},
    },
    "โ๏ธ": {
      script: `npx cowsay "@nativescript/* packages will keep your โ๏ธ cranking"`,
      description: '_____________  @nativescript/*  _____________'
    },
		// packages
		// build output is always in dist/packages
		'@nativescript': {
			// @nativescript/core
			core: {
				build: {
          script: 'nx run core:build',
          description: '@nativescript/core: Build'
        },
				test: {
          script: 'nx run core:unit',
          description: '@nativescript/core: Unit tests',
					watch: {
            script: 'nx run core:unit.watch',
            description: '@nativescript/core: Unit tests with watcher'
					},
				},
			},
      // @nativescript/core API Reference Docs
      'core-api-docs': {
				build: {
          script: 'nx run core-api-docs:build',
          description: '@nativescript/core: API Reference Docs Build'
        }
      },
			// @nativescript/ui-mobile-base
			'ui-mobile-base': {
				build: {
          script: 'nx run ui-mobile-base:build',
          description: '@nativescript/ui-mobile-base: Build for npm'
        },
			},
			// @nativescript/webpack
			webpack: {
				build: {
          script: 'nx run webpack:build',
          description: '@nativescript/webpack: Build for npm'
        },
				test: {
          script: 'nx run webpack:test',
          description: '@nativescript/webpack: Unit tests'
        },
      },
      // @nativescript/webpack (5)
			webpack5: {
				build: {
          script: 'nx run webpack5:build',
          description: '@nativescript/webpack(5): Build for npm'
        },
			},
    },
    "โก": {
      script: `npx cowsay "Focus only on source you care about for efficiency โก"`,
      description: '_____________  Focus (VS Code supported)  _____________'
    },
    focus: {
      core: {
        script: 'nx g @nstudio/focus:mode core',
        description: 'Focus on @nativescript/core'
      },
      types: {
        script: 'nx g @nstudio/focus:mode types-android,types-ios',
        description: 'Focus on @nativescript/types'
      },
      'ui-mobile-base': {
        script: 'nx g @nstudio/focus:mode ui-mobile-base',
        description: 'Focus on @nativescript/ui-mobile-base'
      },
      webpack: {
        script: 'nx g @nstudio/focus:mode webpack',
        description: 'Focus on @nativescript/webpack'
      },
      reset: {
        script: 'nx g @nstudio/focus:mode',
        description: 'Reset Focus'
      }
    },
    ".....................": {
      script: `npx cowsay "That's all for now folks ~"`,
      description: '.....................'
    }
	},
};
