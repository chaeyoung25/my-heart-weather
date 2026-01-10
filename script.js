// 1. 사용자님의 파이어베이스 키 설정 (완료!)
const firebaseConfig = {
  apiKey: "AIzaSyA-gj2lPOdcsAm0B14d5HRFq7E2KDDXEKo",
  authDomain: "heart-weather-1f20a.firebaseapp.com",
  projectId: "heart-weather-1f20a",
  storageBucket: "heart-weather-1f20a.firebasestorage.app",
  messagingSenderId: "665410309658",
  appId: "1:665410309658:web:950106a5d20ff593e64ba3"
};

// 2. 파이어베이스 시작
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 3. 화면의 요소들 가져오기
const board = document.getElementById('board-container');
const fab = document.getElementById('fab-write');
const writeModal = document.getElementById('write-modal');
const viewModal = document.getElementById('view-modal');
const closeWrite = document.getElementById('close-write');
const closeView = document.getElementById('close-view');
const submitPost = document.getElementById('submit-post');
const postText = document.getElementById('post-text');
const toast = document.getElementById('toast');
let selectedEmo = '☀️';
let currentDocId = null;

// 4. 글쓰기 버튼 누르면 창 열기
fab.addEventListener('click', () => {
    writeModal.classList.remove('hidden');
    postText.value = ''; // 입력창 비우기
});

// 닫기 버튼들
closeWrite.addEventListener('click', () => writeModal.classList.add('hidden'));
closeView.addEventListener('click', () => viewModal.classList.add('hidden'));

// 5. 감정 이모지 선택하기
document.querySelectorAll('.emo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 다른 버튼 선택 해제
        document.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
        // 누른 버튼 선택 표시
        btn.classList.add('selected');
        // 감정 값 저장
        selectedEmo = btn.dataset.val;
    });
});

// 6. [내 마음 붙이기] 버튼 누르면 저장하기
submitPost.addEventListener('click', () => {
    if(!postText.value) return alert('마음의 이야기를 조금만 적어주세요!');
    
    // 데이터베이스에 저장
    db.collection('posts').add({
        emotion: selectedEmo,
        text: postText.value,
        date: firebase.firestore.FieldValue.serverTimestamp(), // 현재 시간
        colorIdx: Math.floor(Math.random() * 5) // 랜덤 포스트잇 색상 (0~4)
    }).then(() => {
        // 성공하면 창 닫고 알림 띄우기
        writeModal.classList.add('hidden');
        showToast("마음이 날씨지도에 기록되었어요!");
    }).catch((error) => {
        console.error("에러 발생:", error);
        alert("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    });
});

// 7. 실시간으로 글 불러오기 (화면에 표시)
db.collection('posts').orderBy('date', 'desc').onSnapshot(snapshot => {
    board.innerHTML = ''; // 화면 비우고 다시 그리기
    snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement('div');
        
        // 포스트잇 만들기
        div.className = `post-it color-${data.colorIdx}`;
        div.innerHTML = `
            <div class="post-emoji">${data.emotion}</div>
            <div class="post-text">${data.text}</div>
            <div class="post-meta">👆 눌어서 댓글보기</div>
        `;
        
        // 포스트잇 누르면 상세보기 열기
        div.addEventListener('click', () => openDetail(doc.id, data));
        board.appendChild(div);
    });
});

// 8. 상세보기 & 댓글 불러오기
function openDetail(id, data) {
    currentDocId = id;
    document.getElementById('view-emotion').textContent = data.emotion;
    document.getElementById('view-text').textContent = data.text;
    viewModal.classList.remove('hidden');
    loadComments(id);
}

// 댓글 목록 가져오기
function loadComments(id) {
    const list = document.getElementById('comments-list');
    // 해당 글(id)의 댓글들을 시간순으로 가져오기
    db.collection('posts').doc(id).collection('comments').orderBy('date').onSnapshot(shot => {
        list.innerHTML = '';
        shot.forEach(d => {
            const c = d.data();
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            commentDiv.innerText = `익명: ${c.text}`;
            list.appendChild(commentDiv);
        });
    });
}

// 9. 댓글 전송하기
document.getElementById('submit-comment').addEventListener('click', () => {
    const input = document.getElementById('comment-input');
    if(!input.value) return; // 내용 없으면 중단
    
    // 댓글 저장
    db.collection('posts').doc(currentDocId).collection('comments').add({
        text: input.value,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = ''; // 입력창 비우기
});

// 10. 알림 메시지(토스트) 띄우기
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    // 3초 뒤에 사라짐
    setTimeout(() => toast.classList.add('hidden'), 3000);
}