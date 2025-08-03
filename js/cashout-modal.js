/**
 * キャッシュアウトモーダル管理
 */

class CashoutModal {
    constructor() {
        this.modal = null;
        this.availablePoints = 0;
        this.minCashoutAmount = 10000; // 最小換金額: 10,000ポイント
        this.taxRate = 0.1021; // 源泉徴収税率: 10.21%
        this.init();
    }

    init() {
        // モーダルHTML作成
        this.createModal();
        // イベントリスナー設定
        this.setupEventListeners();
    }

    createModal() {
        const modalHtml = `
            <div class="modal" id="cashoutModal">
                <div class="modal-overlay"></div>
                <div class="modal-content cashout-modal">
                    <div class="modal-header">
                        <h2>ポイント換金申請</h2>
                        <button class="modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <!-- 利用可能ポイント -->
                        <div class="cashout-info-card">
                            <div class="info-label">利用可能ポイント</div>
                            <div class="info-value" id="modalAvailablePoints">0 pt</div>
                        </div>
                        
                        <!-- 換金額入力 -->
                        <div class="form-group">
                            <label for="cashoutAmount">換金ポイント数</label>
                            <div class="input-with-unit">
                                <input type="number" 
                                       id="cashoutAmount" 
                                       min="${this.minCashoutAmount}" 
                                       step="1000"
                                       placeholder="${this.minCashoutAmount.toLocaleString()}">
                                <span class="unit">pt</span>
                            </div>
                            <small class="form-help">
                                最小換金額: ${this.minCashoutAmount.toLocaleString()}ポイント（1,000ポイント単位）
                            </small>
                        </div>
                        
                        <!-- 換金計算結果 -->
                        <div class="cashout-calculation" id="cashoutCalculation" style="display: none;">
                            <h3>換金内訳</h3>
                            <div class="calculation-row">
                                <span>換金ポイント</span>
                                <span id="calcPoints">0 pt</span>
                            </div>
                            <div class="calculation-row">
                                <span>換金額（税込）</span>
                                <span id="calcGrossAmount">¥0</span>
                            </div>
                            <div class="calculation-row tax">
                                <span>源泉徴収税（10.21%）</span>
                                <span id="calcTax">-¥0</span>
                            </div>
                            <div class="calculation-row total">
                                <span>振込予定額</span>
                                <span id="calcNetAmount">¥0</span>
                            </div>
                        </div>
                        
                        <!-- 振込先情報 -->
                        <div class="bank-info-section">
                            <h3>振込先情報</h3>
                            
                            <div class="form-group">
                                <label for="bankName">金融機関名 <span class="required">*</span></label>
                                <input type="text" id="bankName" placeholder="例：みずほ銀行" required>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="branchName">支店名 <span class="required">*</span></label>
                                    <input type="text" id="branchName" placeholder="例：東京支店" required>
                                </div>
                                <div class="form-group">
                                    <label for="branchCode">支店コード</label>
                                    <input type="text" id="branchCode" placeholder="例：001" maxlength="3">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="accountType">口座種別 <span class="required">*</span></label>
                                    <select id="accountType" required>
                                        <option value="">選択してください</option>
                                        <option value="普通">普通</option>
                                        <option value="当座">当座</option>
                                        <option value="貯蓄">貯蓄</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="accountNumber">口座番号 <span class="required">*</span></label>
                                    <input type="text" id="accountNumber" placeholder="例：1234567" maxlength="7" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="accountHolder">口座名義（カナ） <span class="required">*</span></label>
                                <input type="text" id="accountHolder" placeholder="例：ヤマダ タロウ" required>
                                <small class="form-help">全角カタカナ・スペースで入力してください</small>
                            </div>
                        </div>
                        
                        <!-- 注意事項 -->
                        <div class="cashout-notice">
                            <h3><i class="fas fa-exclamation-circle"></i> 注意事項</h3>
                            <ul>
                                <li>換金申請後のキャンセルはできません</li>
                                <li>振込手数料は弊社が負担いたします</li>
                                <li>振込は申請から5営業日以内に行われます</li>
                                <li>源泉徴収票は年末に発行されます</li>
                                <li>本人確認が必要な場合はご連絡することがあります</li>
                            </ul>
                        </div>
                        
                        <!-- 同意チェックボックス -->
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="cashoutAgree">
                                <span>上記の注意事項を確認し、換金申請を行うことに同意します</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.cashoutModal.close()">
                            キャンセル
                        </button>
                        <button class="btn btn-primary" id="submitCashout" disabled>
                            換金申請する
                        </button>
                    </div>
                </div>
            </div>
        `;

        // モーダルをDOMに追加
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modal = document.getElementById('cashoutModal');
    }

