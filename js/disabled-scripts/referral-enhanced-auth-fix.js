// auth.uid()問題の修正
// console.log('=== Auth修正版 ===');

// ReferralManagerのcreateReferralLinkメソッドを修正
if (window.ReferralManager) {
    window.ReferralManager.prototype.createReferralLink = async function(description = null) {
        // console.log('[Auth-Fix] 紹介リンク作成開始...');
        
        try {
            // ユーザーIDを確実に取得
            if (!this.user || !this.user.id) {
                console.error('[Auth-Fix] ユーザー情報がありません');
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    throw new Error('ユーザーがログインしていません');
                }
                this.user = user;
            }
            
            // console.log('[Auth-Fix] ユーザーID:', this.user.id);
            // console.log('[Auth-Fix] 説明:', description);
            
            // 修正版の関数を使用
            const { data, error } = await window.supabaseClient
                .rpc('create_invite_link_fixed', {
                    p_user_id: this.user.id,
                    p_description: description || 'マイ紹介リンク'
                });
            
            // console.log('[Auth-Fix] 作成結果:', { data, error });
            
            if (error) {
                // 元の関数名でも試す
                // console.log('[Auth-Fix] 元の関数名で再試行...');
                const { data: data2, error: error2 } = await window.supabaseClient
                    .rpc('create_invite_link', {
                        p_user_id: this.user.id,
                        p_description: description || 'マイ紹介リンク'
                    });
                
                if (error2) {
                    console.error('[Auth-Fix] 両方の関数で失敗:', error, error2);
                    throw error2;
                }
                
                // console.log('[Auth-Fix] 元の関数で成功:', data2);
                
                // 成功通知
                this.showNotification('success', '紹介リンクを作成しました');
                
                // リンクリストを再読み込み
                await this.loadReferralLinks();
                
                // フォームを隠す
                document.getElementById('link-form').style.display = 'none';
                document.getElementById('link-description').value = '';
                
                return;
            }
            
            if (data && data.success) {
                // console.log('[Auth-Fix] 作成成功:', data);
                
                // 成功通知
                this.showNotification('success', '紹介リンクを作成しました');
                
                // リンクリストを再読み込み
                await this.loadReferralLinks();
                
                // フォームを隠す
                document.getElementById('link-form').style.display = 'none';
                document.getElementById('link-description').value = '';
            } else {
                throw new Error(data?.error || 'リンク作成に失敗しました');
            }
            
        } catch (error) {
            console.error('[Auth-Fix] エラー:', error);
            this.showNotification('error', error.message || 'リンクの作成に失敗しました');
        }
    };
    
    // loadReferralLinksも修正
    window.ReferralManager.prototype.loadReferralLinks = async function() {
        // console.log('[Auth-Fix] 紹介リンク読み込み開始...');
        
        try {
            // ユーザーIDを確実に取得
            if (!this.user || !this.user.id) {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    throw new Error('ユーザーがログインしていません');
                }
                this.user = user;
            }
            
            // console.log('[Auth-Fix] ユーザーID:', this.user.id);
            
            // 複数の方法で取得を試みる
            let links = null;
            let error = null;
            
            // 方法1: 修正版関数
            try {
                const { data: links1, error: error1 } = await window.supabaseClient
                    .rpc('get_my_invite_links', {
                        p_user_id: this.user.id
                    });
                
                // console.log('[Auth-Fix] 修正版関数結果:', { links1, error1 });
                
                if (!error1 && links1) {
                    links = links1;
                }
            } catch (e) {
                // console.log('[Auth-Fix] 修正版関数が存在しない:', e);
            }
            
            // 方法2: 通常のSELECT
            if (!links) {
                const { data: links2, error: error2 } = await window.supabaseClient
                    .from('invite_links')
                    .select('*')
                    .eq('created_by', this.user.id)
                    .order('created_at', { ascending: false });
                
                // console.log('[Auth-Fix] 通常SELECT結果:', { links2, error2 });
                
                if (!error2) {
                    links = links2;
                    error = error2;
                }
            }
            
            // リンクリストを表示
            const linksList = document.getElementById('links-list');
            if (!linksList) {
                console.error('[Auth-Fix] links-list要素が見つかりません');
                return;
            }
            
            if (!links || links.length === 0) {
                // console.log('[Auth-Fix] リンクが0件です');
                linksList.innerHTML = `
                    <div class="empty-links">
                        <i class="fas fa-link"></i>
                        <h3>まだ紹介リンクがありません</h3>
                        <p>「新しいリンクを作成」ボタンから始めましょう</p>
                    </div>
                `;
            } else {
                // console.log('[Auth-Fix] リンクを表示:', links.length + '件');
                const html = links.map(link => this.renderLinkItem(link)).join('');
                linksList.innerHTML = html;
            }
            
        } catch (error) {
            console.error('[Auth-Fix] エラー:', error);
            this.showNotification('error', 'リンクの読み込みに失敗しました');
        }
    };
}

// console.log('=== Auth修正版適用完了 ===');