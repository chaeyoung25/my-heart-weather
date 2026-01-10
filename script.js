// ==========================================
// 1. 관리자 & 이메일 키 설정
// ==========================================
const ADMIN_EMAIL = "chaeyoung2@gmail.com"; 

const EMAIL_SERVICE_ID = "service_vnd13x5";
const EMAIL_TEMPLATE_ID = "template_6ek1hgc";
const EMAIL_PUBLIC_KEY = "YnbvLgrg8MMJRhFTu";

// ==========================================

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
const googleProvider = new firebase.auth.GoogleAuthProvider();

// EmailJS 초기화 (안전 장치 추가: 라이브러리가 없어도 앱이 멈추지 않음)
try {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAIL_PUBLIC_KEY);
        console.log("이메일 도구 준비 완료!");
    } else {
        console.warn("⚠️ 이메일 도구(EmailJS)를 찾을 수 없습니다. HTML 파일을 확인하세요.");
    }
} catch (e) {
    console.error("이메일 도구 초기화 중 오류:", e);
}

// 화면 요소 가져오기
const authScreen = document.getElementById('auth-screen');
const signupScreen = document.getElementById('signup-screen');
const waitingScreen = document.getElementById('waiting-screen'); 
const appScreen = document.getElementById('app-screen');

// 변수
let currentUser = null;
let currentUserProfile = null;
let isAdmin = false;

// ==========================================
// 2. 구글 로그인 및 상태 관리
// ==========================================

// [구글 로그인 버튼]
const googleBtn = document.getElementById('btn-google');
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider).catch((error) => {
            if(error.code === 'auth/unauthorized-domain') {
                alert("🚨 도메인 승인 오류: 파이어베이스 콘솔에서 '승인된 도메인'을 확인해주세요.");
            } else if (error.code === 'auth/operation-not-allowed') {
                 alert("🚨 설정 오류: 파이어베이스 콘솔에서 구글 로그인을 '사용 설정(On)'하고 '저장'했는지 확인해주세요.");
            } else {
                alert("로그인 실패: " + error.message);
            }
        });
    });
}

// [초기화(강제 로그아웃) 버튼] - 로그인 화면이 멈췄을 때 사용
document.getElementById('btn-force-logout').addEventListener('click', () => {
    auth.signOut().then(() => {
        alert("초기화되었습니다. 다시 로그인해주세요.");
        window.location.reload();
    });
});

// [로그인 상태 감지]
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        isAdmin = (user.email === ADMIN_EMAIL);

        // DB에서 사용자 정보 확인
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                // 관리자이거나, 승인된 유저라면 앱으로 입장
                if (isAdmin || userData.isApproved === true) {
                    currentUserProfile = userData;
                    enterApp();
                } else {
                    // 승인 안 됨 -> 대기 화면
                    showWaitingScreen();
                }
            } else {
                // 정보 없음 -> 가입 신청 화면
                authScreen.classList.add('hidden');
                signupScreen.classList.remove('hidden');
            }
        }).catch((err) => {
             console.error("DB 에러:", err);
             // DB 에러가 나면 일단 가입 화면으로 보내서 멈춤 방지
             authScreen.classList.add('hidden');
             signupScreen.classList.remove('hidden');
        });
    } else {
        // 로그아웃 상태
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

// [가입 신청 & 이메일 발송]
document.getElementById('btn-save-info').addEventListener('click', () => {
    const nick = document.getElementById('reg-nick').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();

    if (!nick || !phone) return alert("이름과 연락처를 입력해주세요.");

    const autoApprove = (currentUser.email === ADMIN_EMAIL);

    db.collection('users').doc(currentUser.uid).set({
        realName: currentUser.displayName, 
        email: currentUser.email,          
        nickname: nick,                    
        phone: phone, 
        isApproved: autoApprove,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        if(autoApprove) {
            currentUserProfile = { nickname: nick, isApproved: true };
            enterApp();
        } else {
            // 이메일 발송 시도
            if (typeof emailjs !== 'undefined') {
                const templateParams = { nick: nick, phone: phone };
                emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams)
                    .then(() => {
                       alert("가입 신청 완료! 관리자에게 메일을 보냈습니다.");
                       showWaitingScreen();
                    })
                    .catch((err) => {
                       console.error("메일 전송 실패:", err);
                       alert("가입 신청은 되었지만 메일 전송에 실패했습니다. (관리자에게 따로 알려주세요)");
                       showWaitingScreen();
                    });
            } else {
                alert("가입 신청 완료! (이메일 도구 로드 실패)");
                showWaitingScreen();
            }
        }
    });
});

document.getElementById('btn-check-status').addEventListener('click', () => window.location.reload());
document.getElementById('btn-logout-wait').addEventListener('click', () => auth.signOut());

