/* GitHub Pages → Apps Script: POST 폼과 접수 확인 응답을 사용합니다. */
window.submitAirInquiry = function (snapshot) {
  const endpoint = window.AIR_APP_CONFIG && window.AIR_APP_CONFIG.scriptUrl;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint || '')) return Promise.reject(Error('제출 서버가 연결되지 않았습니다. config.js에 Apps Script 웹앱 주소를 설정해 주세요.'));
  if (location.protocol !== 'https:' && location.origin !== 'http://localhost:8000') return Promise.reject(Error('배포된 GitHub Pages 주소에서 제출해 주세요.'));
  const randomId = () => crypto.randomUUID ? crypto.randomUUID().replaceAll('-', '') : Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, '0')).join('');
  const requestId = randomId();
  const targetName = 'air_submit_' + requestId;
  const popup = window.open('about:blank', targetName, 'width=480,height=500');
  if (!popup) return Promise.reject(Error('팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 뒤 다시 제출해 주세요.'));
  popup.document.body.textContent = '답안과 그래프를 전송하고 있습니다. 이 창을 잠시 열어 두세요.';
  return new Promise((resolve, reject) => {
    const post = document.createElement('form');
    post.method = 'POST'; post.action = endpoint; post.target = targetName; post.hidden = true;
    const input = document.createElement('input'); input.type = 'hidden'; input.name = 'payload';
    input.value = JSON.stringify({...snapshot,requestId,origin:location.origin}); post.append(input); document.body.append(post);
    let finished = false;
    const cleanup = () => { clearTimeout(timer); window.removeEventListener('message',receive); post.remove(); };
    const receive = event => {
      if (!/^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com$/i.test(event.origin) && event.origin !== 'https://script.google.com') return;
      const r=event.data;
      if (!r || r.type !== 'air-inquiry-result' || r.requestId !== requestId || finished) return;
      finished=true; cleanup();
      if (r.ok && r.submissionId === snapshot.submissionId && r.submittedAt) { popup.close(); resolve(r); }
      else reject(Error(r.error || '서버의 접수 확인을 받지 못했습니다.'));
    };
    const timer=setTimeout(()=>{if(finished)return;finished=true;cleanup();reject(Error('접수 확인을 받지 못했습니다. 네트워크와 제출 창을 확인한 뒤 다시 시도하세요. 같은 답안을 다시 보내도 접수 번호가 같으면 중복 저장되지 않습니다.'));},120000);
    window.addEventListener('message',receive);
    try { post.submit(); } catch(e) { finished=true;cleanup();popup.close();reject(e); }
  });
};
