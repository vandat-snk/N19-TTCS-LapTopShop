// ============================================================
// Hàm chuyển đổi chuỗi ổ cứng thành dung lượng thực (GB)
// Fix: Dùng regex chuẩn, chỉ bắt số đứng trước GB/TB
// Tránh bắt nhầm số thứ tự PCIe/Gen (VD: "Gen 4 512GB" → 512 chứ không phải 4)
// ============================================================
export const getStorageValue = (storageStr) => {
  const str = (storageStr || "").toString().toLowerCase();
  const matches = [...str.matchAll(/(\d+(?:\.\d+)?)\s*(tb|gb)\b/g)];

  if (matches.length > 0) {
    return Math.max(
      ...matches.map((match) => {
        const val = parseFloat(match[1]);
        return match[2] === "tb" ? val * 1024 : val;
      })
    );
  }

  const fallback = str.match(/\d+(?:\.\d+)?/);
  if (!fallback) return 0;

  const val = parseFloat(fallback[0]);
  return val < 10 ? val * 1024 : val;
};

export const MAX_RECOMMENDATION_SCORE = 10;

const normalizeText = (value) => (value || "").toString().toLowerCase();

const getRamValue = (ramStr) => {
  const match = normalizeText(ramStr).match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
};

// ============================================================
// Hàm tính điểm đối đầu giữa 2 laptop.
// Tiêu chí nào hơn đối thủ thì cộng điểm ưu tiên, sau đó quy đổi về thang 10.
// ============================================================
export const calculateScore = (product, comparedProduct) => {
  if (!product || !product.specs) return 0;

  if (!comparedProduct || !comparedProduct.specs) return 0;

  const specs = product.specs;
  const otherSpecs = comparedProduct.specs;
  let score = 0;

  if (getCpuScore(specs.cpu) > getCpuScore(otherSpecs.cpu)) score += 2;
  if (getGpuScore(specs.graphicCard) > getGpuScore(otherSpecs.graphicCard)) score += 2;
  if (getRamValue(specs.ram) > getRamValue(otherSpecs.ram)) score += 1.5;
  if (getStorageValue(specs.storage) > getStorageValue(otherSpecs.storage)) score += 2;
  if (getScreenScore(specs.screen) > getScreenScore(otherSpecs.screen)) score += 1.5;

  const weight = parseFloat(specs.weight) || 0;
  const otherWeight = parseFloat(otherSpecs.weight) || 0;
  if (weight > 0 && otherWeight > 0 && weight < otherWeight) score += 1;

  return Math.round(score);
};

// --- Hàm tính điểm CPU dùng để so sánh đối đầu trực tiếp ---
export const getCpuScore = (cpu) => {
  const text = normalizeText(cpu);
  if (!text) return 0;

  let score = 0;
  if (/i9|ryzen\s*9|ultra\s*9|m[1-4]\s*(max|ultra)/.test(text)) score = 4;
  else if (/i7|ryzen\s*7|ultra\s*7|m[1-4]\s*pro/.test(text)) score = 3;
  else if (/i5|ryzen\s*5|ultra\s*5|\bm[1-4]\b/.test(text)) score = 2;
  else if (/i3|ryzen\s*3/.test(text)) score = 1;

  if (/\d{4,5}/.test(text)) score += 0.5;
  if (/\b(h|hs|hx|hk)\b|\d(h|hs|hx|hk)\b/.test(text)) score += 0.5;

  return score;
};

// --- Hàm tính điểm GPU dùng để so sánh đối đầu trực tiếp ---
export const getGpuScore = (gpu) => {
  const text = normalizeText(gpu);
  if (!text) return 0;

  if (/rtx\s*40|rx\s*7/.test(text)) return 5;
  if (/rtx\s*30|rx\s*6/.test(text)) return 4;
  if (/rtx|gtx\s*16|arc/.test(text)) return 3;
  if (/gtx|mx/.test(text)) return 2;
  if (/iris|uhd|vega|radeon|integrated|onboard|apple/.test(text)) return 1;
  return 0;
};

// --- Hàm tính điểm Màn hình dùng để so sánh đối đầu trực tiếp ---
export const getScreenScore = (scr) => {
  const screen = normalizeText(scr);
  if (!screen) return 0;

  let score = 0;
  if (screen.includes("oled") || screen.includes("mini led")) score += 3;
  if (screen.includes("4k") || screen.includes("uhd")) score += 3;
  else if (screen.includes("2k") || screen.includes("qhd") || screen.includes("wqhd")) score += 2;
  else if (screen.includes("fhd") || screen.includes("full hd")) score += 1;
  if (screen.includes("144hz") || screen.includes("165hz") || screen.includes("240hz") || screen.includes("120hz")) score += 1;
  return score;
};