function enterApp() {
    authScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    
    // 닉네임이 없으면 구글 이름으로 대체
    const displayName = currentUserProfile ? currentUserProfile.nickname : currentUser.displayName;
    document.getElementById('current-user-nick').textContent = `${displayName}님`;
    
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
// 3. 관리자 및 게시판 기능
// ==========================================
const adminModal = document.getElementById('admin-modal');
const userListContainer = document.getElementById('user-list');

document.getElementById('btn-admin').addEventListener('click', () => {
    adminModal.classList.remove('hidden');
    loadPendingUsers();
});
document.getElementById('close-admin').addEventListener('click', () => adminModal.classList.add('hidden'));

function loadPendingUsers() {
    db.collection('users').where('isApproved', '==', false).get().then(snapshot => {
        userListContainer.innerHTML = '';
        if (snapshot.empty) {
            userListContainer.innerHTML = '<p style="text-align:center; padding:20px;">대기 회원이 없습니다.</p>';
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

window.approveUser = function(uid) {
    if(confirm("이 회원을 승인하시겠습니까?")) {
        db.collection('users').doc(uid).update({ isApproved: true })
          .then(() => { alert("승인되었습니다."); loadPendingUsers(); });
    }
};

const board = document.getElementById('board-container');
const fab = document.getElementById('fab-write');
const writeModal = document.getElementById('write-modal');
const viewModal = document.getElementById('view-modal');
let selectedEmo = '☀️';
let currentDocId = null;
const todayMidnight = new Date();
todayMidnight.setHours(0, 0, 0, 0);

fab.addEventListener('click', () => {
    writeModal.classList.remove('hidden');
    document.getElementById('post-text').value = '';
    selectedEmo = '☀️';
    document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('[data-val="☀️"]').classList.add('selected');
});
document.getElementById('close-write').addEventListener('click', () => writeModal.classList.add('hidden'));
document.getElementById('close-view').addEventListener('click', () => viewModal.classList.add('hidden'));

document.querySelectorAll('.emo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmo = btn.dataset.val;
    });
});

document.getElementById('submit-post').addEventListener('click', () => {
    const text = document.getElementById('post-text').value.trim();
    if(!text) return alert("내용을 입력해주세요.");

    // 닉네임 안전장치
    const authorName = currentUserProfile ? currentUserProfile.nickname : currentUser.displayName;

    db.collection('posts').add({
        emotion: selectedEmo,
        text: text,
        author: authorName,
        authorId: currentUser.uid,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        colorIdx: Math.floor(Math.random() * 5)
    }).then(() => {
        writeModal.classList.add('hidden');
        showToast("기록되었습니다!");
    });
});

function loadPosts() {
    db.collection('posts').where('date', '>=', todayMidnight).orderBy('date', 'desc').onSnapshot(snapshot => {
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

function openDetail(id, data) {
    currentDocId = id;
    document.getElementById('view-emotion').textContent = data.emotion;
    document.getElementById('view-text').textContent = data.text;
    document.getElementById('view-author').textContent = `작성자: ${data.author}`;
    
    const deleteBtn = document.getElementById('delete-btn');
    if (data.authorId === currentUser.uid || isAdmin) {
        deleteBtn.classList.remove('hidden');
    } else {
        deleteBtn.classList.add('hidden');
    }
    viewModal.classList.remove('hidden');
    loadComments(id);
}

document.getElementById('delete-btn').addEventListener('click', () => {
    if(confirm("정말 삭제하시겠습니까?")) {
        db.collection('posts').doc(currentDocId).delete().then(() => {
            viewModal.classList.add('hidden');
            showToast("삭제되었습니다.");
        });
    }
});

document.getElementById('submit-comment').addEventListener('click', () => {
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if(!text) return;

    const authorName = currentUserProfile ? currentUserProfile.nickname : currentUser.displayName;

    db.collection('posts').doc(currentDocId).collection('comments').add({
        text: text,
        author: authorName,
        authorId: currentUser.uid,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
});

function loadComments(id) {
    const list = document.getElementById('comments-list');
    db.collection('posts').doc(id).collection('comments').orderBy('date').onSnapshot(shot => {
        list.innerHTML = '';
        shot.forEach(d => {
            const c = d.data();
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `<span style="font-weight:bold">${c.author}:</span> ${c.text}`;
            if (c.authorId === currentUser.uid || isAdmin) {
                const delBtn = document.createElement('i');
                delBtn.className = 'fas fa-times';
                delBtn.style.cssText = 'color:#ff6b6b; cursor:pointer; margin-left:10px; font-size:0.8rem;';
                delBtn.onclick = function() {
                    if(confirm('댓글을 지울까요?')) db.collection('posts').doc(id).collection('comments').doc(d.id).delete();
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