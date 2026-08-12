const $ = s => document.querySelector(s);
const defaults = [{name:'',note:''},{name:'',note:''},{name:'',note:''}];
let stores = JSON.parse(localStorage.getItem('review-helper-stores') || 'null') || defaults;
let activeStore = 0, rating = 5, deferredPrompt;

const menuWords = ['감자튀김','닭강정','치즈볼','볶음밥','떡볶이','치킨','피자','족발','보쌈','국밥','김밥','초밥','라면','파스타','버거','샐러드','튀김','갈비','삼겹살','덮밥','찜','탕','면'];
const positivePatterns = [
 ['crisp',/(감자튀김|튀김|치즈볼).{0,12}(바삭|바삭바삭)/], ['soft',/(닭|고기|치킨|면).{0,12}(부드럽|쫄깃)/], ['sauce',/(소스|양념).{0,12}(취향|제 스타일|입맛|맛있|좋)/],
 ['taste',/(맛있|맛나|존맛|최고|간이 좋|풍미|고소|담백|신선)/], ['quantity',/(양이? (많|푸짐|넉넉)|푸짐|넉넉|양 많)/], ['price',/(가성비|가격.{0,8}(좋|착하|괜찮)|저렴)/],
 ['delivery',/(배달.{0,10}(빠르|빨리|좋|만족)|빨리 왔|일찍 왔)/], ['packaging',/(포장.{0,10}(깔끔|좋|꼼꼼)|꼼꼼하게.{0,5}포장)/], ['service',/(친절|서비스.{0,10}(좋|감사)|사장님.{0,10}(친절|좋)|직원.{0,10}(친절|좋))/]
];
const negativePatterns = [
 ['delivery',/(배달.{0,12}(늦|느리|오래|실망|아쉽)|너무 늦|한참.{0,5}걸)/], ['packaging',/(포장.{0,12}(새|터지|엉망|아쉽)|국물.{0,8}샜)/], ['missing',/(누락|안 왔|빠졌|없었|안 넣)/],
 ['temperature',/(식었|차갑|미지근)/], ['quality',/(눅눅|탔|상했|맛없|별로|실망|아쉽|짜|싱겁)/], ['service',/(불친절|응대.{0,10}(별로|아쉽)|기분.{0,10}나쁘)/]
];
const unique = items => [...new Set(items)];
const hasMatch = (text, pattern) => { pattern.lastIndex = 0; return pattern.test(text); };
function analyze(text) {
 const positive = positivePatterns.filter(([,p])=>hasMatch(text,p)).map(([id])=>id);
 const negative = negativePatterns.filter(([,p])=>hasMatch(text,p)).map(([id])=>id);
 return {menus:menuWords.filter(menu=>text.includes(menu)).slice(0,3),positive:unique(positive),negative:unique(negative),revisit:/다음(에|에도)?.{0,10}(주문|시킬|갈|방문)|또 (주문|시킬|갈|먹)|재주문|재방문/.test(text)};
}
function renderStores() {
 $('#storeTabs').innerHTML=stores.map((store,i)=>`<button class="store-tab ${i===activeStore?'active':''}" data-i="${i}">${store.name||`가게 ${i+1}`}</button>`).join('');
 $('#storeName').value=stores[activeStore].name; $('#storeNote').value=stores[activeStore].note;
 document.querySelectorAll('.store-tab').forEach(button=>button.onclick=()=>{activeStore=+button.dataset.i;renderStores()});
}
function renderStars() {
 $('#stars').innerHTML=[1,2,3,4,5].map(n=>`<button class="star ${n<=rating?'selected':''}" aria-label="${n}점">★</button>`).join('');
 document.querySelectorAll('.star').forEach((button,i)=>button.onclick=()=>{rating=i+1;renderStars()});
}
function positiveSentence(a) {
 const p=a.positive, menu=a.menus[0]||'';
 if(p.includes('crisp')) return '감자튀김의 바삭한 식감까지 알아봐 주셔서 뿌듯합니다.';
 if(p.includes('soft')&&p.includes('sauce')) return '부드러운 식감과 소스가 입맛에 맞으셨다니 정말 기쁩니다.';
 if(p.includes('soft')) return '부드러운 식감으로 드셨다니 다행입니다.';
 if(p.includes('sauce')) return '소스가 입맛에 잘 맞으셨다니 저희도 기분이 좋습니다.';
 if(p.includes('taste')&&p.includes('quantity')) return `${menu?menu+' ':''}맛과 넉넉한 양을 함께 좋게 봐주셨다니 큰 힘이 됩니다.`;
 if(p.includes('taste')) return `${menu?menu+' ':''}맛있게 드셨다니 준비한 보람이 큽니다.`;
 if(p.includes('quantity')) return '양을 넉넉하게 느껴주셨다니 다행입니다.';
 if(p.includes('price')) return '가격까지 만족스럽게 봐주셔서 감사합니다.';
 if(p.includes('delivery')) return '배달도 만족스럽게 받아보셨다니 다행입니다.';
 if(p.includes('packaging')) return '포장 상태를 꼼꼼히 봐주셔서 감사합니다.';
 if(p.includes('service')) return '친절하게 느껴주셨다니 저희도 기분이 좋습니다.';
 return '';
}
function negativeSentence(a) {
 const p=a.negative;
 if(p.includes('delivery')) return '배달이 늦어 기다리게 해드린 점 진심으로 죄송합니다.';
 if(p.includes('missing')) return '주문 구성에 누락이 있어 불편을 드린 점 죄송합니다.';
 if(p.includes('packaging')) return '포장 문제로 불편을 드린 점 진심으로 죄송합니다.';
 if(p.includes('temperature')) return '음식이 식은 상태로 도착해 실망을 드린 점 죄송합니다.';
 if(p.includes('quality')) return '음식 상태가 기대에 미치지 못해 불편을 드린 점 죄송합니다.';
 if(p.includes('service')) return '응대에서 불편을 드린 점 진심으로 죄송합니다.';
 return '';
}
function closing(tone, negative) {
 if(negative) return tone==='calm'?'말씀해 주신 부분은 꼼꼼히 확인해 개선하겠습니다.':'같은 불편이 없도록 꼼꼼히 살피고 개선하겠습니다.';
 if(tone==='bright') return '다음에도 맛있게 드실 수 있게 정성껏 준비해둘게요 😊';
 if(tone==='calm') return '다음에도 만족스러운 한 끼가 되도록 정성껏 준비하겠습니다.';
 return '다음에도 반갑게 맞이하겠습니다 😊';
}
function generate() {
 const text=$('#reviewText').value.trim();
 if(!text){$('#result').value='별점으로 마음 남겨주셔서 감사합니다.';return;}
 const a=analyze(text), positive=positiveSentence(a), negative=negativeSentence(a), sentences=[];
 if(negative){sentences.push(negative,closing($('#tone').value,true));if(positive)sentences.push(positive);}
 else if(positive) sentences.push(positive);
 else sentences.push(rating>=4?'남겨주신 좋은 리뷰 감사히 읽었습니다.':'남겨주신 평가를 가볍게 넘기지 않고 더 세심히 살피겠습니다.');
 if(a.revisit)sentences.push('다음 주문도 반갑게 기다리고 있겠습니다.');
 else if(!negative&&(a.positive.length||rating>=4))sentences.push(closing($('#tone').value,false));
 const limit=$('#replyLength').value==='short'?2:$('#replyLength').value==='medium'?3:4;
 $('#result').value=sentences.slice(0,limit).join(' ');
}
$('#saveStore').onclick=()=>{stores[activeStore]={name:$('#storeName').value.trim(),note:$('#storeNote').value.trim()};localStorage.setItem('review-helper-stores',JSON.stringify(stores));renderStores();alert('가게 정보를 저장했습니다.');};
$('#generate').onclick=generate;
$('#copy').onclick=async()=>{if(!$('#result').value.trim())return;await navigator.clipboard.writeText($('#result').value);$('#copy').textContent='복사됨';setTimeout(()=>$('#copy').textContent='복사',1200);};
$('#reviewImage').onchange=e=>{const f=e.target.files[0];if(!f)return;$('#imagePreview').src=URL.createObjectURL(f);$('#imageArea').hidden=false;};
$('#ocrButton').onclick=async()=>{if(!window.Tesseract){$('#ocrStatus').textContent='OCR 모듈을 불러오지 못했어요. 리뷰를 직접 입력해 주세요.';return;}try{$('#ocrStatus').textContent='이미지에서 글자를 읽는 중이에요…';const result=await Tesseract.recognize($('#reviewImage').files[0],'kor+eng');$('#reviewText').value=result.data.text.trim();$('#ocrStatus').textContent='인식 완료. 문장을 확인·수정한 뒤 생성해 주세요.';}catch{$('#ocrStatus').textContent='인식에 실패했어요. 리뷰를 직접 입력해 주세요.';}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installButton').hidden=false;});
$('#installButton').onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;$('#installButton').hidden=true;};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');renderStores();renderStars();
const $=s=>document.querySelector(s);
const defaults=[{name:'',note:''},{name:'',note:''},{name:'',note:''}];
let stores=JSON.parse(localStorage.getItem('review-helper-stores')||'null')||defaults,activeStore=0,rating=5,deferredPrompt,history=[];
const emoji=['🌿','🍀','✨','🌼','🤍','😊','🍃','🌙','🫶','🌾','🐾','💛'];
const pick=a=>a[Math.floor(Math.random()*a.length)]; const has=(t,a)=>a.some(x=>t.includes(x));
const bank={
 intro:{warm:['안녕하세요, 바쁜 시간에 귀한 후기를 남겨주셔서 진심으로 감사합니다.','한 글자 한 글자 정성껏 남겨주신 리뷰, 감사한 마음으로 읽었습니다.','찾아주신 것도 감사한데 따뜻한 말씀까지 전해주셔서 큰 힘이 됩니다.','주문 후 남겨주신 이야기를 보며 오늘도 더 잘해야겠다는 마음을 다잡습니다.'],calm:['안녕하세요. 이용 경험을 자세히 알려주셔서 감사합니다.','안녕하세요. 소중한 의견을 남겨주셔서 감사드립니다.','안녕하세요. 남겨주신 내용을 차분히 읽어 보았습니다.'],bright:['안녕하세요! 기분 좋은 후기 남겨주셔서 정말 감사합니다 😊','반가운 리뷰를 발견하고 매장 식구들과 기분 좋게 읽었습니다!','찾아주시고 응원까지 보내주셔서 오늘 하루가 든든합니다.']},
 praise:['맛있게 드셨다니 준비한 보람이 가득합니다. 한 끼가 기분 좋은 기억으로 남았다면 저희에게는 그보다 큰 칭찬이 없어요.','메뉴를 좋게 봐주셔서 감사합니다. 다음에도 첫 주문 때의 기대를 지킬 수 있도록 정성껏 준비하겠습니다.','좋은 말씀 덕분에 주방에도 따뜻한 기운이 전해졌습니다. 보내주신 응원 잊지 않고 더 맛있게 보답하겠습니다.','다시 찾고 싶다는 마음이 드셨다면 정말 기쁩니다. 늘 같은 맛과 마음으로 기다리고 있겠습니다.'],
 low:['기대하신 한 끼가 되지 못한 것 같아 정말 죄송합니다. 남겨주신 아쉬움은 변명하지 않고 매장 운영에 반영하겠습니다.','믿고 주문해 주셨을 텐데 만족을 드리지 못해 마음이 무겁습니다. 말씀해 주신 부분을 하나씩 다시 살피겠습니다.','불편하셨을 순간을 생각하면 죄송한 마음뿐입니다. 다음에는 달라진 모습으로 느끼실 수 있도록 꼼꼼히 개선하겠습니다.'],
 delay:['기다리게 해드린 점은 죄송합니다. 조리 시간과 배달 전달 과정 모두 다시 확인해서, 다음에는 더 원활하게 받아보실 수 있도록 하겠습니다.','배달이 늦어지면 음식보다 기다리는 마음이 더 지치실 수 있다는 걸 잘 알고 있습니다. 출고 준비와 전달 과정에 더 신경 쓰겠습니다.'],
 missing:['주문 구성에 빠진 부분이 있었다면 정말 당황스러우셨을 것 같습니다. 주문 시간과 메뉴를 매장에 알려주시면 확인 가능한 범위에서 빠르게 살펴보겠습니다.','기대하신 메뉴가 빠져 있었다면 식사 흐름이 깨지셨을 텐데 죄송합니다. 포장 전 확인 절차를 다시 단단히 점검하겠습니다.'],
 quality:['음식 상태가 기대와 달랐다는 말씀에 마음이 무겁습니다. 조리부터 포장, 출고 직전 확인까지 다시 꼼꼼히 돌아보겠습니다.','따뜻하고 맛있는 상태로 드실 수 있어야 하는데 그러지 못했다면 죄송합니다. 보온과 포장 방식을 세심히 점검하겠습니다.'],
 hygiene:['위생과 관련해 불편을 느끼셨다는 말씀은 가볍게 넘길 수 없습니다. 정확한 확인을 위해 주문 정보와 사진이 있으시면 매장으로 알려 주시고, 확인되는 즉시 필요한 조치를 하겠습니다.','드시는 음식에서 불쾌함을 느끼셨다면 얼마나 당황스러우셨을지 생각합니다. 사실관계를 확인해 위생 관리 과정을 다시 점검하겠습니다.'],
 disputed:['속상하신 마음이 크셨다는 점은 충분히 이해합니다. 다만 리뷰만으로 당시 상황 전체를 단정하기 어려워, 주문 정보와 함께 알려주시면 사실관계를 차분히 확인하고 가능한 도움을 드리겠습니다.','강한 표현 속에도 해결하고 싶은 불편이 담겨 있다고 생각합니다. 확인되지 않은 내용은 섣불리 단정하지 않되, 주문 건을 알려주시면 책임 있게 확인하겠습니다.'],
 service:['응대까지 좋게 봐주셔서 감사합니다. 음식뿐 아니라 주문하시는 순간부터 편안하실 수 있도록 노력하겠습니다.','응대에서 불편을 드렸다면 진심으로 죄송합니다. 말 한마디와 안내 방식부터 다시 살펴 더 편안하게 이용하실 수 있도록 하겠습니다.'],
 positiveClose:['다음에도 믿고 찾으실 수 있도록 기본을 지키며 정성껏 준비하겠습니다.','다음 한 끼에도 반갑게 찾아뵐게요. 감사합니다.','보내주신 마음 오래 기억하고, 더 좋은 맛으로 인사드리겠습니다.'],
 negativeClose:['바로 모든 아쉬움을 되돌릴 수는 없지만, 같은 불편이 반복되지 않도록 하나씩 바꾸겠습니다.','다시 한 번 불편을 드려 죄송합니다. 다음에는 만족스러운 한 끼가 되도록 노력하겠습니다.','소중한 의견을 허투루 넘기지 않겠습니다. 더 나은 모습으로 보답하겠습니다.'],
 extraPositive:['바쁜 하루 중 식사를 맡겨주신 만큼, 매번 믿을 수 있는 한 끼가 되도록 재료와 조리 과정을 세심하게 챙기겠습니다.','좋은 경험을 남겨주신 덕분에 저희도 힘을 얻습니다. 다음번에도 기대하시는 순간을 지킬 수 있도록 노력하겠습니다.'],
 extraNegative:['매장 안에서 미처 보지 못한 불편까지 알려주셔서 감사합니다. 고객님 입장에서 다시 살피고, 작은 부분부터 놓치지 않겠습니다.','남겨주신 말씀을 팀과 공유해 조리·포장·응대 과정에서 개선할 부분을 분명히 확인하겠습니다.']
};
function renderStores(){$('#storeTabs').innerHTML=stores.map((s,i)=>`<button class="store-tab ${i===activeStore?'active':''}" data-i="${i}">${s.name||`가게 ${i+1}`}</button>`).join('');$('#storeName').value=stores[activeStore].name;$('#storeNote').value=stores[activeStore].note;document.querySelectorAll('.store-tab').forEach(b=>b.onclick=()=>{activeStore=+b.dataset.i;renderStores()})}
function renderStars(){$('#stars').innerHTML=[1,2,3,4,5].map(n=>`<button class="star ${n<=rating?'selected':''}" aria-label="${n}점">★</button>`).join('');document.querySelectorAll('.star').forEach((b,i)=>b.onclick=()=>{rating=i+1;renderStars()})}
function uniquePick(a,used){let choices=a.filter(x=>!used.includes(x));return pick(choices.length?choices:a)}
function topicParts(text,star,used){let topics=[];let add=(id,words,lines)=>{if(has(text,words))topics.push({id,lines})};add('누락',['누락','빠졌','안 왔','안왔','잘못','빠짐','없어요','없음'],bank.missing);add('위생',['이물','벌레','머리카락','위생','더럽','비닐','플라스틱'],bank.hygiene);add('강한표현',['환불','사기','신고','최악','말도 안','거짓','억지','고소','장사 접어'],bank.disputed);add('배달',['배달','늦','지연','시간','도착','기사','오래 걸'],bank.delay);add('음식상태',['차갑','식었','식어','눅눅','탄','짜','싱거','맛없','포장','흘렀','터졌'],bank.quality);add('가격·양',['비싸','가격','양이','적어요','적음','가성비'],['가격과 양에 아쉬움을 느끼셨다는 말씀도 소중히 듣겠습니다. 메뉴 구성과 제공 기준을 다시 살피고, 주문하실 때 더 납득하실 수 있도록 개선점을 찾겠습니다.','기대하신 만족감에 비해 부족하게 느껴지셨다면 죄송합니다. 한 끼의 가치가 잘 전달될 수 있도록 메뉴와 구성 모두 점검하겠습니다.']);add('응대',['친절','사장','서비스','응대','불친절','전화'],star>=4?[bank.service[0]]:[bank.service[1]]);return topics.map(t=>uniquePick(t.lines,used));}
function generate(){let text=$('#reviewText').value.trim(),store=stores[activeStore],used=[];let add=a=>{let v=uniquePick(a,used);used.push(v);return v};let details=topicParts(text,rating,used);let hasProblem=details.length>0;let paras=[add(bank.intro[$('#tone').value])];let good=rating>=4&&!hasProblem;paras.push(good?add(bank.praise):add(bank.low));let mode=$('#replyLength').value,limit=mode==='short'?1:mode==='medium'?2:3;details.slice(0,limit).forEach(x=>paras.push(x));if(!details.length&&good)paras.push(add(bank.positiveClose));if(mode==='medium')paras.push(good?add(bank.positiveClose):add(bank.negativeClose));if(mode==='long'){paras.push(good?add(bank.extraPositive):add(bank.extraNegative));paras.push(good?add(bank.positiveClose):add(bank.negativeClose));}let reply=(store.name?store.name+'입니다.\n\n':'')+paras.join('\n\n')+' '+pick(emoji);if(history.includes(reply)&&history.length<30)return generate();history=[reply,...history].slice(0,30);$('#result').value=reply}
$('#saveStore').onclick=()=>{stores[activeStore]={name:$('#storeName').value.trim(),note:$('#storeNote').value.trim()};localStorage.setItem('review-helper-stores',JSON.stringify(stores));renderStores();alert('가게 정보를 저장했습니다.')};$('#generate').onclick=generate;$('#copy').onclick=async()=>{if(!$('#result').value.trim())return;await navigator.clipboard.writeText($('#result').value);$('#copy').textContent='복사됨 ✓';setTimeout(()=>$('#copy').textContent='복사',1200)};
$('#reviewImage').onchange=e=>{const f=e.target.files[0];if(!f)return;$('#imagePreview').src=URL.createObjectURL(f);$('#imageArea').hidden=false};$('#ocrButton').onclick=async()=>{if(!window.Tesseract){$('#ocrStatus').textContent='OCR 모듈을 불러오지 못했어요. 이미지 내용을 직접 입력해 주세요.';return}try{$('#ocrStatus').textContent='이미지에서 글자를 읽는 중이에요…';let r=await Tesseract.recognize($('#reviewImage').files[0],'kor+eng');$('#reviewText').value=r.data.text.trim();$('#ocrStatus').textContent='완료했어요. 인식된 문장을 확인·수정해 주세요.'}catch(e){$('#ocrStatus').textContent='인식에 실패했어요. 직접 입력해 주세요.'}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installButton').hidden=false});$('#installButton').onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;$('#installButton').hidden=true};if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');renderStores();renderStars();
