export const calculateScore = (product) => {
  let score = 0;
  if (!product || !product.specs) return score;

  // Điểm RAM
  const ram = parseFloat(product.specs.ram) || 0;
  if (ram >= 16) score += 3;
  else if (ram >= 8) score += 2;
  else score += 1;

  // Điểm Cân nặng (Nhẹ hơn thì điểm cao hơn)
  const weight = parseFloat(product.specs.weight) || 0;
  if (weight > 0 && weight <= 1.5) score += 3;
  else if (weight > 1.5 && weight <= 2.0) score += 2;
  else if (weight > 2.0) score += 1;

  // Điểm CPU
  const cpu = product.specs.cpu || "";
  if (
    cpu.includes("i9") ||
    cpu.includes("i7") ||
    cpu.includes("Ryzen 7") ||
    cpu.includes("Ryzen 9") ||
    cpu.includes("M2") ||
    cpu.includes("M3")
  ) {
    score += 4;
  } else if (
    cpu.includes("i5") ||
    cpu.includes("Ryzen 5") ||
    cpu.includes("M1")
  ) {
    score += 2;
  } else {
    score += 1;
  }

  return score; // Max 10 điểm
};

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
  const getCpuScore = (cpu) => {
    let score = 0;
    if (cpu.includes("i9") || cpu.includes("ryzen 9") || cpu.includes("m3 max")) score += 50;
    else if (cpu.includes("i7") || cpu.includes("ryzen 7") || cpu.includes("m2 pro") || cpu.includes("m3 pro")) score += 40;
    else if (cpu.includes("i5") || cpu.includes("ryzen 5") || cpu.includes("m1") || cpu.includes("m2") || cpu.includes("m3")) score += 30;
    else if (cpu.includes("i3") || cpu.includes("ryzen 3")) score += 20;
    
    // Hậu tố chip
    if (cpu.includes(" h") || cpu.includes("hx")) score += 5; // Dòng H hiệu năng cao
    if (cpu.includes(" u") || cpu.includes(" p")) score += 2; // Dòng tiết kiệm pin
    return score;
  };
  if (getCpuScore(cpu1) > getCpuScore(cpu2)) { points1++; advantages1.push("CPU mạnh mẽ hơn"); }
  else if (getCpuScore(cpu2) > getCpuScore(cpu1)) { points2++; advantages2.push("CPU mạnh mẽ hơn"); }

  // 2. So sánh RAM
  const ram1 = parseFloat(specs1.ram) || 0;
  const ram2 = parseFloat(specs2.ram) || 0;
  if (ram1 > ram2) { points1++; advantages1.push(`RAM lớn hơn (${ram1}GB)`); }
  else if (ram2 > ram1) { points2++; advantages2.push(`RAM lớn hơn (${ram2}GB)`); }

  // 3. So sánh Card đồ hoạ (GPU)
  const gpu1 = (specs1.graphicCard || "").toLowerCase();
  const gpu2 = (specs2.graphicCard || "").toLowerCase();
  const getGpuScore = (gpu) => {
    let score = 0;
    if (gpu.includes("rtx 40")) score += 50;
    else if (gpu.includes("rtx 30")) score += 40;
    else if (gpu.includes("rtx") || gpu.includes("rx 6") || gpu.includes("rx 7")) score += 30;
    else if (gpu.includes("gtx")) score += 20;
    else if (gpu.includes("mx") || gpu.includes("arc")) score += 10;
    else score += 5; // Onboard
    return score;
  };
  if (getGpuScore(gpu1) > getGpuScore(gpu2)) { points1++; advantages1.push("Card đồ hoạ xịn hơn"); }
  else if (getGpuScore(gpu2) > getGpuScore(gpu1)) { points2++; advantages2.push("Card đồ hoạ xịn hơn"); }

  // 4. So sánh Màn hình (Screen)
  const screen1 = (specs1.screen || "").toLowerCase();
  const screen2 = (specs2.screen || "").toLowerCase();
  const getScreenScore = (scr) => {
    let score = 0;
    if (scr.includes("oled") || scr.includes("mini led")) score += 20;
    if (scr.includes("144hz") || scr.includes("165hz") || scr.includes("240hz")) score += 10;
    if (scr.includes("2k") || scr.includes("wqhd") || scr.includes("qhd")) score += 15;
    if (scr.includes("4k") || scr.includes("uhd")) score += 20;
    return score;
  };
  if (getScreenScore(screen1) > getScreenScore(screen2)) { points1++; advantages1.push("Màn hình hiển thị đẹp/mượt hơn"); }
  else if (getScreenScore(screen2) > getScreenScore(screen1)) { points2++; advantages2.push("Màn hình hiển thị đẹp/mượt hơn"); }

  // 5. So sánh Trọng lượng (Weight - Nhẹ hơn là lợi thế)
  const weight1 = parseFloat(specs1.weight) || 0;
  const weight2 = parseFloat(specs2.weight) || 0;
  if (weight1 > 0 && weight2 > 0) {
    if (weight2 - weight1 >= 0.2) { points1++; advantages1.push(`Mỏng nhẹ hơn (${weight1}kg)`); }
    else if (weight1 - weight2 >= 0.2) { points2++; advantages2.push(`Mỏng nhẹ hơn (${weight2}kg)`); }
  }

  // Quyết định Winner
  let winner = 0;
  if (points1 > points2) winner = 1;
  else if (points2 > points1) winner = 2;
  else {
    if (price1 < price2) winner = 1;
    else if (price2 < price1) winner = 2;
    else winner = 1; // Hoà toàn tập thì ưu tiên máy 1
  }

  const winnerItem = winner === 1 ? item1 : item2;
  const loserItem = winner === 1 ? item2 : item1;
  const winnerPoints = winner === 1 ? points1 : points2;
  const winnerAdv = winner === 1 ? advantages1 : advantages2;
  const loserAdv = winner === 1 ? advantages2 : advantages1;
  const winnerPrice = winner === 1 ? price1 : price2;
  const loserPrice = winner === 1 ? price2 : price1;

  let advice = ``;
  
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