    setupEventListeners() {
        // モーダルクローズ
        this.modal.querySelector('.modal-close').addEventListener('click', () => this.close());
        this.modal.querySelector('.modal-overlay').addEventListener('click', () => this.close());

        // 換金額入力時の計算
        const amountInput = document.getElementById('cashoutAmount');
        amountInput.addEventListener('input', () => this.calculateCashout());

        // フォーム入力チェック
        const inputs = this.modal.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.checkFormValidity());
        });

        // 同意チェックボックス
        document.getElementById('cashoutAgree').addEventListener('change', () => this.checkFormValidity());

        // 申請ボタン
        document.getElementById('submitCashout').addEventListener('click', () => this.submitCashout());

        // 口座名義のカナ入力制限
        document.getElementById('accountHolder').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^ァ-ヶー\s]/g, '');
        });

        // 数字入力制限
        ['branchCode', 'accountNumber'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        });
    }

    open(availablePoints) {
        this.availablePoints = availablePoints;
        document.getElementById('modalAvailablePoints').textContent = `${availablePoints.toLocaleString()} pt`;
        
        // 最大値を設定
        const amountInput = document.getElementById('cashoutAmount');
        amountInput.max = availablePoints;
        
        // モーダル表示
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // フォームリセット
        this.modal.querySelectorAll('input, select').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // 計算結果を非表示
        document.getElementById('cashoutCalculation').style.display = 'none';
        document.getElementById('submitCashout').disabled = true;
    }

    calculateCashout() {
        const amountInput = document.getElementById('cashoutAmount');
        const amount = parseInt(amountInput.value) || 0;
        
        if (amount >= this.minCashoutAmount && amount <= this.availablePoints) {
            // 計算
            const grossAmount = amount; // 1ポイント = 1円
            const tax = Math.floor(grossAmount * this.taxRate);
            const netAmount = grossAmount - tax;
            
            // 表示更新
            document.getElementById('calcPoints').textContent = `${amount.toLocaleString()} pt`;
            document.getElementById('calcGrossAmount').textContent = `¥${grossAmount.toLocaleString()}`;
            document.getElementById('calcTax').textContent = `-¥${tax.toLocaleString()}`;
            document.getElementById('calcNetAmount').textContent = `¥${netAmount.toLocaleString()}`;
            
            document.getElementById('cashoutCalculation').style.display = 'block';
        } else {
            document.getElementById('cashoutCalculation').style.display = 'none';
        }
        
        this.checkFormValidity();
    }

    checkFormValidity() {
        const amount = parseInt(document.getElementById('cashoutAmount').value) || 0;
        const bankName = document.getElementById('bankName').value.trim();
        const branchName = document.getElementById('branchName').value.trim();
        const accountType = document.getElementById('accountType').value;
        const accountNumber = document.getElementById('accountNumber').value.trim();
        const accountHolder = document.getElementById('accountHolder').value.trim();
        const agreed = document.getElementById('cashoutAgree').checked;
        
        const isValid = 
            amount >= this.minCashoutAmount &&
            amount <= this.availablePoints &&
            amount % 1000 === 0 && // 1,000ポイント単位
            bankName &&
            branchName &&
            accountType &&
            accountNumber &&
            accountHolder &&
            agreed;
        
        document.getElementById('submitCashout').disabled = !isValid;
    }

    async submitCashout() {
        const submitButton = document.getElementById('submitCashout');
        submitButton.disabled = true;
        submitButton.textContent = '申請中...';
        
        try {
            const amount = parseInt(document.getElementById('cashoutAmount').value);
            const bankInfo = {
                bank_name: document.getElementById('bankName').value.trim(),
                branch_name: document.getElementById('branchName').value.trim(),
                branch_code: document.getElementById('branchCode').value.trim(),
                account_type: document.getElementById('accountType').value,
                account_number: document.getElementById('accountNumber').value.trim(),
                account_holder: document.getElementById('accountHolder').value.trim()
            };
            
            // キャッシュアウト申請を作成
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('ユーザー情報が取得できません');
            
            const { data, error } = await supabase
                .from('cashout_requests')
                .insert({
                    user_id: user.id,
                    amount: amount,
                    gross_amount: amount,
                    tax_amount: Math.floor(amount * this.taxRate),
                    net_amount: amount - Math.floor(amount * this.taxRate),
                    bank_info: bankInfo,
                    status: 'pending'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // ポイント残高を更新
            const { error: pointError } = await supabase
                .rpc('deduct_user_points', {
                    p_user_id: user.id,
                    p_amount: amount
                });
            
            if (pointError) throw pointError;
            
            // 成功メッセージ
            this.showToast('換金申請が完了しました', 'success');
            
            // モーダルを閉じる
            this.close();
            
            // ページをリロード
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('換金申請エラー:', error);
            this.showToast(error.message || '換金申請に失敗しました', 'error');
            
            submitButton.disabled = false;
            submitButton.textContent = '換金申請する';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: '10001',
            animation: 'slideInRight 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// グローバルに公開
window.cashoutModal = new CashoutModal();