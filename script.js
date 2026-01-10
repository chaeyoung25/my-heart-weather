const firebaseConfig = {
  apiKey: "AIzaSyA-gj2lPOdcsAm0B14d5HRFq7E2KDDXEKo",
  authDomain: "heart-weather-1f20a.firebaseapp.com",
  projectId: "heart-weather-1f20a",
  storageBucket: "heart-weather-1f20a.firebasestorage.app",
  messagingSenderId: "665410309658",
  appId: "1:665410309658:web:950106a5d20ff593e64ba3"
};

// 파이어베이스 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider(); // 구글 로그인 도구

// 전역 변수
let currentUser = null;
let currentUserProfile = null;

// 화면 요소
const authScreen = document.getElementById('auth-screen');
const signupScreen = document.getElementById('signup-screen'); // 추가 정보 입력창
const appScreen = document.getElementById('app-screen');

// ==========================================
// 1. 구글 로그인 및 상태 관리
// ==========================================

// [구글 로그인 버튼 클릭]
document.getElementById('btn-google').addEventListener('click', () => {
    auth.signInWithPopup(googleProvider)
        .catch((error) => {
            alert("로그인 실패: " + error.message);
        });
});

// [로그인 상태 변경 감지]
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // DB에 저장된 사용자 정보(별칭 등)가 있는지 확인
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                // 1. 이미 가입된 사용자 -> 바로 앱으로 이동
                currentUserProfile = doc.data();
                enterApp();
            } else {
                // 2. 처음 온 사용자 -> 추가 정보(별칭) 입력 화면으로 이동
                authScreen.classList.add('hidden');
                signupScreen.classList.remove('hidden');
            }
        });
    } else {
        // 로그아웃 상태
        currentUser = null;
        currentUserProfile = null;
        authScreen.classList.remove('hidden');
        signupScreen.classList.add('hidden');
        appScreen.classList.add('hidden');
    }
});

// [처음 가입 시 추가 정보 저장]
document.getElementById('btn-save-info').addEventListener('click', () => {
    const nick = document.getElementById('reg-nick').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();

    if (!nick) return alert("별칭을 입력해주세요!");

    // DB에 저장
    db.collection('users').doc(currentUser.uid).set({
        realName: currentUser.displayName, // 구글 이름
        email: currentUser.email,          // 구글 이메일
        nickname: nick,                    // 입력한 별칭
        phone: phone,                      // 입력한 번호
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // 저장 완료 후 앱 진입
        currentUserProfile = { nickname: nick, phone: phone };
        signupScreen.classList.add('hidden');
        enterApp();
    });
});

// 앱 화면 진입 처리
function enterApp() {
    document.getElementById('current-user-nick').textContent = `${currentUserProfile.nickname}님`;
    appScreen.classList.remove('hidden');
    loadPosts();
}

// [로그아웃]
document.getElementById('btn-logout').addEventListener('click', () => {
    auth.signOut();
    alert("로그아웃 되었습니다.");
});


// ==========================================
// 2. 앱 기능 (글쓰기, 댓글, 삭제)
// ==========================================
const board = document.getElementById('board-container');
const fab = document.getElementById('fab-write');
const writeModal = document.getElementById('write-modal');
const viewModal = document.getElementById('view-modal');
let selectedEmo = '☀️';
let currentDocId = null;
let currentDocData = null;
const todayMidnight = new Date();
todayMidnight.setHours(0, 0, 0, 0);

// 모달 열기/닫기
fab.addEventListener('click', () => {
    writeModal.classList.remove('hidden');
    document.getElementById('post-text').value = '';
    selectedEmo = '☀️';
    document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('[data-val="☀️"]').classList.add('selected');
});
document.getElementById('close-write').addEventListener('click', () => writeModal.classList.add('hidden'));
document.getElementById('close-view').addEventListener('click', () => viewModal.classList.add('hidden'));

// 감정 선택
document.querySelectorAll('.emo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmo = btn.dataset.val;
    });
});

// [글 쓰기] - 별칭 자동 입력
document.getElementById('submit-post').addEventListener('click', () => {
    const text = document.getElementById('post-text').value.trim();
    if(!text) return alert("내용을 입력해주세요.");

    db.collection('posts').add({
        emotion: selectedEmo,
        text: text,
        author: currentUserProfile.nickname, // 별칭 사용
        authorId: currentUser.uid,           // ID 저장
        date: firebase.firestore.FieldValue.serverTimestamp(),
        colorIdx: Math.floor(Math.random() * 5)
    }).then(() => {
        writeModal.classList.add('hidden');
        showToast("기록되었습니다!");
    });
});

// [글 목록]
function loadPosts() {
    db.collection('posts')
      .where('date', '>=', todayMidnight)
      .orderBy('date', 'desc')
      .onSnapshot(snapshot => {
        board.innerHTML = '';
        if (snapshot.empty) {
            board.innerHTML = '<div class="loading-msg" style="grid-column: 1/-1;">아직 오늘의 마음이 없어요.<br>가장 먼저 마음을 남겨보세요!</div>';
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
}

// [상세보기]
function openDetail(id, data) {
    currentDocId = id;
    currentDocData = data;
    
    document.getElementById('view-emotion').textContent = data.emotion;
    document.getElementById('view-text').textContent = data.text;
    document.getElementById('view-author').textContent = `작성자: ${data.author}`;
    
    // 삭제 버튼 표시: 내 글이거나 관리자('admin')일 때
    const deleteBtn = document.getElementById('delete-btn');
    if (data.authorId === currentUser.uid || currentUserProfile.nickname === 'admin') {
        deleteBtn.classList.remove('hidden');
    } else {
        deleteBtn.classList.add('hidden');
    }

    viewModal.classList.remove('hidden');
    loadComments(id);
}

// [삭제]
document.getElementById('delete-btn').addEventListener('click', () => {
    if(confirm("정말 삭제하시겠습니까?")) {
        db.collection('posts').doc(currentDocId).delete().then(() => {
            viewModal.classList.add('hidden');
            showToast("삭제되었습니다.");
        });
    }
});

// [댓글 쓰기]
document.getElementById('submit-comment').addEventListener('click', () => {
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if(!text) return;

    db.collection('posts').doc(currentDocId).collection('comments').add({
        text: text,
        author: currentUserProfile.nickname,
        authorId: currentUser.uid,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
});

// 댓글 목록
function loadComments(id) {
    const list = document.getElementById('comments-list');
    db.collection('posts').doc(id).collection('comments').orderBy('date').onSnapshot(shot => {
        list.innerHTML = '';
        shot.forEach(d => {
            const c = d.data();
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `<span style="font-weight:bold">${c.author}:</span> ${c.text}`;
            list.appendChild(div);
        });
    });
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}