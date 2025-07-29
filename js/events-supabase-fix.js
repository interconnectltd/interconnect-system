/**
 * Events Supabase Fix
 * Supabaseクライアントの確認と参加申込機能の修正
 */

(function() {
    'use strict';

    // Supabaseクライアントが存在するまで待機
    function waitForSupabase() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.supabase) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // 5秒でタイムアウト
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    // 参加申込ボタンのイベントリスナーを修正
    async function fixEventRegistration() {
        await waitForSupabase();
        
        // モーダルの参加ボタンにイベントリスナーを追加
        const eventActionBtn = document.getElementById('eventActionBtn');
        if (eventActionBtn) {
            eventActionBtn.addEventListener('click', async () => {
                console.log('[EventsFix] 参加申込ボタンがクリックされました');
                
                // 現在のイベントIDを取得
                const modal = document.getElementById('eventDetailModal');
                const eventId = modal?.dataset.eventId;
                
                if (!eventId) {
                    console.error('[EventsFix] イベントIDが見つかりません');
                    return;
                }
                
                // ユーザー認証を確認
                if (!window.supabase) {
                    alert('認証エラーが発生しました。ページをリロードしてください。');
                    return;
                }
                
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) {
                    alert('ログインが必要です');
                    window.location.href = 'login.html';
                    return;
                }
                
                try {
                    // 既に参加登録しているか確認
                    const { data: existing, error: checkError } = await window.supabase
                        .from('event_participants')
                        .select('*')
                        .eq('event_id', eventId)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    
                    if (checkError && checkError.code !== 'PGRST116') {
                        console.error('[EventsFix] 参加状況確認エラー:', checkError);
                        throw checkError;
                    }
                    
                    if (existing) {
                        if (existing.status === 'cancelled') {
                            // キャンセル済みの場合は再登録
                            const { error } = await window.supabase
                                .from('event_participants')
                                .update({ 
                                    status: 'registered',
                                    registration_date: new Date().toISOString()
                                })
                                .eq('id', existing.id);
                            
                            if (error) throw error;
                            
                            alert('イベントに再登録しました！');
                        } else {
                            alert('既にこのイベントに参加登録済みです');
                        }
                    } else {
                        // 新規登録
                        const { error } = await window.supabase
                            .from('event_participants')
                            .insert({
                                event_id: eventId,
                                user_id: user.id,
                                status: 'registered'
                            });
                        
                        if (error) throw error;
                        
                        alert('イベントへの参加申込が完了しました！');
                        
                        // 通知を送信
                        if (window.notificationSender) {
                            const { data: event } = await window.supabase
                                .from('event_items')
                                .select('title')
                                .eq('id', eventId)
                                .single();
                            
                            await window.notificationSender.sendSystemNotification(
                                user.id,
                                'イベント参加申込完了',
                                `「${event?.title || 'イベント'}」への参加申込が完了しました`
                            );
                        }
                    }
                    
                    // モーダルを閉じる
                    if (window.eventModal && window.eventModal.close) {
                        window.eventModal.close();
                    }
                    
                    // イベント一覧を更新
                    if (window.eventsSupabase && window.eventsSupabase.loadEvents) {
                        window.eventsSupabase.loadEvents();
                    }
                    
                } catch (error) {
                    console.error('[EventsFix] 参加申込エラー:', error);
                    alert('参加申込中にエラーが発生しました: ' + error.message);
                }
            });
        }
    }

    // DOMContentLoaded時に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixEventRegistration);
    } else {
        fixEventRegistration();
    }

})();