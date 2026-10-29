"""
Tạo assets/logo-mono.png (logo đen trên nền trong suốt) từ assets/logo.png.

Logo gốc là chữ vàng trên nền xám đậm. Độ "vàng" của mỗi điểm ảnh (đỏ trừ xanh dương)
cho biết lớp vàng phủ dày hay mỏng: chữ chính thành đen đặc, bóng chữ mờ phía sau thành
xám nhạt, nền xám biến mất.

Chạy lại sau khi đổi logo:  python3 tools/logo_mono.py
Chỉ dùng thư viện chuẩn của Python.
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'logo.png')
OUT = os.path.join(ROOT, 'assets', 'logo-mono.png')
INK = (17, 17, 17)     # màu mực, khớp --ink trong css/style.css
FULL_GOLD = 165        # đỏ trừ xanh dương của vàng đặc


def read_png(path):
    """Giải mã PNG 8-bit không interlace (RGB/RGBA/xám) thành danh sách hàng pixel."""
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('không phải file PNG')
    pos, idat = 8, b''
    while pos < len(data):
        length, = struct.unpack('>I', data[pos:pos + 4])
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b'IHDR':
            width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', body)
        elif kind == b'IDAT':
            idat += body
        elif kind == b'IEND':
            break
    if depth != 8 or interlace:
        raise ValueError('chỉ hỗ trợ PNG 8-bit, không interlace')
    bpp = {0: 1, 2: 3, 4: 2, 6: 4}[color]
    raw = zlib.decompress(idat)
    stride = width * bpp
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(height):
        filt = raw[i]
        i += 1
        line = bytearray(raw[i:i + stride])
        i += stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if filt == 1:
                line[x] = (line[x] + a) & 255
            elif filt == 2:
                line[x] = (line[x] + b) & 255
            elif filt == 3:
                line[x] = (line[x] + ((a + b) >> 1)) & 255
            elif filt == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line)
        prev = line
    return width, height, bpp, rows


def write_png(path, width, height, rgba_rows):
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xFFFFFFFF)
    raw = b''.join(b'\x00' + bytes(row) for row in rgba_rows)
    with open(path, 'wb') as fh:
        fh.write(b'\x89PNG\r\n\x1a\n')
        fh.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)))
        fh.write(chunk(b'IDAT', zlib.compress(raw, 9)))
        fh.write(chunk(b'IEND', b''))


def main():
    width, height, bpp, rows = read_png(SRC)
    if bpp < 3:
        raise ValueError('logo cần là ảnh màu')
    alphas = []
    for row in rows:
        alphas.append([max(0, min(255, round((row[x * bpp] - row[x * bpp + 2]) * 255 / FULL_GOLD)))
                       for x in range(width)])

    # Cắt sát phần có hình (bỏ khoảng trống của ô vuông logo gốc), chừa 1 px
    ys = [y for y in range(height) if max(alphas[y]) > 10]
    xs = [x for x in range(width) if any(alphas[y][x] > 10 for y in ys)]
    x0, x1 = max(0, xs[0] - 1), min(width, xs[-1] + 2)
    y0, y1 = max(0, ys[0] - 1), min(height, ys[-1] + 2)

    out = []
    for y in range(y0, y1):
        line = bytearray()
        for x in range(x0, x1):
            line += bytes(INK) + bytes([alphas[y][x]])
        out.append(line)
    write_png(OUT, x1 - x0, y1 - y0, out)
    print('%s: %d×%d' % (os.path.relpath(OUT, ROOT), x1 - x0, y1 - y0))


if __name__ == '__main__':
    main()
