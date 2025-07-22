// 環境変数テスト用関数
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // 環境変数の存在確認（値は隠す）
    const envCheck = {
        LINE_CHANNEL_ID: !!process.env.LINE_CHANNEL_ID,
        LINE_CHANNEL_SECRET: !!process.env.LINE_CHANNEL_SECRET,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
        NODE_VERSION: process.version,
        FUNCTION_NAME: context.functionName,
        AWS_REGION: process.env.AWS_REGION,
        
        // 値の一部を確認（セキュリティのため最初の10文字のみ）
        LINE_CHANNEL_ID_PREVIEW: process.env.LINE_CHANNEL_ID ? process.env.LINE_CHANNEL_ID.substring(0, 10) : 'NOT SET',
        SUPABASE_URL_PREVIEW: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) : 'NOT SET'
    };

    // node-fetchの確認
    let nodeFetchAvailable = false;
    try {
        require('node-fetch');
        nodeFetchAvailable = true;
    } catch (e) {
        nodeFetchAvailable = false;
    }

    // @supabase/supabase-jsの確認
    let supabaseAvailable = false;
    try {
        require('@supabase/supabase-js');
        supabaseAvailable = true;
    } catch (e) {
        supabaseAvailable = false;
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            environment: envCheck,
            dependencies: {
                'node-fetch': nodeFetchAvailable,
                '@supabase/supabase-js': supabaseAvailable,
                'globalThis.fetch': typeof globalThis.fetch === 'function'
            },
            runtime: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        }, null, 2)
    };
};