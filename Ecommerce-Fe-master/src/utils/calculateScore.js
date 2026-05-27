// ============================================================
// Hàm chuyển đổi chuỗi ổ cứng thành dung lượng thực (GB)
// Fix: Dùng regex chuẩn, chỉ bắt số đứng trước GB/TB
// Tránh bắt nhầm số thứ tự PCIe/Gen (VD: "Gen 4 512GB" → 512 chứ không phải 4)
// ============================================================
export const getStorageValue = (storageStr) => {
  const str = (storageStr || "").toString().toLowerCase();
  const match = str.match(/(\d+(?:\.\d+)?)\s*(tb|gb)/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2];
  return unit === "tb" ? val * 1024 : val;
};

// ============================================================
// Hàm tính điểm tổng thể của một sản phẩm laptop (Max 19 điểm)
// Fix: Bổ sung GPU (4đ), Màn hình (3đ), Ổ cứng (2đ) còn thiếu
// Cập nhật bảng điểm CPU với đầy đủ tier chip Apple M-series
// ============================================================
export const calculateScore = (product) => {
  let score = 0;
  if (!product || !product.specs) return score;

  const specs = product.specs;

  // --- CPU (Max 5 điểm) ---
  const cpu = (specs.cpu || "").toLowerCase();
  if (
    cpu.includes("i9") ||
    cpu.includes("ryzen 9") ||
    cpu.includes("m3 max") ||
    cpu.includes("m2 max") ||
    cpu.includes("m1 max") ||
    cpu.includes("m1 ultra") ||
    cpu.includes("core ultra 9")
  ) {
    score += 5;
  } else if (
    cpu.includes("i7") ||
    cpu.includes("ryzen 7") ||
    cpu.includes("m3 pro") ||
    cpu.includes("m2 pro") ||
    cpu.includes("m1 pro") ||
    cpu.includes("core ultra 7")
  ) {
    score += 4;
  } else if (
    cpu.includes("i5") ||
    cpu.includes("ryzen 5") ||
    cpu.includes("m3") ||
    cpu.includes("m2") ||
    cpu.includes("m1") ||
    cpu.includes("core ultra 5")
  ) {
    score += 3;
  } else if (cpu.includes("i3") || cpu.includes("ryzen 3")) {
    score += 2;
  } else {
    score += 1; // Celeron, Pentium, N-series, v.v.
  }

  // --- GPU (Max 4 điểm) ---
  const gpu = (specs.graphicCard || "").toLowerCase();
  if (gpu.includes("rtx 40") || gpu.includes("rx 7")) {
    score += 4;
  } else if (gpu.includes("rtx 30") || gpu.includes("rx 6")) {
    score += 3;
  } else if (gpu.includes("rtx") || gpu.includes("gtx 16") || gpu.includes("arc")) {
    score += 2;
  } else if (gpu.includes("gtx") || gpu.includes("mx")) {
    score += 1;
  }
  // Card tích hợp (Intel UHD, AMD Radeon onboard, Apple GPU) → 0 điểm riêng (đã phản ánh qua CPU)

  // --- RAM (Max 3 điểm) ---
  const ram = parseFloat(specs.ram) || 0;
  if (ram >= 32) score += 3;
  else if (ram >= 16) score += 2;
  else if (ram >= 8) score += 1;

  // --- Ổ cứng / Storage (Max 2 điểm) ---
  const storage = getStorageValue(specs.storage);
  if (storage >= 1024) score += 2;      // >= 1TB
  else if (storage >= 512) score += 1;  // >= 512GB

  // --- Màn hình / Screen (Max 3 điểm) ---
  const screen = (specs.screen || "").toLowerCase();
  let screenScore = 0;
  if (screen.includes("oled") || screen.includes("mini led")) screenScore += 1;
  if (screen.includes("4k") || screen.includes("uhd")) screenScore += 1;
  else if (screen.includes("2k") || screen.includes("qhd") || screen.includes("wqhd")) screenScore += 1;
  if (
    screen.includes("144hz") ||
    screen.includes("165hz") ||
    screen.includes("240hz") ||
    screen.includes("120hz")
  )
    screenScore += 1;
  score += Math.min(screenScore, 3);

  // --- Cân nặng / Weight (Max 2 điểm) - Nhẹ hơn có lợi thế ---
  const weight = parseFloat(specs.weight) || 0;
  if (weight > 0 && weight <= 1.5) score += 2;
  else if (weight > 1.5 && weight <= 2.2) score += 1;

  return score; // Max 19 điểm
};

