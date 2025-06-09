document.addEventListener('DOMContentLoaded', () => {
  const db = firebase.firestore();
  const storage = firebase.storage();

  const groupMap = new Map(); // グループID → 表示名

  const groupForm = document.getElementById("groupForm");
  const groupNameInput = document.getElementById("groupNameInput");
  const quizForm = document.getElementById('quizForm');
  const groupListDiv = document.getElementById("groupList");
  const playerListDiv = document.getElementById('playerList');


    // グループ追加処理
  groupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = groupNameInput.value.trim();
    if (!name) return;
  
    db.collection("groups").doc(name).set({ name }).then(() => {
      groupNameInput.value = "";
    });
  });
  
  const questionInput = document.getElementById('questionInput');
  const difficultySelect = document.getElementById('difficultySelect');
  const typeChoice = document.getElementById('typeChoice');
  const typeText = document.getElementById('typeText');
  const choiceOptionsDiv = document.getElementById('choiceOptions');
  const textAnswerDiv = document.getElementById('textAnswer');
  const textCorrectInput = document.getElementById('textCorrect');
  const imageInput = document.getElementById('imageInput');
  const qrSection = document.getElementById('qrSection');
  const qrImage = document.getElementById('qrImage');
  const quizLink = document.getElementById('quizLink');
  const quizListDiv = document.getElementById('quizList');


  // デバッグ用：要素が見つかっているか確認
  console.log("playerListDiv element:", playerListDiv);

  function updateTypeFields() {
    if (typeChoice.checked) {
      choiceOptionsDiv.classList.remove('hidden');
      textAnswerDiv.classList.add('hidden');
      textCorrectInput.required = false;
    } else {
      choiceOptionsDiv.classList.add('hidden');
      textAnswerDiv.classList.remove('hidden');
      textCorrectInput.required = true;
    }
  }
  
  updateTypeFields();
  typeChoice.addEventListener('change', updateTypeFields);
  typeText.addEventListener('change', updateTypeFields);

  quizForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = questionInput.value.trim();
    const type = typeChoice.checked ? 'choice' : 'text';

    if (!question) {
      alert('問題文を入力してください。');
      return;
    }
    
    const quizRef = db.collection('quizzes').doc();
    const quizId = quizRef.id;
    const quizData = {
      question,
      type,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // 難易度セレクトの値取得と難易度に応じたポイント設定
    const difficulty = parseInt(difficultySelect.value);
    quizData.difficulty = difficulty;
    quizData.point = difficulty; // 1 = 簡単、3 = 難しい

    if (type === 'choice') {
      const options = [];
      for (let i = 1; i <= 4; i++) {
        const opt = document.getElementById('option' + i).value.trim();
        if (opt !== '') options.push(opt);
      }
      const correctIndex = parseInt(document.querySelector('input[name="correctOption"]:checked')?.value || -1) - 1;
      if (options.length < 2 || correctIndex < 0 || correctIndex >= options.length) {
        alert('選択肢と正解を正しく入力してください。');
        return;
      }
      quizData.options = options;
      quizData.correctIndex = correctIndex;
    } else {
      const answer = textCorrectInput.value.trim();
      if (!answer) {
        alert('記述式の正解を入力してください。');
        return;
      }
      quizData.correctAnswer = answer;
    }

    const file = imageInput.files[0];
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `quiz-images/${quizId}.${ext}`;
      const ref = storage.ref(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      quizData.imageURL = url;
    }

    await quizRef.set(quizData);
    onQuizAddedSuccess(quizId);
  });

  function onQuizAddedSuccess(quizId) {
    const url = `${location.origin}/player.html?quiz=${quizId}`;
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    quizLink.href = url;
    quizLink.textContent = `クイズID: ${quizId} のページ`;
    qrSection.classList.remove('hidden');
    quizForm.reset();
    updateTypeFields();
  }
  
  db.collection('quizzes').orderBy('createdAt').onSnapshot(snapshot => {
    quizListDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const quiz = doc.data();
      const id = doc.id;

      const item = document.createElement('div');
      item.className = 'quiz-item';

      const qText = document.createElement('span');
      qText.textContent = quiz.question;
      item.appendChild(qText);

      const editBtn = document.createElement('button');
      editBtn.textContent = '編集';
      editBtn.onclick = async () => {
        let newQuestion = prompt('問題文を編集：', quiz.question);
        if (!newQuestion || newQuestion.trim() === '') return;

        if (quiz.type === "text") {
          let newAnswer = prompt("正解を編集：", quiz.correctAnswer || "");
          if (!newAnswer || newAnswer.trim() === "") return;
        
          let newDifficulty = prompt("難易度を1〜3か10で入力（1:かんたん, 2:ふつう, 3:むずかしい, 10:おに）：", quiz.difficulty ?? 1);
          if (!["1", "2", "3", "10"].includes(newDifficulty)) {
            alert("1〜3か10の数字で入力してください");
            return;
          }
        
          await db.collection("quizzes").doc(id).update({
            question: newQuestion.trim(),
            correctAnswer: newAnswer.trim(),
            difficulty: parseInt(newDifficulty),
            point: parseInt(newDifficulty)
          });
        } else {
          const newOptions = [];
          for (let i = 0; i < 4; i++) {
            const oldOpt = quiz.options?.[i] || "";
            const newOpt = prompt(`選択肢${i + 1} を編集：`, oldOpt);
            newOptions.push(newOpt ?? oldOpt);
          }

          const newCorrect = prompt("正解の選択肢番号（1〜4）を入力：", (quiz.correctIndex ?? 0) + 1);
          const correctIndex = parseInt(newCorrect) - 1;

          if (correctIndex < 0 || correctIndex > 3 || newOptions.length < 2) {
            alert("正解番号または選択肢が不正です");
            return;
          }

          const newDifficulty = prompt("難易度を1〜3か10で入力（1:かんたん, 2:ふつう, 3:むずかしい, 10:おに）：", quiz.difficulty ?? 1);
          if (!["1", "2", "3", "10"].includes(newDifficulty)) {
            alert("1〜3か10の数字で入力してください");
            return;
          }

          await db.collection("quizzes").doc(id).update({
            question: newQuestion.trim(),
            options: newOptions,
            correctIndex,
            difficulty: parseInt(newDifficulty),
            point: parseInt(newDifficulty)
          });
        }
      };
      item.appendChild(editBtn);

      const qrBtn = document.createElement('button');
      qrBtn.textContent = 'QRコード';
      qrBtn.onclick = () => {
        const qrUrl = `${location.origin}/player.html?quiz=${id}`;
        const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `<div class="modal-content">
          <span class="close-btn">×</span>
          <img src="${imgUrl}" alt="QRコード" style="max-width:100%;">
        </div>`;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        modal.querySelector('.close-btn').onclick = () => modal.remove();
      };
      item.appendChild(qrBtn);

      const delBtn = document.createElement('button');
      delBtn.textContent = '削除';
      delBtn.onclick = () => {
        if (confirm('このクイズを削除しますか？')) {
          db.collection('quizzes').doc(id).get().then(d => {
            if (d.exists && d.data().imageURL) {
              return storage.refFromURL(d.data().imageURL).delete().catch(() => {});
            }
          }).then(() => db.collection('quizzes').doc(id).delete());
        }
      };
      item.appendChild(delBtn);

      quizListDiv.appendChild(item);
    });
  });

  // グループ一覧表示処理
  db.collection("groups").onSnapshot(snapshot => {
    groupMap.clear();
    groupListDiv.innerHTML = "";
    
    snapshot.forEach(doc => {
      const group = doc.data();
      const id = doc.id;

      groupMap.set(doc.id, group.name); // doc.id はグループID

      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.textContent = group.name;
      tr.appendChild(nameTd);

      const actionTd = document.createElement("td");

      const editBtn = document.createElement("button");
      editBtn.textContent = "編集";
      editBtn.onclick = () => {
        const newName = prompt("新しいファミリー名を入力：", group.name);
        if (!newName || newName.trim() === "" || newName === id) return;
        const newId = newName.trim();
        db.collection("groups").doc(newId).set({ name: newId }).then(() => {
          db.collection("groups").doc(id).delete();
        });
      };
      actionTd.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.textContent = "削除";
      delBtn.onclick = () => {
        if (confirm(`${group.name} を削除しますか？`)) {
          db.collection("groups").doc(id).delete();
        }
      };
      actionTd.appendChild(delBtn);

      tr.appendChild(actionTd);
      groupListDiv.appendChild(tr);
    });

  drawPlayerList();
});

