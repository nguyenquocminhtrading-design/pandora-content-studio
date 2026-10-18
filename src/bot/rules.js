const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();

export function matchRule(text, bot) {
  const value = normalize(text);
  if (/^(xin chao|chao|hello|hi|alo)\b/.test(value)) return 'Xin chào! Mình có thể hỗ trợ bạn về sản phẩm, giá, địa chỉ và giờ làm việc.';
  if (/(gia|bao nhieu tien|bao gia|price)/.test(value)) return bot.priceInfo;
  if (/(dia chi|o dau|address|chi nhanh)/.test(value)) return bot.address;
  if (/(gio lam|mo cua|dong cua|thoi gian)/.test(value)) return bot.businessHours;
  if (/(san pham|dich vu|tu van|thong tin)/.test(value)) return bot.productInfo;
  if (/(nhan vien|tu van vien|nguoi that|goi lai|lien he)/.test(value)) return bot.humanContact;
  return null;
}
