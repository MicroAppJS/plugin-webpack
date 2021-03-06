'use strict';

module.exports = function unifiedExtend(api, opts) {

    api.assertVersion('>=0.3.0');

    const { tryRequire, fs, hash } = require('@micro-app/shared-utils');

    api.modifyChainWebpackConfig(webpackChain => {

        const options = api.config || {};

        webpackChain
            .context(api.root)
            .end();

        if (isWebpack4()) {
            const getAssetPath = require('./utils/getAssetPath');
            const outputFilename = getAssetPath(options, 'js/[name].[contenthash:8].js');
            webpackChain
                .output
                .filename(outputFilename)
                .chunkFilename(outputFilename)
                .end();
        }

        const multiPageConfig = options.pages;
        const pages = Object.keys(multiPageConfig);

        const publicCopyIgnore = [ '.DS_Store' ];
        pages.forEach(name => {
            const item = multiPageConfig[name];
            // load html
            const pageHtmlOptions = item.htmls;
            publicCopyIgnore.push(...pageHtmlOptions.map(opts => opts.template));
        });

        const NamedChunksPlugin = tryRequire('webpack/lib/NamedChunksPlugin');
        if (NamedChunksPlugin) {
            // keep chunk ids stable so async chunks have consistent hash (#1916)
            webpackChain
                .plugin('named-chunks')
                .use(NamedChunksPlugin, [ chunk => {
                    if (chunk.name) {
                        return chunk.name;
                    }

                    const joinedHash = hash(
                        Array.from(chunk.modulesIterable, m => m.id).join('_')
                    );
                    return 'chunk-' + joinedHash;
                } ]);
        }

        // copy static
        const COPYPlugin = tryRequire('copy-webpack-plugin');
        if (COPYPlugin) {
            const staticPaths = (options.staticPaths || []).filter(item => fs.existsSync(item));
            if (staticPaths.length) {
                webpackChain
                    .plugin('copy')
                    .use(COPYPlugin, [ staticPaths.map(publicDir => {
                        return {
                            from: publicDir,
                            // to: options.outputDir,
                            toType: 'dir',
                            ignore: publicCopyIgnore,
                        };
                    }) ]);
            }
        }

        return webpackChain;
    });
};

module.exports.configuration = {
    description: 'webpack config for production',
    mode: 'production',
};


function webpackVersion() {
    const { tryRequire } = require('@micro-app/shared-utils');
    const webpackPkgInfo = tryRequire('webpack/package.json');
    const _webpackVersion = webpackPkgInfo && webpackPkgInfo.version || '3'; // 默认 3
    return _webpackVersion;
}

function isWebpack4() {
    const { semver } = require('@micro-app/shared-utils');
    const _webpackVersion = webpackVersion();
    // webpack 4
    const _isWebpack4 = semver.satisfies(_webpackVersion, '>=4');
    return _isWebpack4;
}
