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

// 관리자 모드 변수
let isAdminMode = false;
const ADMIN_CODE = "admin"; // 관리자 모드 켜는 비밀번호

// 요소들
const board = document.getElementById('board-container');
const fab = document.getElementById('fab-write');
const writeModal = document.getElementById('write-modal');
const viewModal = document.getElementById('view-modal');
const toast = document.getElementById('toast');

// 오늘 날짜 계산 (24시간 초기화 효과)
const todayMidnight = new Date();
todayMidnight.setHours(0, 0, 0, 0);

// ==================================================
// 👑 관리자 모드 토글 (헤더 자물쇠 버튼)
// ==================================================
const btnAdmin = document.getElementById('btn-admin-mode');
btnAdmin.addEventListener('click', () => {
    if (!isAdminMode) {
        // 켤 때: 암호 확인
        const input = prompt("관리자 암호를 입력하세요:");
        if (input === ADMIN_CODE) {
            isAdminMode = true;
            btnAdmin.classList.add('admin-active'); // 아이콘 빨갛게
            btnAdmin.innerHTML = '<i class="fas fa-unlock"></i>'; // 열린 자물쇠
            showToast("👑 관리자 모드 ON: 모든 글을 삭제할 수 있어요.");
            
            // 현재 보고 있는 상세창이 있다면 삭제 버튼 바로 보여주기
            if(!viewModal.classList.contains('hidden')) {
                document.getElementById('delete-btn').classList.remove('hidden');
            }
        } else if (input !== null) {
            alert("암호가 틀렸습니다.");
        }
    } else {
        // 끌 때: 그냥 꺼짐
        isAdminMode = false;
        btnAdmin.classList.remove('admin-active');
        btnAdmin.innerHTML = '<i class="fas fa-lock"></i>'; // 닫힌 자물쇠
        showToast("관리자 모드 OFF");
    }
});

// ==================================================
// 📝 글쓰기
// ==================================================
let selectedEmo = '☀️';
fab.addEventListener('click', () => {
    writeModal.classList.remove('hidden');
    // 초기화
    document.getElementById('writer-name').value = '';
    document.getElementById('writer-pw').value = '';
    document.getElementById('post-text').value = '';
    selectedEmo = '☀️';
    document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('[data-val="☀️"]').classList.add('selected');
});

document.querySelectorAll('.emo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmo = btn.dataset.val;
    });
});

document.getElementById('close-write').addEventListener('click', () => writeModal.classList.add('hidden'));
document.getElementById('close-view').addEventListener('click', () => viewModal.classList.add('hidden'));

// 저장
document.getElementById('submit-post').addEventListener('click', () => {
    const name = document.getElementById('writer-name').value.trim();
    const pw = document.getElementById('writer-pw').value.trim();
    const text = document.getElementById('post-text').value.trim();

    if(!name || !pw || !text) return alert("별칭, 비밀번호, 내용을 모두 입력해주세요.");

    db.collection('posts').add({
        emotion: selectedEmo,
        author: name,
        password: pw, // 삭제용 비번 저장
        text: text,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        colorIdx: Math.floor(Math.random() * 5)
    }).then(() => {
        writeModal.classList.add('hidden');
        showToast("기록되었습니다!");
    });
});

// ==================================================
// 👀 글 목록 & 상세보기
// ==================================================
db.collection('posts')
  .where('date', '>=', todayMidnight) // 24시간 내 글만
  .orderBy('date', 'desc')
  .onSnapshot(snapshot => {
    board.innerHTML = '';
    if (snapshot.empty) {
        board.innerHTML = '<div class="loading-msg" style="grid-column: 1/-1;">아직 오늘의 마음이 없어요.<br>가장 먼저 남겨보세요!</div>';
        return;
    }
    snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement('div');
        div.className = `post-it color-${data.colorIdx}`;
        div.innerHTML = `
            <div class="post-emoji">${data.emotion}</div>
            <div class="post-text">${data.text}</div>
            <div class="post-author">From. ${data.author}</div>
        `;
        div.addEventListener('click', () => openDetail(doc.id, data));
        board.appendChild(div);
    });
});

