'use strict';

module.exports = function unifiedExtend(api, opts) {

    api.assertVersion('>=0.3.0');

    const { tryRequire } = require('@micro-app/shared-utils');

    const CHUNK_NAME = 'runtime';
    const CHUNK_VENDORS_NAME = 'chunk-vendors';
    const CHUNK_COMMON_NAME = 'chunk-common';

    function chunkConfig(webpackChain) {

        webpackChain.optimization.runtimeChunk({ name: CHUNK_NAME });
        webpackChain.optimization.usedExports(true);

        // code splitting
        webpackChain
            .optimization.splitChunks({
                cacheGroups: {
                    vendors: {
                        name: CHUNK_VENDORS_NAME,
                        test: /[\\/]node_modules[\\/]/,
                        priority: -10,
                        chunks: 'initial',
                    },
                    common: {
                        name: CHUNK_COMMON_NAME,
                        minChunks: 2,
                        priority: -20,
                        chunks: 'initial',
                        reuseExistingChunk: true,
                    },
                },
            });
    }

    api.modifyWebpackChain(webpackChain => {

        const options = api.config || {};

        const entry = options.entry || {};
        // entry
        Object.keys(entry).forEach(key => {
            webpackChain.entry(key).merge(entry[key]);
        });

        // chunk
        // code splitting
        if (process.env.NODE_ENV !== 'test') {
            chunkConfig(webpackChain);
        }

        const isProd = api.mode === 'production';

        // load html
        const multiPageConfig = options.pages || {};
        const pages = Object.keys(multiPageConfig);
        if (pages.length > 0) {
            const HTMLPlugin = tryRequire('html-webpack-plugin');
            if (HTMLPlugin) {
                pages.forEach((name, index) => {
                    const htmlOpts = multiPageConfig[name];
                    const pname = index ? `html-${name}-${index}` : `html-${name}`;

                    if (!htmlOpts.chunks) {
                        htmlOpts.chunks = [ name ];
                    }

                    if (htmlOpts.chunks && Array.isArray(htmlOpts.chunks)) {
                        [ CHUNK_COMMON_NAME, CHUNK_VENDORS_NAME, CHUNK_NAME ].forEach(key => {
                            if (!htmlOpts.chunks.includes(key)) {
                                htmlOpts.chunks.unshift(key);
                            }
                        });
                    }

                    if (isProd) { // 暂时不定义，外部自行配置
                        Object.assign(htmlOpts, {
                            minify: {
                                removeComments: true,
                                collapseWhitespace: true,
                                removeAttributeQuotes: true,
                                collapseBooleanAttributes: true,
                                removeScriptTypeAttributes: true,
                                // more options:
                                // https://github.com/kangax/html-minifier#options-quick-reference
                            },
                        });
                    }

                    webpackChain
                        .plugin(pname)
                        .use(HTMLPlugin, [ htmlOpts ]);
                });
            } else {
                api.logger.warn('[webpack]', 'Not Found "html-webpack-plugin"');
            }
        }

        // node
        if (webpackChain.get('target') === 'web') {
            webpackChain.node
                .merge({
                    // prevent webpack from injecting useless setImmediate polyfill because Vue
                    // source contains it (although only uses it if it's native).
                    setImmediate: false,
                    // process is injected via DefinePlugin, although some 3rd party
                    // libraries may require a mock to work properly (#934)
                    process: 'mock',
                    // prevent webpack from injecting mocks to Node native modules
                    // that does not make sense for the client
                    dgram: 'empty',
                    fs: 'empty',
                    net: 'empty',
                    tls: 'empty',
                    child_process: 'empty',
                });
        }

        return webpackChain;
    });
};

module.exports.configuration = {
    description: 'webpack 通用应用配置',
};