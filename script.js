// ==========================================
// 1. 사용자 설정 (관리자 비밀번호)
// ==========================================
const ADMIN_PASSWORD = "admin"; // 👈 관리자용 만능 비밀번호 (원하는 걸로 바꾸세요)


// ==========================================
// 2. 파이어베이스 설정
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyA-gj2lPOdcsAm0B14d5HRFq7E2KDDXEKo",
  authDomain: "heart-weather-1f20a.firebaseapp.com",
  projectId: "heart-weather-1f20a",
  storageBucket: "heart-weather-1f20a.firebasestorage.app",
  messagingSenderId: "665410309658",
  appId: "1:665410309658:web:950106a5d20ff593e64ba3"
};

// 파이어베이스 시작
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 요소 가져오기
const board = document.getElementById('board-container');
const fab = document.getElementById('fab-write');
const writeModal = document.getElementById('write-modal');
const viewModal = document.getElementById('view-modal');
const closeWrite = document.getElementById('close-write');
const closeView = document.getElementById('close-view');
const submitPost = document.getElementById('submit-post');
const postText = document.getElementById('post-text');
const postPw = document.getElementById('post-pw');
const toast = document.getElementById('toast');

let selectedEmo = '☀️';
let currentDocId = null;
let currentDocData = null;

// ==========================================
// 3. 오늘 자정(00:00) 시간 구하기
// ==========================================
const todayMidnight = new Date();
todayMidnight.setHours(0, 0, 0, 0); // 오늘 날짜의 0시 0분 0초로 설정


// ==========================================
// 4. 기능 로직
// ==========================================

// 글쓰기 창 열기
fab.addEventListener('click', () => {
    writeModal.classList.remove('hidden');
    postText.value = '';
    postPw.value = ''; // 비번 초기화
    
    // 감정 초기화
    selectedEmo = '☀️';
    document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('[data-val="☀️"]').classList.add('selected');
});

closeWrite.addEventListener('click', () => writeModal.classList.add('hidden'));
closeView.addEventListener('click', () => viewModal.classList.add('hidden'));

// 감정 선택
document.querySelectorAll('.emo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmo = btn.dataset.val;
    });
});

// [글 저장]
submitPost.addEventListener('click', () => {
    const text = postText.value.trim();
    const pw = postPw.value.trim();

    if(!text) return alert('마음의 이야기를 적어주세요!');
    if(!pw || pw.length < 1) return alert('삭제할 때 필요한 비밀번호(4자리)를 입력해주세요!');

    // DB에 저장
    db.collection('posts').add({
        emotion: selectedEmo,
        text: text,
        password: pw, // 비밀번호 저장
        date: firebase.firestore.FieldValue.serverTimestamp(), // 서버 시간
        colorIdx: Math.floor(Math.random() * 5)
    }).then(() => {
        writeModal.classList.add('hidden');
        showToast("오늘의 마음이 기록되었어요!");
    }).catch(err => {
        alert("저장 실패: " + err.message);
    });
});

// [실시간 글 불러오기 - 24시간 필터]
// 중요: 이 쿼리는 파이어베이스 콘솔에서 '색인(Index)'을 만들어야 작동합니다.
// 처음에 에러가 뜨면 F12 콘솔창의 링크를 눌러주세요.
db.collection('posts')
  .where('date', '>=', todayMidnight) // 오늘 자정 이후의 글만!
  .orderBy('date', 'desc')
  .onSnapshot(snapshot => {
    board.innerHTML = '';
    
    if (snapshot.empty) {
        board.innerHTML = '<div class="loading-msg" style="grid-column: 1/-1;">아직 오늘의 마음이 없어요.<br>가장 먼저 마음을 남겨보세요! 📝</div>';
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement('div');
        div.className = `post-it color-${data.colorIdx}`;
        div.innerHTML = `
            <div class="post-emoji">${data.emotion}</div>
            <div class="post-text">${data.text}</div>
            <div class="post-meta">👆 클릭해서 보기</div>
        `;
        div.addEventListener('click', () => openDetail(doc.id, data));
        board.appendChild(div);
    });
});

// [상세보기]
function openDetail(id, data) {
    currentDocId = id;
    currentDocData = data;
    document.getElementById('view-emotion').textContent = data.emotion;
    document.getElementById('view-text').textContent = data.text;
    viewModal.classList.remove('hidden');
    loadComments(id);
}

// [삭제 기능]
document.getElementById('delete-btn').addEventListener('click', () => {
    if (confirm("정말 이 마음을 지우시겠어요?")) {
        const inputPw = prompt("비밀번호를 입력하세요 (관리자는 'admin' 입력)");
        
        if (!inputPw) return; 

        // 비밀번호 확인: 관리자 키이거나 OR 작성자 비번이거나
        if (inputPw === ADMIN_PASSWORD || inputPw === currentDocData.password) {
            db.collection('posts').doc(currentDocId).delete().then(() => {
                viewModal.classList.add('hidden');
                showToast("마음이 깨끗하게 비워졌어요 🧹");
            });
        } else {
            alert("비밀번호가 일치하지 않습니다.");
        }
    }
});

// [댓글 로직]
function loadComments(id) {
    const list = document.getElementById('comments-list');
    db.collection('posts').doc(id).collection('comments').orderBy('date').onSnapshot(shot => {
        list.innerHTML = '';
        shot.forEach(d => {
            const c = d.data();
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerText = `💬 ${c.text}`;
            list.appendChild(div);
        });
    });
}

document.getElementById('submit-comment').addEventListener('click', () => {
    const input = document.getElementById('comment-input');
    if(!input.value) return;
    db.collection('posts').doc(currentDocId).collection('comments').add({
        text: input.value,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
});

// 알림 메시지
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}