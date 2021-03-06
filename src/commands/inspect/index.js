'use strict';

const defaults = {
    target: 'app',
};

module.exports = function inspectCommand(api, opts) {

    const chalk = require('chalk');
    const _ = require('lodash');

    const logger = api.logger;

    api.registerCommand('inspect', {
        description: 'inspect internal webpack config',
        usage: 'micro-app inspect [options] [...paths]',
        options: {
            '--mode': 'specify env mode (default: development)',
            '--type <type>': 'adapter type, eg. [ webpack, etc. ].',
            '--rule <ruleName>': 'inspect a specific module rule',
            '--plugin <pluginName>': 'inspect a specific plugin',
            '--rules': 'list all module rule names',
            '--plugins': 'list all plugin names',
            '--verbose': 'show full function definitions in output',
            '--target': `app | lib | plugin (default: ${defaults.target})`,
        },
        details: `
Examples:
    ${chalk.gray('# mode: development')}
    micro-app inspect --mode development
    ${chalk.gray('# inspect all plugins')}
    micro-app inspect --plugins
            `.trim(),
    },
    args => {

        // TODO 兼容, 下个版本删除
        if (args.t && !args.type) {
            args.type = args.t;
            logger.warn('you should be use "--type <type>"!!!');
        }

        for (const key in defaults) {
            if (args[key] == null) {
                args[key] = defaults[key];
            }
        }

        const { toString } = require('webpack-chain');
        const { highlight } = require('cli-highlight');

        const webpackConfig = api.resolveWebpackConfig({
            target: args.target,
        });

        if (process.env.MICRO_APP_TEST) {
            api.logger.debug('MICRO_APP_TEST --> Exit!!!');
            return webpackConfig;
        }

        const config = _.cloneDeep(webpackConfig);

        const { _: paths, verbose } = args;

        let res;
        let hasUnnamedRule;
        if (args.rule) {
            res = config.module && config.module.rules.find(r => r.__ruleNames[0] === args.rule);
        } else if (args.plugin) {
            res = Array.isArray(config.plugins)
                ? config.plugins.find(p => p.__pluginName === args.plugin)
                : {};
        } else if (args.rules) {
            res = config.module && Array.isArray(config.module.rules)
                ? config.module.rules.map(r => {
                    const name = r.__ruleNames ? r.__ruleNames[0] : 'Nameless Rule (*)';

                    hasUnnamedRule = hasUnnamedRule || !r.__ruleNames;

                    return name;
                })
                : [];
        } else if (args.plugins) {
            res = Array.isArray(config.plugins)
                ? config.plugins.map(p => p.__pluginName || p.constructor.name)
                : [];
        } else if (paths.length > 1) {
            res = {};
            paths.forEach(path => {
                res[path] = _.get(config, path);
            });
        } else if (paths.length === 1) {
            res = _.get(config, paths[0]);
        } else {
            res = config;
        }

        const output = toString(res, { verbose });
        logger.logo(highlight(output, { language: 'js' }));

        // Log explanation for Nameless Rules
        if (hasUnnamedRule) {
            logger.logo(`--- ${chalk.green('Footnotes')} ---`);
            logger.logo(`*: ${chalk.green(
                'Nameless Rules'
            )} were added through the ${chalk.green(
                'configureWebpack()'
            )} API (possibly by a plugin) instead of ${chalk.green(
                'chainWebpack()'
            )} (recommended).
      You can run ${chalk.green(
        'micro-app inspect'
    )} without any arguments to inspect the full config and read these rules' config.`);
        }

        return webpackConfig;
    }
    );
};

module.exports.configuration = {
    description: 'inspect webpack config command',
};