function drawPlayerList() {
  db.collection("scores").onSnapshot(snapshot => {
    playerListDiv.innerHTML = ""; // テーブル初期化
  
    if (snapshot.empty) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "参加チームはまだありません";
      td.style.textAlign = "center";
      tr.appendChild(td);
      playerListDiv.appendChild(tr); //
      return;
    }
  
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
  
      const tr = document.createElement("tr");
  
      // ① チーム名
      const nameTd = document.createElement("td");
      nameTd.textContent = data.name || "未登録";
      tr.appendChild(nameTd);
  
      // ② ファミリー名
      const familyTd = document.createElement("td");
      if (data.group && groupMap.has(data.group)) {
        familyTd.textContent = groupMap.get(data.group);
      } else {
        familyTd.textContent = "未所属";
        familyTd.style.color = "#999";
      }
      tr.appendChild(familyTd);
  
      // ③ ポイント数
      const pointTd = document.createElement("td");
      pointTd.textContent = `${data.correctCount ?? 0}問`;
      tr.appendChild(pointTd);
  
      // ④ 削除ボタン
      const actionTd = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "削除";
      delBtn.onclick = () => {
        if (confirm(`${data.name} を削除しますか？`)) {
          db.collection("scores").doc(id).delete();
        }
      };
      actionTd.appendChild(delBtn);
      tr.appendChild(actionTd);
  
      playerListDiv.appendChild(tr);

  });
});
}
});