// ============================================================
// Hàm sinh lời khuyên tư vấn so sánh 2 laptop
// Fix: getCpuScore bổ sung đầy đủ tier chip Apple M-series còn thiếu
// Winner được quyết định bởi calculateScore mới (6 tiêu chí) → nhất quán
// ============================================================
export const generateRealLifeSuggestion = (item1, item2) => {
  if (!item1 || !item2) return "";

  const specs1 = item1.specs || {};
  const specs2 = item2.specs || {};

  let points1 = 0;
  let points2 = 0;
  const advantages1 = [];
  const advantages2 = [];



  // 1. So sánh CPU
  const cpu1 = (specs1.cpu || "").toLowerCase();
  const cpu2 = (specs2.cpu || "").toLowerCase();
  if (getCpuScore(cpu1) > getCpuScore(cpu2)) {
    points1++;
    advantages1.push("CPU mạnh mẽ hơn");
  } else if (getCpuScore(cpu2) > getCpuScore(cpu1)) {
    points2++;
    advantages2.push("CPU mạnh mẽ hơn");
  }

  // 2. So sánh RAM
  const ram1 = parseFloat(specs1.ram) || 0;
  const ram2 = parseFloat(specs2.ram) || 0;
  if (ram1 > ram2) {
    points1++;
    advantages1.push(`RAM lớn hơn (${ram1}GB)`);
  } else if (ram2 > ram1) {
    points2++;
    advantages2.push(`RAM lớn hơn (${ram2}GB)`);
  }

  // 3. So sánh Ổ cứng
  const storage1 = getStorageValue(specs1.storage);
  const storage2 = getStorageValue(specs2.storage);
  if (storage1 > storage2) {
    points1++;
    advantages1.push(`Ổ cứng lớn hơn (${specs1.storage})`);
  } else if (storage2 > storage1) {
    points2++;
    advantages2.push(`Ổ cứng lớn hơn (${specs2.storage})`);
  }

  // 4. So sánh GPU
  const gpu1 = (specs1.graphicCard || "").toLowerCase();
  const gpu2 = (specs2.graphicCard || "").toLowerCase();
  if (getGpuScore(gpu1) > getGpuScore(gpu2)) {
    points1++;
    advantages1.push("Card đồ hoạ xịn hơn");
  } else if (getGpuScore(gpu2) > getGpuScore(gpu1)) {
    points2++;
    advantages2.push("Card đồ hoạ xịn hơn");
  }

  // 5. So sánh Màn hình
  const screen1 = (specs1.screen || "").toLowerCase();
  const screen2 = (specs2.screen || "").toLowerCase();
  if (getScreenScore(screen1) > getScreenScore(screen2)) {
    points1++;
    advantages1.push("Màn hình hiển thị đẹp/mượt hơn");
  } else if (getScreenScore(screen2) > getScreenScore(screen1)) {
    points2++;
    advantages2.push("Màn hình hiển thị đẹp/mượt hơn");
  }

  // 6. So sánh Trọng lượng (chênh lệch ít nhất 0.2kg mới tính)
  const weight1 = parseFloat(specs1.weight) || 0;
  const weight2 = parseFloat(specs2.weight) || 0;
  if (weight1 > 0 && weight2 > 0) {
    if (weight2 - weight1 >= 0.2) {
      points1++;
      advantages1.push(`Mỏng nhẹ hơn (${weight1}kg)`);
    } else if (weight1 - weight2 >= 0.2) {
      points2++;
      advantages2.push(`Mỏng nhẹ hơn (${weight2}kg)`);
    }
  }

  // -------------------------------------------------------
  // Quyết định Winner
  // Ưu tiên 1: calculateScore mới (6 tiêu chí, 10 điểm) — thước đo toàn diện nhất
  // Ưu tiên 2: points (đối đầu trực tiếp từng tiêu chí)  — tie-breaker khi điểm bằng nhau
  // Ưu tiên 3: Vẫn hòa thì giữ sản phẩm 1
  // -------------------------------------------------------
  const totalScore1 = calculateScore(item1, item2);
  const totalScore2 = calculateScore(item2, item1);

  let winner = 0;
  if (totalScore1 > totalScore2) {
    winner = 1;
  } else if (totalScore2 > totalScore1) {
    winner = 2;
  } else {
    // Điểm tổng bằng nhau → dùng điểm đối đầu trực tiếp
    if (points1 > points2) winner = 1;
    else if (points2 > points1) winner = 2;
    else {
      winner = 1;
    }
  }

  const winnerItem = winner === 1 ? item1 : item2;
  const loserItem = winner === 1 ? item2 : item1;
  const winnerAdv = winner === 1 ? advantages1 : advantages2;
  const loserAdv = winner === 1 ? advantages2 : advantages1;
  const winnerPoints = winner === 1 ? points1 : points2;

  // --- Build lời khuyên ---
  let advice = "";

  if (winnerPoints > 0) {
    advice += `Lý do lớn nhất là chiếc máy này áp đảo ở ${winnerPoints} tiêu chí quan trọng: ${winnerAdv.join(", ")}. `;
  } else {
    advice += `Lý do lớn nhất là chiếc máy này có cấu hình tương đương nhưng độ hoàn thiện tổng thể được đánh giá cao hơn. `;
  }

  if (loserAdv.length > 0) {
    advice += `Mặc dù ${loserItem.title} có ưu điểm về ${loserAdv.join(", ")}, nhưng xét tổng thể toàn bộ thông số thì ${winnerItem.title} vẫn vượt trội hơn. `;
  }

  advice += `Điểm gợi ý chỉ dựa trên 6 tiêu chí cấu hình chính, không cộng điểm cho giá, màu sắc, hệ điều hành, pin, nhu cầu hay thương hiệu.`;

  return `🎯 Lời khuyên:Bạn nên chọn mua **${winnerItem.title}**.|${advice}`;
};