let currentDocId = null;
let currentDocData = null;

function openDetail(id, data) {
    currentDocId = id;
    currentDocData = data;
    
    document.getElementById('view-emotion').textContent = data.emotion;
    document.getElementById('view-text').textContent = data.text;
    document.getElementById('view-author').textContent = `작성자: ${data.author}`;
    
    // 삭제 버튼은 항상 보임 (누르면 비번 물어봄)
    viewModal.classList.remove('hidden');
    loadComments(id);
}

// ==================================================
// 🗑️ 글 삭제 (관리자 프리패스 적용)
// ==================================================
document.getElementById('delete-btn').addEventListener('click', () => {
    if(!confirm("정말 삭제하시겠습니까?")) return;

    // 1. 관리자 모드일 때 -> 묻지도 따지지도 않고 삭제
    if(isAdminMode) {
        db.collection('posts').doc(currentDocId).delete().then(() => {
            viewModal.classList.add('hidden');
            showToast("관리자 권한으로 삭제했습니다.");
        });
        return;
    }

    // 2. 일반 사용자일 때 -> 비밀번호 확인
    const inputPw = prompt("글 작성 시 설정한 비밀번호를 입력하세요:");
    if(inputPw === currentDocData.password) {
        db.collection('posts').doc(currentDocId).delete().then(() => {
            viewModal.classList.add('hidden');
            showToast("삭제되었습니다.");
        });
    } else if (inputPw !== null) {
        alert("비밀번호가 틀렸습니다!");
    }
});

// ==================================================
// 💬 댓글 기능
// ==================================================
document.getElementById('submit-comment').addEventListener('click', () => {
    const name = document.getElementById('comment-writer').value.trim();
    const pw = document.getElementById('comment-pw').value.trim();
    const text = document.getElementById('comment-input').value.trim();
    
    if(!name || !pw || !text) return alert("이름, 비번, 내용을 모두 입력하세요.");

    db.collection('posts').doc(currentDocId).collection('comments').add({
        author: name,
        password: pw,
        text: text,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('comment-input').value = '';
});

function loadComments(postId) {
    const list = document.getElementById('comments-list');
    db.collection('posts').doc(postId).collection('comments').orderBy('date').onSnapshot(shot => {
        list.innerHTML = '';
        shot.forEach(d => {
            const c = d.data();
            const div = document.createElement('div');
            div.className = 'comment-item';
            
            // 댓글 내용 + 삭제 아이콘(X)
            div.innerHTML = `
                <div><span style="font-weight:bold">${c.author}:</span> ${c.text}</div>
                <i class="fas fa-times" style="color:#ccc; cursor:pointer; margin-left:10px;" onclick="deleteComment('${postId}', '${d.id}', '${c.password}')"></i>
            `;
            list.appendChild(div);
        });
    });
}

// 댓글 삭제 함수 (전역)
window.deleteComment = function(postId, commentId, commentPw) {
    if(!confirm("댓글을 지울까요?")) return;

    // 1. 관리자 모드 -> 바로 삭제
    if(isAdminMode) {
        db.collection('posts').doc(postId).collection('comments').doc(commentId).delete().then(()=>{
            showToast("관리자 권한으로 댓글 삭제됨");
        });
        return;
    }

    // 2. 일반 사용자 -> 비번 확인
    const inputPw = prompt("댓글 비밀번호 입력:");
    if(inputPw === commentPw) {
        db.collection('posts').doc(postId).collection('comments').doc(commentId).delete().then(()=>{
            showToast("댓글이 삭제되었습니다.");
        });
    } else if (inputPw !== null) {
        alert("비밀번호 불일치!");
    }
};

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}