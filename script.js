// ==========================================
// 1. 관리자 비밀번호 (이걸 입력하면 무조건 삭제됨)
// ==========================================
const ADMIN_PASSWORD = "admin"; 

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
const writerName = document.getElementById('writer-name'); // 작성자 이름
const postPw = document.getElementById('post-pw');

const submitComment = document.getElementById('submit-comment');
const commentInput = document.getElementById('comment-input');
const commentWriter = document.getElementById('comment-writer'); // 댓글 작성자 이름

const toast = document.getElementById('toast');

let selectedEmo = '☀️';
let currentDocId = null;
let currentDocData = null;

// 오늘 날짜 기준
const todayMidnight = new Date();
todayMidnight.setHours(0, 0, 0, 0); 

// ==========================================
// 기능 로직
// ==========================================

// 글쓰기 창 열기
fab.addEventListener('click', () => {
    writeModal.classList.remove('hidden');
    postText.value = '';
    writerName.value = ''; // 이름 초기화
    postPw.value = ''; 
    
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
    const name = writerName.value.trim();
    const pw = postPw.value.trim();

    if(!name) return alert('작성자 이름을 입력해주세요!');
    if(!text) return alert('마음의 이야기를 적어주세요!');
    if(!pw || pw.length < 1) return alert('삭제용 비밀번호를 입력해주세요!');

    // DB에 저장
    db.collection('posts').add({
        emotion: selectedEmo,
        author: name,      // 실명 저장
        text: text,
        password: pw, 
        date: firebase.firestore.FieldValue.serverTimestamp(),
        colorIdx: Math.floor(Math.random() * 5)
    }).then(() => {
        writeModal.classList.add('hidden');
        showToast("기록되었습니다!");
    }).catch(err => {
        alert("저장 실패: " + err.message);
    });
});

// [실시간 글 불러오기]
db.collection('posts')
  .where('date', '>=', todayMidnight) 
  .orderBy('date', 'desc')
  .onSnapshot(snapshot => {
    board.innerHTML = '';
    
    if (snapshot.empty) {
        board.innerHTML = '<div class="loading-msg" style="grid-column: 1/-1;">아직 오늘의 마음이 없어요.<br>오늘의 첫 마음을 남겨주세요! 📝</div>';
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement('div');
        // 이름이 없으면 '익명'으로 처리 (옛날 글 호환)
        const authorName = data.author ? data.author : '익명';
        
        div.className = `post-it color-${data.colorIdx}`;
        div.innerHTML = `
            <div class="post-emoji">${data.emotion}</div>
            <div class="post-text">${data.text}</div>
            <div class="post-author">From. ${authorName}</div>
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
    
    // 작성자 표시
    const authorName = data.author ? data.author : '익명';
    document.getElementById('view-author').textContent = `작성자: ${authorName}`;
    
    viewModal.classList.remove('hidden');
    loadComments(id);
}

// [삭제 기능 - 강력 수정]
document.getElementById('delete-btn').addEventListener('click', () => {
    if (confirm("정말 삭제하시겠습니까?")) {
        const inputPw = prompt("비밀번호를 입력하세요 (관리자는 'admin')");
        if (!inputPw) return; 

        // 1. 관리자 비밀번호('admin')를 입력했거나
        // 2. 글의 비밀번호와 일치하는 경우 삭제
        if (inputPw === ADMIN_PASSWORD || (currentDocData.password && inputPw === currentDocData.password)) {
            db.collection('posts').doc(currentDocId).delete().then(() => {
                viewModal.classList.add('hidden');
                showToast("삭제되었습니다 🗑️");
            }).catch(error => {
                alert("삭제 중 오류 발생: " + error.message);
            });
        } else {
            alert("비밀번호가 틀립니다! (이전에 쓴 글이라면 'admin'을 입력해보세요)");
        }
    }
});

// [댓글 불러오기]
function loadComments(id) {
    const list = document.getElementById('comments-list');
    db.collection('posts').doc(id).collection('comments').orderBy('date').onSnapshot(shot => {
        list.innerHTML = '';
        shot.forEach(d => {
            const c = d.data();
            const cName = c.author ? c.author : '익명'; // 댓글 이름
            
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `<span class="comment-author">${cName}:</span> ${c.text}`;
            list.appendChild(div);
        });
    });
}

// [댓글 저장 - 실명 포함]
submitComment.addEventListener('click', () => {
    const name = commentWriter.value.trim();
    const text = commentInput.value.trim();
    
    if(!name) return alert('이름을 입력해주세요!');
    if(!text) return;
    
    db.collection('posts').doc(currentDocId).collection('comments').add({
        author: name, // 댓글 작성자 이름
        text: text,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
    commentInput.value = '';
    // 이름은 편의상 남겨둘 수도 있고 지울 수도 있음 (여기선 유지)
});

// 알림창
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}