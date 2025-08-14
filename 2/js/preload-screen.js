/**
 * プリロード画面制御
 * インラインスクリプトとして実行される
 */

// ローディング画面のHTMLを即座に追加
document.write(`
<div class="preload-screen" id="preloadScreen" style="
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
">
    <div style="
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
    ">
        <video style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            min-width: 100%;
            min-height: 100%;
            width: auto;
            height: auto;
            object-fit: cover;
        " autoplay muted playsinline preload="auto">
            <source src="assets/interconnect-top.mp4" type="video/mp4">
        </video>
        <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5));
        "></div>
        <div style="
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 14px;
            letter-spacing: 0.1em;
            font-family: 'Inter', sans-serif;
        ">INTER CONNECT</div>
        <div style="
            position: absolute;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 2px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            overflow: hidden;
        ">
            <div id="preloadProgressBar" style="
                height: 100%;
                background: white;
                width: 0%;
                transition: width 2s ease-out;
            "></div>
        </div>
    </div>
</div>
`);

// bodyのスクロールを無効化
document.body.style.overflow = 'hidden';

// プログレスバーのアニメーション開始
setTimeout(() => {
    const progressBar = document.getElementById('preloadProgressBar');
    if (progressBar) {
        progressBar.style.width = '100%';
    }
}, 100);

// ページ読み込み完了時に非表示
window.addEventListener('load', function() {
    setTimeout(() => {
        const preloadScreen = document.getElementById('preloadScreen');
        if (preloadScreen) {
            preloadScreen.style.transition = 'opacity 0.8s ease-out';
            preloadScreen.style.opacity = '0';
            
            setTimeout(() => {
                preloadScreen.remove();
                document.body.style.overflow = '';
            }, 800);
        }
    }, 2500); // 最低2.5秒表示
});