/*
 * Dữ liệu sản phẩm STUDIO INK.
 * Sửa tên, giá, ảnh, chỉ số tại đây – trang tự cập nhật theo.
 */
window.SK_DATA = {
  shop: {
    name: 'STUDIO INK',
    // Đơn đặt hàng từ ô "Đặt hàng" được FormSubmit (formsubmit.co) chuyển về địa chỉ này
    orderEmail: 'hoangson7423@gmail.com',
  },
  firmnessScale: ['XSoft', 'Soft-XSoft', 'Soft', 'Soft-Mid', 'Mid'],

  lines: [
    {
      id: 'glass',
      name: 'GLASS',
      fullName: 'Lót chuột kính',
      tagline: 'Glass surface',
      surface: 'Mặt kính cường lực',
      base: null, // loại đế – đang cập nhật
      headline: 'Lót chuột kính',
      desc: 'Mặt kính cường lực, lướt nhanh và dễ lau chùi. Thông số chi tiết đang được cập nhật – liên hệ shop để được tư vấn.',
      pros: [],
      stats: null,
      play: null,
    },
    {
      id: 'poron',
      name: 'PORON',
      fullName: 'Lót chuột PORON',
      tagline: 'Balanced Control',
      texture: 'assets/textures/poron.jpg',
      surface: 'Fabric surface',
      base: 'PORON',
      headline: 'Cân bằng & tối ưu đế PORON',
      desc: 'Dòng cân bằng toàn diện, bề mặt đủ kiểm soát nhưng vẫn mượt. Đế PORON cao cấp mềm, bám tốt và tối ưu cảm giác khi tì tay.',
      pros: ['Cảm giác mềm – êm – ổn định', 'Kiểm soát tốt, dễ làm quen', 'Phù hợp nhiều phong cách chơi'],
      stats: { control: 4, smoothness: 3, consistency: 4, firmness: 2, vibrancy: 4 },
      play: { tracking: 4, flicking: 3.5, micro: 4, static: 4 },
    },
    {
      id: '99g',
      name: '99G',
      fullName: 'Lót chuột 99G',
      tagline: 'Lightweight & Accuracy',
      texture: 'assets/textures/99g.jpg',
      surface: 'Composite fiber surface',
      base: 'Cao su',
      headline: 'Nhẹ & chính xác',
      desc: 'Bề mặt sợi tổng hợp nhẹ, cho cảm giác tiếp xúc nhanh và chính xác. Tối ưu cho việc định điểm và kiểm soát vi điều chỉnh.',
      pros: ['Nhẹ, bắt chuột tốt', 'Độ chính xác cao', 'Hợp game yêu cầu aim chuẩn'],
      stats: { control: 4, smoothness: 3, consistency: 4, firmness: 3, vibrancy: 4 },
      play: { tracking: 4, flicking: 2.5, micro: 5, static: 4 },
    },
    {
      id: 'zero',
      name: 'ZERO',
      fullName: 'Lót chuột ZERO',
      tagline: 'Balanced (No Poron)',
      texture: 'assets/textures/zero.jpg',
      surface: 'Fabric surface',
      base: 'Cao su',
      headline: 'Giống PORON nhưng không có đế PORON',
      desc: 'Cảm giác bề mặt tương tự PORON, thiên về cân bằng giữa tốc độ và kiểm soát nhưng sử dụng đế cao su thông thường.',
      pros: ['Cân bằng – dễ sử dụng', 'Giá dễ tiếp cận hơn PORON', 'Phù hợp người thích sự ổn định'],
      stats: { control: 4, smoothness: 3, consistency: 4, firmness: 3, vibrancy: 4 },
      play: { tracking: 4, flicking: 3, micro: 4, static: 4 },
    },
    {
      id: 'rush',
      name: 'RUSH',
      fullName: 'Lót chuột RUSH',
      tagline: 'Speed / Smooth',
      texture: 'assets/textures/rush.jpg',
      surface: 'Microfiber surface',
      base: 'Cao su',
      headline: 'Thiên về speed',
      desc: 'Bề mặt microfiber siêu mịn, chuột lướt rất nhanh và mượt. Tối ưu cho flick, tracking tốc độ cao và chuyển mục tiêu nhanh.',
      pros: ['Tốc độ vượt trội', 'Flick nhanh – thoát chuột tốt', 'Hợp người chơi thích tốc độ'],
      stats: { control: 3, smoothness: 5, consistency: 3, firmness: 3, vibrancy: 5 },
      play: { tracking: 3, flicking: 5, micro: 4, static: 3 },
    },
    {
      id: 'tactile',
      name: 'TACTILE',
      fullName: 'Lót chuột TACTILE',
      tagline: 'Control / Tactile',
      texture: 'assets/textures/tactile.jpg',
      surface: 'Fabric surface',
      base: 'Cao su',
      headline: 'Thiên về control',
      desc: 'Bề mặt vải dệt thô, tạo ma sát cao, cho khả năng dừng chuột mạnh và kiểm soát tối đa trong các tình huống cần độ chính xác.',
      pros: ['Kiểm soát mạnh – dừng tốt', 'Phù hợp aim tĩnh, giữ tâm', 'Hợp người chơi thích cảm giác Control'],
      stats: { control: 5, smoothness: 2, consistency: 3, firmness: 4, vibrancy: 3 },
      play: { tracking: 5, flicking: 2, micro: 4, static: 5 },
    },
  ],

  /*
   * Các kích thước pad. cm: [rộng, cao] – dùng cho tỉ lệ ảnh và độ to nhỏ của tấm pad trên giá treo.
   * prices: giá bán (đồng/cái) theo dòng pad – dòng nào có giá thì mới bán ở cỡ đó.
   * Bảng so sánh mô tả các dòng pad vải, chỉ có ở cỡ 45 × 40 cm.
   */
  sizes: [
    { id: '35x30', size: '35 × 30 cm', cm: [35, 30], prices: { glass: 250000 } },
    {
      id: '45x40',
      size: '45 × 40 cm',
      cm: [45, 40],
      thickness: '5 mm', // của các dòng pad vải
      prices: { poron: 390000, glass: 390000, '99g': 199000, zero: 199000, rush: 199000, tactile: 199000 },
    },
    { id: '80x30', size: '80 × 30 cm', cm: [80, 30], prices: { glass: 599000 } },
    { id: '90x40', size: '90 × 40 cm', cm: [90, 40], prices: { glass: 799000 } },
  ],

  // Danh mục sản phẩm; khách chọn kích thước cụ thể khi bấm vào một mẫu
  categories: [
    { id: 'medium', title: 'Size vừa', sizes: ['35x30', '45x40'] },
    { id: 'large', title: 'Size lớn', sizes: ['80x30', '90x40'] },
  ],

  // Ảnh mẫu dùng tạm (lacdau.com). Đổi ảnh: thay file cùng tên trong các thư mục assets/pads….
  // format: kích thước của ảnh gốc – dùng khi treo trên giá và trong danh sách;
  // khi xem chi tiết, khung ảnh đổi theo kích thước khách chọn.
  designs: [
    ...Array.from({ length: 20 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return { category: 'medium', format: '45x40', collection: 'Honkai: Star Rail', name: `HSR #${n}`, image: `assets/pads/pad-${n}.jpg` };
    }),
    ...Array.from({ length: 20 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return { category: 'large', format: '80x30', collection: 'Hatsune Miku', name: `MIKU #${n}`, image: `assets/pads-80x30/miku-${n}.jpg` };
    }),
    ...Array.from({ length: 6 }, (_, i) => ({
      category: 'large', format: '90x40', collection: 'Yuki Aim', name: `YUKI #${i + 11}`, image: `assets/pads-90x40/yuki-${i + 11}.jpg`,
    })),
  ],
};
