'use strict';

const path = require('path');

const config = {
    name: '@micro-app/demo',
    description: '',
    version: '0.0.1',
    type: '', // types 类型
    webpack: { }, // webpack 配置 (只有自己使用)

    entry: {
        main: './simple/client/main.js',
    },

    htmls: [
        {
            filename: 'index.html',
            hash: true,
            chunks: [ 'common', 'main' ],
            template: './simple/client/index.html',
        },
    ],

    outputDir: path.resolve(__dirname, 'dist'),
    // publicPath: '/',

    // staticPath: '',

    // dlls: [
    //     {
    //         context: __dirname,
    //     },
    // ],

    // devServer: {},

    alias: { // 前端
        api: 'abc',
        config: {
            link: 'abc',
            description: '配置',
        },
        service: {
            link: 'abc',
            description: '接口',
            type: 'server',
        },
    },

    // 服务配置
    server: {
        entry: '', // 服务端入口
        port: 8088, // 服务端口号
        options: {
            // 服务端回调参数
        },
    },
};


config.plugins = [
    __dirname,
    '@micro-app/plugin-compatible',
    '@micro-app/plugin-deploy', // test
];

module.exports = config;
