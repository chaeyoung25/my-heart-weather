// ==========================================
// ⚠️ 관리자 이메일 설정 (적용 완료!)
// ==========================================
const ADMIN_EMAIL = "chaeyoung2@gmail.com"; 


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
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 전역 변수
let currentUser = null;
let currentUserProfile = null;
let isAdmin = false;

// 화면 요소
const authScreen = document.getElementById('auth-screen');
const signupScreen = document.getElementById('signup-screen');
const waitingScreen = document.getElementById('waiting-screen'); // 대기 화면
const appScreen = document.getElementById('app-screen');

// ==========================================
// 1. 구글 로그인 및 권한 체크
// ==========================================

document.getElementById('btn-google').addEventListener('click', () => {
    auth.signInWithPopup(googleProvider).catch((error) => {
        if(error.code === 'auth/unauthorized-domain') {
            alert("파이어베이스 콘솔에서 도메인 승인이 필요합니다.");
        } else {
            alert("로그인 실패: " + error.message);
        }
    });
});

// 로그인 상태 변경 시 실행
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // 관리자 여부 확인 (설정한 이메일과 같은지)
        isAdmin = (user.email === ADMIN_EMAIL);

        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                // 기존 가입자
                const userData = doc.data();
                
                // ★ 관리자는 무조건 승인 상태로 처리
                if (isAdmin) {
                    currentUserProfile = userData;
                    enterApp();
                } 
                // ★ 일반 유저는 승인 여부(isApproved) 체크
                else if (userData.isApproved === true) {
                    currentUserProfile = userData;
                    enterApp();
                } else {
                    // 승인 안 됨 -> 대기 화면으로
                    showWaitingScreen();
                }
            } else {
                // 신규 유저 -> 가입 신청 화면으로
                authScreen.classList.add('hidden');
                signupScreen.classList.remove('hidden');
            }
        });
    } else {
        // 로그아웃
        resetScreens();
        authScreen.classList.remove('hidden');
    }
});

function resetScreens() {
    currentUser = null;
    currentUserProfile = null;
    isAdmin = false;
    authScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    appScreen.classList.add('hidden');
}

function showWaitingScreen() {
    authScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    waitingScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
}

// [가입 신청 (승인 요청)]
document.getElementById('btn-save-info').addEventListener('click', () => {
    const nick = document.getElementById('reg-nick').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();

    if (!nick || !phone) return alert("이름과 연락처를 입력해주세요.");

    // 관리자라면 바로 승인(true), 아니면 대기(false)
    const autoApprove = (currentUser.email === ADMIN_EMAIL);

    db.collection('users').doc(currentUser.uid).set({
        realName: currentUser.displayName, 
        email: currentUser.email,          
        nickname: nick,                    
        phone: phone, 
        isApproved: autoApprove, // 승인 여부 플래그
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        if(autoApprove) {
            currentUserProfile = { nickname: nick, isApproved: true };
            enterApp();
        } else {
            showWaitingScreen();
        }
    });
});

// [대기 화면에서 새로고침]
document.getElementById('btn-check-status').addEventListener('click', () => {
    window.location.reload();
});


// 앱 진입
function enterApp() {
    authScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    
    document.getElementById('current-user-nick').textContent = `${currentUserProfile.nickname}님`;
    
    // 관리자 버튼 표시
    if (isAdmin) {
        document.getElementById('btn-admin').classList.remove('hidden');
    } else {
        document.getElementById('btn-admin').classList.add('hidden');
    }
    
    loadPosts();
}

document.getElementById('btn-logout').addEventListener('click', () => {
    auth.signOut();
    alert("로그아웃 되었습니다.");
});


// ==========================================
// 2. 관리자 기능 (회원 승인)
// ==========================================
const adminModal = document.getElementById('admin-modal');
const userListContainer = document.getElementById('user-list');