// --- Hàm tính điểm CPU dùng để so sánh đối đầu trực tiếp ---
export const getCpuScore = (cpu) => {
  let score = 0;
  // Tier S+ (Chip đầu bảng)
  if (
    cpu.includes("i9") ||
    cpu.includes("ryzen 9") ||
    cpu.includes("m3 max") ||
    cpu.includes("m2 max") ||
    cpu.includes("m1 max") ||
    cpu.includes("m1 ultra") ||
    cpu.includes("core ultra 9")
  ) {
    score += 50;
  }
  // Tier A (Chip cao cấp)
  else if (
    cpu.includes("i7") ||
    cpu.includes("ryzen 7") ||
    cpu.includes("m3 pro") ||
    cpu.includes("m2 pro") ||
    cpu.includes("m1 pro") ||
    cpu.includes("core ultra 7")
  ) {
    score += 40;
  }
  // Tier B (Chip tầm trung)
  else if (
    cpu.includes("i5") ||
    cpu.includes("ryzen 5") ||
    cpu.includes("m3") ||
    cpu.includes("m2") ||
    cpu.includes("m1") ||
    cpu.includes("core ultra 5")
  ) {
    score += 30;
  }
  // Tier C (Chip phổ thông)
  else if (cpu.includes("i3") || cpu.includes("ryzen 3")) {
    score += 20;
  }

  // Hậu tố dòng chip (tác động hiệu năng)
  if (cpu.includes("hx") || cpu.includes(" hk")) score += 5; // Dòng HX/HK: cao nhất
  else if (cpu.includes(" h")) score += 4;                    // Dòng H: gaming/workstation
  else if (cpu.includes(" p")) score += 3;                    // Dòng P: cân bằng
  else if (cpu.includes(" u")) score += 2;                    // Dòng U: tiết kiệm pin

  return score;
};

// --- Hàm tính điểm GPU dùng để so sánh đối đầu trực tiếp ---
export const getGpuScore = (gpu) => {
  if (gpu.includes("rtx 40") || gpu.includes("rx 7")) return 60;
  if (gpu.includes("rtx 30") || gpu.includes("rx 6")) return 50;
  if (gpu.includes("rtx") || gpu.includes("gtx 16") || gpu.includes("arc")) return 35;
  if (gpu.includes("gtx") || gpu.includes("mx")) return 20;
  return 5; // Card tích hợp
};

// --- Hàm tính điểm Màn hình dùng để so sánh đối đầu trực tiếp ---
export const getScreenScore = (scr) => {
  let score = 0;
  if (scr.includes("oled") || scr.includes("mini led")) score += 20;
  if (scr.includes("4k") || scr.includes("uhd")) score += 20;
  else if (scr.includes("2k") || scr.includes("wqhd") || scr.includes("qhd")) score += 15;
  if (scr.includes("240hz")) score += 15;
  else if (scr.includes("165hz") || scr.includes("144hz")) score += 10;
  else if (scr.includes("120hz")) score += 5;
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
  const price1 = item1.promotion || item1.price || 0;
  const price2 = item2.promotion || item2.price || 0;

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
  // Ưu tiên 1: calculateScore mới (6 tiêu chí, 19 điểm) — thước đo toàn diện nhất
  // Ưu tiên 2: points (đối đầu trực tiếp từng tiêu chí)  — tie-breaker khi điểm bằng nhau
  // Ưu tiên 3: Giá rẻ hơn                                — cùng điểm thì tính giá trị tiền
  // -------------------------------------------------------
  const totalScore1 = calculateScore(item1);
  const totalScore2 = calculateScore(item2);

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
      // Vẫn hoà → ưu tiên máy rẻ hơn (tính giá trị đồng tiền)
      if (price1 < price2) winner = 1;
      else if (price2 < price1) winner = 2;
      else winner = 1; // Hoà hoàn toàn → ưu tiên máy 1
    }
  }

  const winnerItem = winner === 1 ? item1 : item2;
  const loserItem  = winner === 1 ? item2 : item1;
  const winnerAdv  = winner === 1 ? advantages1 : advantages2;
  const loserAdv   = winner === 1 ? advantages2 : advantages1;
  const winnerPoints = winner === 1 ? points1 : points2;
  const winnerPrice  = winner === 1 ? price1 : price2;
  const loserPrice   = winner === 1 ? price2 : price1;

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

  if (winnerPrice < loserPrice) {
    advice += `Đặc biệt, với mức giá lại còn rẻ hơn, đây đích thị là một món hời công nghệ!`;
  } else if (winnerPrice > loserPrice) {
    advice += `Dù mức giá cao hơn một chút, nhưng với sự chênh lệch cấu hình toàn diện như vậy, số tiền bạn đầu tư thêm là cực kỳ xứng đáng.`;
  } else {
    advice += `Với cùng một mức giá, rõ ràng sự lựa chọn này mang lại giá trị cao hơn hẳn.`;
  }

  return `🎯 Lời khuyên: Chắc chắn bạn nên chọn mua **${winnerItem.title}**.|${advice}`;
};
