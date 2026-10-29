#!/bin/sh
# Tạo ảnh thu nhỏ trong assets/thumbs/ cho giá treo và danh sách sản phẩm (trang chi tiết
# vẫn dùng ảnh gốc). Chạy lại sau khi thêm/thay ảnh mẫu:  sh tools/make_thumbs.sh
# Pad gần vuông (45×40): rộng 480px; pad dài (80×30, 90×40): rộng 640px. Chất lượng JPEG 70.
set -e
cd "$(dirname "$0")/../assets"
for dir in pads pads-80x30 pads-90x40; do
  case "$dir" in pads) width=480 ;; *) width=640 ;; esac
  mkdir -p "thumbs/$dir"
  for src in "$dir"/*.jpg; do
    out="thumbs/$src"
    sips --resampleWidth "$width" -s formatOptions 70 "$src" --out "$out" >/dev/null
  done
done
du -sh thumbs
