// ==========================================
// マッチング機能の最終完成版
// プロファイル詳細とtl;dvデータ対応
// ==========================================

(function() {
    'use strict';
    
    console.log('[FinalComplete] 最終完成版マッチング機能開始');
    
    // tl;dvデータを使った高度なスコアリング
    const calculateAdvancedScore = async (profile, currentUser) => {
        let baseScore = 25;
        let tldvScore = 0;
        let hasTldvData = false;
        
        // tl;dvデータの確認
        try {
            // 議事録データの取得（meeting_minutesテーブルから）
            const { data: profileMinutes } = await window.supabase
                .from('meeting_minutes')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            const { data: currentUserMinutes } = await window.supabase
                .from('meeting_minutes')
                .select('*')
                .eq('user_id', currentUser?.id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (profileMinutes?.length > 0 && currentUserMinutes?.length > 0) {
                hasTldvData = true;
                
                // 議事録ベースの高度な分析
                const profileTopics = extractTopicsFromMinutes(profileMinutes);
                const userTopics = extractTopicsFromMinutes(currentUserMinutes);
                
                // トピックの一致度
                const commonTopics = profileTopics.filter(topic => 
                    userTopics.some(userTopic => 
                        topic.toLowerCase().includes(userTopic.toLowerCase()) ||
                        userTopic.toLowerCase().includes(topic.toLowerCase())
                    )
                );
                
                tldvScore = Math.min(commonTopics.length * 5, 25);
                
                console.log('[FinalComplete] tl;dvスコア:', tldvScore, 'トピック:', commonTopics);
            }
        } catch (error) {
            console.error('[FinalComplete] tl;dvデータ取得エラー:', error);
        }
        
        // 基本的なプロファイル情報でのスコアリング
        if (!hasTldvData) {
            // tl;dvデータがない場合の処理
            return {
                score: -1, // 特別な値でデータ不足を示す
                hasTldvData: false,
                message: 'tl;dvデータ不足により適切なスコアリングができません'
            };
        }
        
        // 通常のスコアリング + tl;dvスコア
        if (profile.skills?.length > 0) {
            baseScore += Math.min(profile.skills.length * 3, 15);
        }
        if (profile.location) baseScore += 8;
        if (profile.industry) baseScore += 8;
        if (profile.title) baseScore += 5;
        if (profile.company) baseScore += 5;
        
        const totalScore = Math.min(baseScore + tldvScore, 95);
        
        return {
            score: totalScore,
            hasTldvData: true,
            tldvScore: tldvScore
        };
    };
    
    // 議事録からトピックを抽出
    const extractTopicsFromMinutes = (minutes) => {
        const topics = [];
        minutes.forEach(minute => {
            if (minute.content) {
                // 簡易的なトピック抽出（実際はより高度な処理が必要）
                const keywords = minute.content
                    .split(/[。、\s]+/)
                    .filter(word => word.length > 3)
                    .slice(0, 10);
                topics.push(...keywords);
            }
        });
        return [...new Set(topics)]; // 重複を削除
    };
    
    // プロファイル詳細表示の実装
    const showProfileDetails = async (profileId) => {
        console.log('[FinalComplete] プロファイル詳細表示:', profileId);
        
        try {
            // プロファイル取得
            const { data: profile, error } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .single();
            
            if (error) throw error;
            
            // 現在のユーザー取得
            const { data: { user } } = await window.supabase.auth.getUser();
            const { data: currentUserProfile } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            // 高度なスコア計算
            const scoreResult = await calculateAdvancedScore(profile, currentUserProfile);
            
            // モーダル作成
            const modal = document.createElement('div');
            modal.className = 'profile-detail-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 700px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    position: relative;
                    animation: slideUp 0.3s ease;
                ">
                    <button onclick="this.closest('.profile-detail-modal').remove()" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #999;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        transition: all 0.2s ease;
                    ">×</button>
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="${profile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name)}" 
                             style="width: 120px; height: 120px; border-radius: 50%; margin-bottom: 20px;">
                        <h2 style="margin: 10px 0;">${profile.name || '名前未設定'}</h2>
                        <p style="color: #666; font-size: 18px;">
                            ${profile.title || ''} ${profile.company ? '@' + profile.company : ''}
                        </p>
                        
                        ${scoreResult.score === -1 ? `
                            <div style="
                                background: #ffeaa7;
                                border: 1px solid #fdcb6e;
                                color: #856404;
                                padding: 12px 20px;
                                border-radius: 8px;
                                margin-top: 20px;
                                font-size: 14px;
                            ">
                                <i class="fas fa-exclamation-triangle"></i>
                                ${scoreResult.message}
                            </div>
                        ` : `
                            <div style="
                                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                                color: white;
                                padding: 15px 30px;
                                border-radius: 30px;
                                display: inline-block;
                                margin-top: 20px;
                                font-size: 20px;
                                font-weight: bold;
                                box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
                            ">
                                マッチング度: ${scoreResult.score}%
                                ${scoreResult.tldvScore > 0 ? `<br><small style="font-size: 12px;">tl;dvスコア: +${scoreResult.tldvScore}</small>` : ''}
                            </div>
                        `}
                    </div>
                    
                    ${profile.bio ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="margin-bottom: 10px; color: #2c3e50;">
                                <i class="fas fa-user" style="margin-right: 8px;"></i>自己紹介
                            </h3>
                            <p style="line-height: 1.8; color: #555;">${profile.bio}</p>
                        </div>
                    ` : ''}
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <strong style="color: #2c3e50;">
                                <i class="fas fa-map-marker-alt" style="color: #e74c3c; margin-right: 5px;"></i>
                                地域:
                            </strong> 
                            ${profile.location || '<span style="color: #999;">未設定</span>'}
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <strong style="color: #2c3e50;">
                                <i class="fas fa-building" style="color: #3498db; margin-right: 5px;"></i>
                                業界:
                            </strong> 
                            ${profile.industry || '<span style="color: #999;">未設定</span>'}
                        </div>
                    </div>
                    
                    ${profile.skills && profile.skills.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="margin-bottom: 10px; color: #2c3e50;">
                                <i class="fas fa-code" style="margin-right: 8px;"></i>スキル
                            </h3>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${profile.skills.map(skill => 
                                    `<span style="
                                        background: #e3f2fd;
                                        color: #1976d2;
                                        padding: 6px 16px;
                                        border-radius: 20px;
                                        font-size: 14px;
                                        font-weight: 500;
                                    ">${skill}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${profile.interests && profile.interests.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="margin-bottom: 10px; color: #2c3e50;">
                                <i class="fas fa-heart" style="margin-right: 8px;"></i>興味・関心
                            </h3>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${profile.interests.map(interest => 
                                    `<span style="
                                        background: #f3e5f5;
                                        color: #7b1fa2;
                                        padding: 6px 16px;
                                        border-radius: 20px;
                                        font-size: 14px;
                                        font-weight: 500;
                                    ">${interest}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button onclick="window.finalComplete.sendConnect('${profileId}')" style="
                            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                            color: white;
                            border: none;
                            padding: 12px 40px;
                            border-radius: 25px;
                            font-size: 16px;
                            font-weight: 500;
                            cursor: pointer;
                            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
                            transition: all 0.3s ease;
                        ">
                            <i class="fas fa-link" style="margin-right: 8px;"></i>
                            コネクト申請を送る
                        </button>
                    </div>
                </div>
                
                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from {
                            transform: translateY(20px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                </style>
            `;
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('[FinalComplete] プロファイル詳細エラー:', error);
            alert('プロファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    
    // コネクト申請
    const sendConnectRequest = async (profileId) => {
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error('ログインが必要です');
            
            // 既存の申請をチェック
            const { data: existing } = await window.supabase
                .from('connections')
                .select('*')
                .eq('user_id', user.id)
                .eq('connected_user_id', profileId)
                .single();
            
            if (existing) {
                alert('既にコネクト申請を送信済みです');
                return;
            }
            
            // 新規申請
            const { error } = await window.supabase
                .from('connections')
                .insert({
                    user_id: user.id,
                    connected_user_id: profileId,
                    status: 'pending'
                });
            
            if (error) throw error;
            
            alert('コネクト申請を送信しました！');
            document.querySelector('.profile-detail-modal')?.remove();
            
        } catch (error) {
            console.error('[FinalComplete] コネクト申請エラー:', error);
            alert('コネクト申請の送信に失敗しました: ' + error.message);
        }
    };
    
    // 既存の関数をオーバーライド
    const overrideFunctions = () => {
        // displayOverrideのボタンクリックをオーバーライド
        document.addEventListener('click', (e) => {
            if (e.target.textContent === '詳細を見る') {
                e.preventDefault();
                e.stopPropagation();
                
                const card = e.target.closest('.override-matching-card');
                if (card) {
                    // プロファイルIDを取得（実際の実装では適切な方法で取得）
                    const profileElement = card.querySelector('h3');
                    if (profileElement) {
                        // 仮のID（実際はdata属性などから取得）
                        const profileId = card.dataset.profileId || 'test-id';
                        showProfileDetails(profileId);
                    }
                }
            }
        });
    };
    
    // グローバル公開
    window.finalComplete = {
        showProfile: showProfileDetails,
        sendConnect: sendConnectRequest,
        calculateScore: calculateAdvancedScore
    };
    
    // 初期化
    setTimeout(overrideFunctions, 3000);
    
    console.log('[FinalComplete] 最終完成版準備完了');
    console.log('プロファイル詳細: finalComplete.showProfile(profileId)');
    console.log('スコア計算: finalComplete.calculateScore(profile, currentUser)');
    
})();