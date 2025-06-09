let playerName = "";
let correctCount = 0;
let currentQuizId = "";
let videoStream = null;
let scanInterval = null;
let bonusActivated = false;

function initPlayerApp() {
  const db = firebase.firestore();

  const nameSection = document.getElementById("nameSection");
  const groupSelect = document.getElementById("groupSelect");
  // Firestore からグループ一覧を読み込んでセレクトに追加
db.collection("groups").get().then(snapshot => {
  groupSelect.innerHTML = '<option value="">ファミリーを選択</option>';
  snapshot.forEach(doc => {
    const data = doc.data();
    const option = document.createElement("option");
    option.value = doc.id;           // 例: A, B, C
    option.textContent = data.name;  // 例: Aグループ
    groupSelect.appendChild(option);
  });
});
  const gameSection = document.getElementById("gameSection");
  const quizSection = document.getElementById("quizSection");
  const resultSection = document.getElementById("resultSection");
  const finalSection = document.getElementById("finalSection");

  const playerNameInput = document.getElementById("playerNameInput");
  const startGameBtn = document.getElementById("startGameBtn");
  const scanQRBtn = document.getElementById("scanQRBtn");
  const cancelScanBtn = document.getElementById("cancelScanBtn");

  const qrScanner = document.getElementById("qrScanner");
  const video = document.getElementById("qrVideo");
  const canvas = document.getElementById("qrCanvas");
  const ctx = canvas.getContext("2d");

  const quizQuestion = document.getElementById("quizQuestion");
  const quizImage = document.getElementById("quizImage");
  const quizOptions = document.getElementById("quizOptions");
  const textAnswerInput = document.getElementById("textAnswerInput");
  const submitAnswerBtn = document.getElementById("submitAnswerBtn");

  const resultMessage = document.getElementById("resultMessage");
  const rankingSection = document.getElementById("rankingSection");

  const nextQuizBtn = document.getElementById("nextQuizBtn");
  const endGameBtn = document.getElementById("endGameBtn");

  const finalScore = document.getElementById("finalScore");
  const finalRank = document.getElementById("finalRank");
  const bonusButton = document.getElementById("bonusButton");
  let usedBonus = false;
  
  bonusButton.addEventListener("click", async () => {
    const doc = await db.collection("scores").doc(playerName).get();
    const data = doc.data();
  
    if (data.usedBonus) {
      alert("すでにボーナスは使われています！");
      return;
    }
  
    const confirmUse = confirm("本当にボーナスを使っちゃっていいんですね？（1回限りです）");
    if (!confirmUse) return;
  
    bonusActivated = true;
    usedBonus = true;
    bonusButton.textContent = "ボーナス使用済み";
    bonusButton.disabled = true;
    alert("次のクイズの得点が2倍になります！");
  });

  
  startGameBtn.addEventListener("click", () => {
    const group = groupSelect.value;
    const name = playerNameInput.value.trim();
  
    if (!group) {
      alert("ファミリーを選択してください");
      return;
    }
    if (!name) {
      alert("名前を入力してください");
      return;
    }
  
    playerName = name;
    nameSection.classList.add("hidden");
    gameSection.classList.remove("hidden");
  
    // Firestore からスコアとグループを取得／登録
    db.collection("scores").doc(playerName).get().then(doc => {
      if (doc.exists) {
        correctCount = doc.data().correctCount || 0;
      } else {
        correctCount = 0;
        db.collection("scores").doc(playerName).set({
          name: playerName,
          group: group,
          correctCount: 0,
          usedBonus: false
        });
      }
      usedBonus = doc.data()?.usedBonus || false;
      if (usedBonus) {
  bonusButton.textContent = "ボーナス使用済み";
  bonusButton.disabled = true;
}
    });
  });

  scanQRBtn.onclick = async () => {
    qrScanner.classList.remove("hidden");

    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = videoStream;

      scanInterval = setInterval(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          stopCamera();
          currentQuizId = extractQuizId(code.data);
          loadQuiz(currentQuizId);
        }
      }, 500);
    } catch (err) {
      alert("カメラを起動できませんでした：" + err.message);
      qrScanner.classList.add("hidden");
    }
  };

  cancelScanBtn.onclick = () => {
    stopCamera();
  };

  function stopCamera() {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    clearInterval(scanInterval);
    qrScanner.classList.add("hidden");
  }

  function extractQuizId(urlOrId) {
    const match = urlOrId.match(/quiz=([a-zA-Z0-9]+)/);
    return match ? match[1] : urlOrId;
  }

  function loadQuiz(quizId) {
    db.collection("quizzes").doc(quizId).get().then(doc => {
      if (!doc.exists) {
        alert("クイズが見つかりません");
        return;
      }
      const quiz = doc.data();
      quizQuestion.textContent = quiz.question;
      quizOptions.innerHTML = "";
      quizImage.style.display = "none";
      textAnswerInput.classList.add("hidden");
      quizOptions.classList.add("hidden");

      if (quiz.imageURL) {
        quizImage.src = quiz.imageURL;
        quizImage.style.display = "block";
      }

      if (quiz.type === "choice") {
        quiz.options.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.textContent = opt;
          btn.onclick = () => checkAnswer(i, quiz.correctIndex);
          quizOptions.appendChild(btn);
        });
        quizOptions.classList.remove("hidden");
      } else {
        textAnswerInput.value = "";
        textAnswerInput.classList.remove("hidden");
        submitAnswerBtn.onclick = () => {
          const ans = textAnswerInput.value.trim();
          checkAnswer(ans, quiz.correctAnswer);
        };
      }

      quizSection.classList.remove("hidden");
      resultSection.classList.add("hidden");
    });
  }

  function checkAnswer(input, correct) {
    let isCorrect = false;
    if (typeof correct === "number") {
      isCorrect = input === correct;
    } else {
      isCorrect = input.toLowerCase() === correct.toLowerCase();
    }
  
    if (isCorrect) {
      resultMessage.textContent = "正解！";
  
      db.collection("quizzes").doc(currentQuizId).get().then(quizDoc => {
        const quizData = quizDoc.data();
        const point = quizData?.point || 1;
        const gainedPoint = bonusActivated ? point * 2 : point;
        correctCount += gainedPoint;
  
        db.collection("scores").doc(playerName).get().then(doc => {
          const data = doc.data() || {};
          db.collection("scores").doc(playerName).set({
            name: playerName,
            group: data.group || "未分類",
            correctCount,
            usedBonus: usedBonus
          });
  
          bonusActivated = false;
          showRanking(); // 正解後ランキング表示
        });
      });
  
    } else {
      resultMessage.textContent = "不正解！";
      showRanking(); // 不正解でもランキング表示
    }
  }
  function showRanking() {
    db.collection("scores").orderBy("correctCount", "desc").get().then(snapshot => {
      let rankText = "<h4>ランキング</h4><ol>";
      snapshot.forEach(doc => {
        const d = doc.data();
        rankText += `<li>${d.name}：${d.correctCount}問正解</li>`;
      });
      rankText += "</ol>";
      rankingSection.innerHTML = rankText;

      quizSection.classList.add("hidden");
      resultSection.classList.remove("hidden");
    });
  }

  nextQuizBtn.onclick = () => {
    quizSection.classList.add("hidden");
    resultSection.classList.add("hidden");
    document.getElementById("gameMessage").textContent = "QRコードを読み込んでください";
  };

  endGameBtn.onclick = () => {
    finalScore.textContent = `${playerName} さんの正解数：${correctCount}`;
    db.collection("scores").orderBy("correctCount", "desc").get().then(snapshot => {
      let rank = 1;
      snapshot.forEach(doc => {
        if (doc.id === playerName) {
          finalRank.textContent = `あなたの順位：第 ${rank} 位`;
        } else {
          rank++;
        }
      });
    });

    gameSection.classList.add("hidden");
    finalSection.classList.remove("hidden");
  };

  // ランキングポップアップ表示切替
  window.togglePopupRanking = function () {
    const popup = document.getElementById("popupRanking");
    const list = document.getElementById("popupRankingList");
    const isOpen = popup.classList.contains("show");
  
    if (!isOpen) {
      db.collection("scores").orderBy("correctCount", "desc").get().then(snapshot => {
        list.innerHTML = "";
        snapshot.forEach(doc => {
          const data = doc.data();
          const li = document.createElement("li");
          li.textContent = `${data.name}：${data.correctCount}問正解`;
          list.appendChild(li);
        });
        popup.classList.add("show"); // 表示する
      });
    } else {
      popup.classList.remove("show"); // 非表示にする
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initPlayerApp();
});
