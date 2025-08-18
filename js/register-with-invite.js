/**
 * 招待コード付き登録処理
 */

(function() {
    'use strict';

    // 既存のregistration-flow.jsの登録処理をオーバーライド
    window.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        // cloneNodeを使わずに、既存のイベントリスナーをオーバーライド
        // submitイベントをキャプチャフェーズで先に処理
        form.addEventListener('submit', handleRegistrationWithInvite, true);
    });

    async function handleRegistrationWithInvite(e) {
        e.preventDefault();

        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        
        // フォームデータを収集
        const formData = collectFormData();
        
        // 招待コード情報を取得
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite') || sessionStorage.getItem('inviteCode');
        const inviterId = sessionStorage.getItem('inviterId');

        // ボタンをローディング状態に
        submitButton.disabled = true;
        submitButton.classList.add('loading');
        submitButton.textContent = '登録処理中...';

        try {
            // まず既存ユーザーをチェック
            const { data: existingUser, error: checkError } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('email', formData.email)
                .single();
            
            if (existingUser) {
                throw new Error('このメールアドレスは既に登録されています。ログインページへお進みください。');
            }

            // Supabaseでユーザー登録
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        company: formData.company,
                        position: formData.position,
                        phone: formData.phone,
                        line_id: formData.lineId
                    }
                }
            });

            if (authError) {
                // Supabaseのエラーメッセージを日本語化
                if (authError.message.includes('User already registered')) {
                    throw new Error('このメールアドレスは既に登録されています。');
                } else if (authError.message.includes('Password should be at least')) {
                    throw new Error('パスワードは8文字以上で入力してください。');
                } else if (authError.message.includes('Invalid email')) {
                    throw new Error('有効なメールアドレスを入力してください。');
                }
                throw authError;
            }

            // プロフィール作成（user_profilesテーブルに保存）
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    id: authData.user.id,
                    name: formData.name,
                    full_name: formData.name, // full_nameも設定
                    company: formData.company,
                    position: formData.position,
                    email: formData.email,
                    phone: formData.phone,
                    line_id: formData.lineId,
                    budget_range: formData.budget, // budget_rangeフィールド
                    bio: formData['skills-pr'] || '', // 自己紹介
                    skills: formData.skills,
                    interests: formData.interests,
                    revenue_details: formData['revenue-details'],
                    hr_details: formData['hr-details'],
                    dx_details: formData['dx-details'],
                    strategy_details: formData['strategy-details'],
                    industry: formData.industry || '', // 業界
                    is_active: true, // アクティブフラグ
                    is_online: true, // オンライン状態
                    last_login_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (profileError) throw profileError;

            // 招待コードがある場合の処理
            if (inviteCode && inviterId) {
                // console.log('招待コードを処理中:', inviteCode);

                // 招待記録を作成
                const { error: invitationError } = await supabase
                    .from('invitations')
                    .insert({
                        inviter_id: inviterId,
                        invitee_id: authData.user.id,
                        status: 'registered',
                        invite_code: inviteCode,
                        registered_at: new Date().toISOString()
                    });

                if (invitationError) {
                    // console.error('招待記録の作成エラー:', invitationError);
                    // エラーが発生しても登録処理は継続
                }

                // 招待リンクの使用回数を更新
                const { data: inviteLink } = await supabase
                    .from('invite_links')
                    .select('id, used_count')
                    .eq('link_code', inviteCode)
                    .single();

                if (inviteLink) {
                    await supabase
                        .from('invite_links')
                        .update({ 
                            used_count: (inviteLink.used_count || 0) + 1,
                            last_used_at: new Date().toISOString()
                        })
                        .eq('id', inviteLink.id);
                }

                // セッションストレージをクリア
                sessionStorage.removeItem('inviteCode');
                sessionStorage.removeItem('inviterId');
            }

            // 成功メッセージ
            showToast('登録が完了しました！', 'success');

            // ユーザー情報を保存
            localStorage.setItem('user', JSON.stringify({
                id: authData.user.id,
                email: formData.email,
                name: formData.name,
                company: formData.company
            }));
            sessionStorage.setItem('isLoggedIn', 'true');

            // ダッシュボードへリダイレクト
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);

        } catch (error) {
            // console.error('登録エラー:', error);
            showToast(error.message || '登録に失敗しました', 'error');
            
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
            submitButton.textContent = '登録する';
        }
    }

    function collectFormData() {
        const getElementValue = (id) => {
            const elem = document.getElementById(id);
            return elem ? elem.value : '';
        };

        return {
            // 基本情報
            name: getElementValue('name'),
            company: getElementValue('company'),
            email: getElementValue('email'),
            password: getElementValue('password'),
            position: getElementValue('position'),
            
            // 事業課題
            challenges: Array.from(document.querySelectorAll('input[name="challenges"]:checked'))
                .map(cb => cb.value),
            budget: getElementValue('budget'),
            
            // 事業課題の詳細
            'revenue-details': getElementValue('revenue-details'),
            'hr-details': getElementValue('hr-details'),
            'dx-details': getElementValue('dx-details'),
            'strategy-details': getElementValue('strategy-details'),
            
            // 連絡先
            phone: getElementValue('phone'),
            lineId: getElementValue('line-id'),
            
            // スキル
            skills: Array.from(document.querySelectorAll('input[name="skills"]:checked'))
                .map(cb => cb.value),
            'skills-pr': getElementValue('skills-pr'),
            
            // 興味・関心
            interests: Array.from(document.querySelectorAll('input[name="interests"]:checked'))
                .map(cb => cb.value),
            'interests-details': getElementValue('interests-details'),
            
            // その他
            newsletter: document.querySelector('input[name="newsletter"]')?.checked || false
        };
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `registration-toast ${type}`;
        
        const icon = document.createElement('i');
        const iconClass = type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        icon.className = `fas ${iconClass}`;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        toast.appendChild(icon);
        toast.appendChild(messageSpan);
        
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0066ff',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '16px',
            fontWeight: '500',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

})();