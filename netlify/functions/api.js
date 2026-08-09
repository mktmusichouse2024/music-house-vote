const DEFAULT_TEACHERS = [
  { id: "t_13367wc", name: "ĐÀN GÀ CON", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-dan_ga_con.png", votesCount: 805, viewsCount: 1520 },
  { id: "t_28819ab", name: "Twinkle Twinkle", subject: "TIẾT MỤC XUẤT SẮC NHẤT", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-twinkle.png", votesCount: 0, viewsCount: 450 },
  { id: "t_39921cd", name: "Mười chàng thổ dân", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-muoi_chang_tho_dan.png", votesCount: 0, viewsCount: 380 },
  { id: "t_41102ef", name: "Trang trại của bác Macdonal", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-macdonal.png", votesCount: 1, viewsCount: 290 },
  { id: "t_52291gh", name: "Fur Elise", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-fur_elise.png", votesCount: 5, viewsCount: 610 },
  { id: "t_63381ij", name: "Chú chim Alouette", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-alouette.png", votesCount: 0, viewsCount: 180 },
  { id: "t_74471kl", name: "Spring", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-spring.png", votesCount: 0, viewsCount: 210 },
  { id: "t_85561mn", name: "Ballde Poud Adeline", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-adeline.png", votesCount: 0, viewsCount: 150 }
];

let votesMemory = new Map();

exports.handler = async (event) => {
  const path = event.path || "";
  
  if (path.includes("teachers")) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      },
      body: JSON.stringify({
        teachers: DEFAULT_TEACHERS,
        votingEnabled: true,
        config: {
          votingEnabled: true,
          maxVotesPerCategory: 3,
          maxVotesPerDevice: 3,
          programName: "TIẾT MỤC XUẤT SẮC NHẤT",
          candidateTerm: "TIẾT MỤC",
          subjectTerm: "Bộ môn / Thể loại",
          pageTitle: 'CỔNG BÌNH CHỌN "NHỮNG NOTE NHẠC BLUE"'
        },
        totalPageViews: 2350,
        activeOnline: 5
      })
    };
  }

  if (path.includes("login")) {
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch(e) {}
    const password = body.password;
    if (password === "Phongmktmusichouse") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true, token: "admin_token_Phongmktmusichouse_2026" })
      };
    }
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, message: "Mật khẩu PIN Admin không chính xác!" })
    };
  }

  if (path.includes("vote")) {
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch(e) {}
    const { teacherId, deviceId } = body;
    
    let deviceVotedCount = votesMemory.get(deviceId) || 0;
    if (deviceVotedCount >= 3) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: false, message: "Bạn đã sử dụng hết 3 lượt bình chọn!" })
      };
    }

    votesMemory.set(deviceId, deviceVotedCount + 1);
    const teacher = DEFAULT_TEACHERS.find(t => t.id === teacherId);
    if (teacher) teacher.votesCount += 1;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, message: "Bình chọn thành công!", teachers: DEFAULT_TEACHERS })
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ success: true })
  };
};
