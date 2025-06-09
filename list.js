document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();
  const scoreTableBody = document.getElementById("scoreTableBody");

  db.collection("scores").orderBy("correctCount", "desc").onSnapshot(snapshot => {
    scoreTableBody.innerHTML = "";

    if (snapshot.empty) {
      const noRow = document.createElement("tr");
      const noCell = document.createElement("td");
      noCell.colSpan = 3;
      noCell.textContent = "まだ成績が登録されていません。";
      noRow.appendChild(noCell);
      scoreTableBody.appendChild(noRow);
      return;
    }

    let rank = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement("tr");

      const rankTd = document.createElement("td");
      rankTd.textContent = rank;

      const nameTd = document.createElement("td");
      nameTd.textContent = data.name || "(不明)";

      const groupTd = document.createElement("td");
      groupTd.textContent = data.group || "未所属";

      const scoreTd = document.createElement("td");
      scoreTd.textContent = data.correctCount !== undefined ? data.correctCount : 0;

      tr.appendChild(rankTd);
      tr.appendChild(nameTd);
      tr.appendChild(groupTd);
      tr.appendChild(scoreTd);

      scoreTableBody.appendChild(tr);
      rank++;
    });
    // 🔽 グループ別スコアの集計用オブジェクト
const groupScores = {};

snapshot.forEach(doc => {
  const data = doc.data();
  const group = data.group || "未分類";
  groupScores[group] = (groupScores[group] || 0) + (data.correctCount || 0);
});

// 🔽 グループスコアを降順で並べ替え
const sortedGroups = Object.entries(groupScores).sort((a, b) => b[1] - a[1]);

// 🔽 テーブル出力先の tbody を取得（list.html 側に用意しておく）
const groupTableBody = document.getElementById("groupTableBody");
groupTableBody.innerHTML = "";

let groupRank = 1;
sortedGroups.forEach(([group, total]) => {
  const tr = document.createElement("tr");

  const rankTd = document.createElement("td");
  rankTd.textContent = groupRank;

  const nameTd = document.createElement("td");
  nameTd.textContent = group;

  const totalTd = document.createElement("td");
  totalTd.textContent = total;

  tr.appendChild(rankTd);
  tr.appendChild(nameTd);
  tr.appendChild(totalTd);

  groupTableBody.appendChild(tr);
  groupRank++;
});
  });
});
