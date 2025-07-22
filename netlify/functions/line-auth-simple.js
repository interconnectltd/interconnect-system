/**
 * Simplified LINE Authentication Backend Function
 * 依存関係エラーを回避するシンプル版
 */

exports.handler = async (event, context) => {
    console.log('line-auth-simple function called');
    console.log('HTTP Method:', event.httpMethod);
    console.log('Headers:', JSON.stringify(event.headers));
    
    // CORSヘッダー
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONSリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // POSTリクエストのみ処理
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        console.log('Request body:', event.body);
        
        // リクエストボディをパース
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid JSON in request body',
                    details: parseError.message
                })
            };
        }
        const { code, redirect_uri } = body;

        if (!code || !redirect_uri) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing required parameters',
                    required: ['code', 'redirect_uri']
                })
            };
        }

        // 環境変数を取得
        console.log('Checking environment variables...');
        const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
        const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
        
        console.log('Environment check:', {
            LINE_CHANNEL_ID: !!LINE_CHANNEL_ID,
            LINE_CHANNEL_SECRET: !!LINE_CHANNEL_SECRET,
            SUPABASE_URL: !!SUPABASE_URL,
            SUPABASE_SERVICE_KEY: !!SUPABASE_SERVICE_KEY
        });

        // 環境変数の確認
        if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
            console.error('Missing LINE environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    details: 'LINE credentials not configured'
                })
            };
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            console.error('Missing Supabase environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    details: 'Supabase credentials not configured'
                })
            };
        }

        // node-fetchを動的にインポート
        let fetch;
        try {
            fetch = require('node-fetch');
        } catch (e) {
            // node-fetchが無い場合は、Node.js 18+のfetchを使用
            fetch = globalThis.fetch;
        }

        // LINEトークンエンドポイントにリクエスト
        const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri,
                client_id: LINE_CHANNEL_ID,
                client_secret: LINE_CHANNEL_SECRET
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('LINE token error:', tokenData);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'LINE authentication failed',
                    details: tokenData.error_description || tokenData.error
                })
            };
        }

        // アクセストークンを使用してユーザー情報を取得
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const profile = await profileResponse.json();

        if (!profileResponse.ok) {
            console.error('LINE profile error:', profile);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Failed to get LINE profile',
                    details: profile.message
                })
            };
        }

        // Supabase処理（簡易版）
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

            // プロファイルテーブルで既存ユーザーを確認
            const { data: existingProfile, error: searchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('line_user_id', profile.userId)
                .single();

            let userProfile;
            
            if (existingProfile) {
                // 既存ユーザーを更新
                const { data: updatedProfile, error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        display_name: profile.displayName,
                        picture_url: profile.pictureUrl,
                        status_message: profile.statusMessage,
                        updated_at: new Date().toISOString()
                    })
                    .eq('line_user_id', profile.userId)
                    .select()
                    .single();

                if (updateError) throw updateError;
                userProfile = updatedProfile;
            } else {
                // 新規ユーザーを作成
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        line_user_id: profile.userId,
                        display_name: profile.displayName,
                        picture_url: profile.pictureUrl,
                        status_message: profile.statusMessage
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                userProfile = newProfile;
            }

            // 成功レスポンス
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    user: {
                        id: userProfile.id,
                        line_user_id: profile.userId,
                        name: profile.displayName,
                        picture: profile.pictureUrl,
                        email: userProfile.email || null
                    }
                })
            };

        } catch (supabaseError) {
            console.error('Supabase error:', supabaseError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Database error',
                    details: supabaseError.message
                })
            };
        }

    } catch (error) {
        console.error('Function error:', error);
        console.error('Error stack:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message,
                type: error.constructor.name,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};