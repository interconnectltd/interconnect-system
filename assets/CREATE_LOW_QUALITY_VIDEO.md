# 低品質版動画作成手順

## 必要なツール
- ffmpeg

## コマンド例
```bash
# 解像度を下げて圧縮（1280x720、ビットレート1M）
ffmpeg -i interconnect-top.mp4 -vf scale=1280:720 -b:v 1M -b:a 128k interconnect-top-low.mp4

# より軽量版（960x540、ビットレート500k）
ffmpeg -i interconnect-top.mp4 -vf scale=960:540 -b:v 500k -b:a 96k interconnect-top-low.mp4

# H.265コーデックを使用（さらに高圧縮）
ffmpeg -i interconnect-top.mp4 -c:v libx265 -crf 28 -preset fast -c:a aac -b:a 128k interconnect-top-low.mp4
```

## 目標
- 元ファイル: 27MB
- 目標サイズ: 5MB以下
- 画質: モバイルでも許容できるレベル