document.getElementById('btn-admin').addEventListener('click', () => {
    adminModal.classList.remove('hidden');
    loadPendingUsers();
});
document.getElementById('close-admin').addEventListener('click', () => adminModal.classList.add('hidden'));

function loadPendingUsers() {
    // 아직 승인되지 않은(isApproved == false) 유저만 가져오기
    db.collection('users').where('isApproved', '==', false).get().then(snapshot => {
        userListContainer.innerHTML = '';
        
        if (snapshot.empty) {
            userListContainer.innerHTML = '<p style="text-align:center; padding:20px;">승인 대기 중인 회원이 없습니다.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const user = doc.data();
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `
                <div class="user-info-text">
                    <strong>${user.nickname}</strong> (${user.realName})<br>
                    ${user.phone}<br>
                    <span style="font-size:0.8rem; color:#888;">${user.email}</span>
                </div>
                <button class="btn-approve" onclick="approveUser('${doc.id}')">승인</button>
            `;
            userListContainer.appendChild(div);
        });
    });
}

// 전역 함수로 만들어야 HTML onclick에서 실행 가능
window.approveUser = function(uid) {
    if(confirm("이 회원을 승인하시겠습니까?")) {
        db.collection('users').doc(uid).update({
            isApproved: true
        }).then(() => {
            alert("승인되었습니다.");
            loadPendingUsers(); // 목록 새로고침
        });
    }
};


// ==========================================
// 3. 앱 기능 (글쓰기, 댓글, 삭제)
// ==========================================
const board = document.getElementById('board-container');
const fab = document.getElementById('fab-write');
const writeModal = document.getElementById('write-modal');
const viewModal = document.getElementById('view-modal');
let selectedEmo = '☀️';
let currentDocId = null;
const todayMidnight = new Date();
todayMidnight.setHours(0, 0, 0, 0);

// 글쓰기 열기
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

// [글 저장]
document.getElementById('submit-post').addEventListener('click', () => {
    const text = document.getElementById('post-text').value.trim();
    if(!text) return alert("내용을 입력해주세요.");

    db.collection('posts').add({
        emotion: selectedEmo,
        text: text,
        author: currentUserProfile.nickname,
        authorId: currentUser.uid, // 글쓴이 ID 저장
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
            board.innerHTML = '<div class="loading-msg" style="grid-column: 1/-1;">오늘의 첫 마음을 남겨보세요!</div>';
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
    
    document.getElementById('view-emotion').textContent = data.emotion;
    document.getElementById('view-text').textContent = data.text;
    document.getElementById('view-author').textContent = `작성자: ${data.author}`;
    
    const deleteBtn = document.getElementById('delete-btn');
    
    // 삭제 권한 체크: (내 글이거나) OR (내가 관리자일 때)
    if (data.authorId === currentUser.uid || isAdmin) {
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
        authorId: currentUser.uid, // 댓글 쓴 사람 ID
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
});

// 댓글 목록 (댓글 삭제 권한도 추가)
function loadComments(id) {
    const list = document.getElementById('comments-list');
    db.collection('posts').doc(id).collection('comments').orderBy('date').onSnapshot(shot => {
        list.innerHTML = '';
        shot.forEach(d => {
            const c = d.data();
            const commentId = d.id;
            
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `<span style="font-weight:bold">${c.author}:</span> ${c.text}`;
            
            // 댓글 삭제 버튼 (내 댓글이거나 관리자일 때)
            if (c.authorId === currentUser.uid || isAdmin) {
                const delBtn = document.createElement('i');
                delBtn.className = 'fas fa-times';
                delBtn.style.cssText = 'color:#ff6b6b; cursor:pointer; margin-left:10px; font-size:0.8rem;';
                delBtn.onclick = function() {
                    if(confirm('댓글을 지울까요?')) {
                        db.collection('posts').doc(id).collection('comments').doc(commentId).delete();
                    }
                };
                div.appendChild(delBtn);
            }
            
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