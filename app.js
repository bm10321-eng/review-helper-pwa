const $ = s => document.querySelector(s);
const defaults = [{name:'',note:''},{name:'',note:''},{name:'',note:''}];
let stores = JSON.parse(localStorage.getItem('review-helper-stores') || 'null') || defaults;
let activeStore = 0, rating = 5, deferredPrompt;
const emoji = { happy:['😊','😆','🥹','💛','🍀','✨','🙌','🫶','💜','🌷'], playful:['😆','ㅋㅋ','🥹','🙌','✨','💛'], calm:['😊','💛','🍀'] };
const menuWords = ['감자튀김','김치찜','닭강정','치즈볼','볶음밥','떡볶이','치킨','피자','족발','보쌈','국밥','김밥','초밥','라면','파스타','버거','샐러드','튀김','갈비','삼겹살','덮밥','찜','탕','면'];
const ignoreLine = /최근\s*리뷰|리뷰\s*노출\s*정책|사장님\s*댓글|최신순|사진\s*리뷰만\s*보기|신고하기|최근\s*\d+번\s*주문|리뷰\s*\d+|평균\s*별점|알뜰배달|오늘[,，]?|주문\s*내역|도움돼요|답글|메뉴\s*더보기/i;
const positiveRules = [
  ['return',/오랜만|다시.*먹|재주문|재방문|또.*시킬|또.*주문|정착/], ['crisp',/(감자튀김|튀김|치즈볼).{0,14}(바삭)/], ['soft',/(닭|고기|치킨|면).{0,14}(부드럽|쫄깃)/],
  ['sauce',/(소스|양념).{0,14}(취향|제 스타일|입맛|맛있|좋)/], ['spicy',/(맵|매운).{0,16}(계속|손이|맛있|중독|좋|들어가)/], ['quantity',/(양이?\s*(많|푸짐|넉넉)|푸짐|넉넉|배 터)/],
  ['taste',/(맛있|맛나|존맛|최고|간이 좋|풍미|고소|담백|신선)/], ['price',/(가성비|가격.{0,8}(좋|착하|괜찮)|저렴)/], ['delivery',/(배달.{0,10}(빠르|빨리|좋|만족)|빨리 왔|일찍 왔)/],
  ['packaging',/(포장.{0,10}(깔끔|좋|꼼꼼)|꼼꼼하게.{0,5}포장)/], ['service',/(친절|서비스.{0,10}(좋|감사)|사장님.{0,10}(친절|좋)|직원.{0,10}(친절|좋))/]
];
const negativeRules = [
  ['delivery',/(배달.{0,12}(늦|느리|오래|실망|아쉽)|너무 늦|한참.{0,5}걸)/], ['packaging',/(포장.{0,12}(새|터지|엉망|아쉽)|국물.{0,8}샜)/], ['missing',/(누락|안 왔|빠졌|없었|안 넣)/],
  ['temperature',/(식었|차갑|미지근)/], ['quality',/(눅눅|탔|상했|맛없|별로|실망|아쉽|짜|싱겁)/], ['service',/(불친절|응대.{0,10}(별로|아쉽)|기분.{0,10}나쁘)/]
];
const unique = a => [...new Set(a)];
const pick = a => a[Math.floor(Math.random() * a.length)];
function renderStores(){ $('#storeTabs').innerHTML=stores.map((s,i)=>`<button class="store-tab ${i===activeStore?'active':''}" data-i="${i}">${s.name||`가게 ${i+1}`}</button>`).join(''); $('#storeName').value=stores[activeStore].name; $('#storeNote').value=stores[activeStore].note; document.querySelectorAll('.store-tab').forEach(b=>b.onclick=()=>{activeStore=+b.dataset.i;renderStores();}); }
function renderStars(){ $('#stars').innerHTML=[1,2,3,4,5].map(n=>`<button class="star ${n<=rating?'selected':''}" aria-label="${n}점">★</button>`).join(''); document.querySelectorAll('.star').forEach((b,i)=>b.onclick=()=>{rating=i+1;renderStars();}); }
function analyze(text){ const match=(p)=>{p.lastIndex=0;return p.test(text);}; return { menus:menuWords.filter(m=>text.includes(m)).slice(0,3), positive:positiveRules.filter(([,p])=>match(p)).map(([id])=>id), negative:negativeRules.filter(([,p])=>match(p)).map(([id])=>id), playful:/ㅋㅋ|ㅎㅎ|크흣|존맛|순삭|미쳤|대박|완전/.test(text), revisit:/다음(에|에도)?.{0,10}(주문|시킬|갈|방문)|또\s*(주문|시킬|갈|먹)|재주문|재방문|정착/.test(text) }; }
function intro(name){ return `${(name || '고객').trim()}님,`; }
function positiveReply(a,text){
  const p=a.positive, menu=a.menus[0] ? `${a.menus[0]} ` : '';
  if(p.includes('return')) return pick(['오랜만에 드셔도 맛있었다고 해주시니 더 반갑고 괜히 뿌듯하네요!','다시 생각나서 찾아주셨다는 말이 정말 반갑네요!','정착 이야기까지 해주시다니 저희도 기분이 한껏 좋아집니다!']);
  if(p.includes('spicy')) return '매운맛에 땀은 나도 계속 손이 가셨다니, 제대로 즐겨주신 것 같아 뿌듯합니다!';
  if(p.includes('crisp')) return '감자튀김의 바삭함까지 콕 집어 알아봐 주셔서 괜히 더 기분 좋네요!';
  if(p.includes('soft') && p.includes('sauce')) return '부드러운 식감에 소스까지 입맛에 딱 맞으셨나 봐요. 이 조합을 좋아해 주시니 정말 반갑습니다!';
  if(p.includes('soft')) return '부드러운 식감으로 드셨다니 다행이에요!';
  if(p.includes('sauce')) return '소스가 취향에 제대로 꽂히셨나 봐요. 저희도 괜히 뿌듯합니다!';
  if(p.includes('quantity')) return '생각보다 든든하게 드신 것 같아 저희도 기분 좋네요!';
  if(p.includes('taste')) return `${menu}맛있게 드셔주셨다니 준비한 보람이 큽니다!`;
  if(p.includes('price')) return '가격까지 좋게 봐주셔서 감사합니다!';
  if(p.includes('delivery')) return '배달도 만족스럽게 받아보셨다니 다행이에요!';
  if(p.includes('packaging')) return '포장 상태까지 꼼꼼히 봐주셔서 감사합니다!';
  if(p.includes('service')) return '친절하게 느껴주셨다니 저희도 정말 기분 좋습니다!';
  return text.length < 18 ? '짧지만 기분 좋은 마음이 전해져서 저희도 웃음이 나네요!' : '남겨주신 말씀을 읽으니 저희도 기분이 좋아집니다!';
}
function negativeReply(a){ const p=a.negative; if(p.includes('delivery')) return '배달이 늦어 기다리게 해드린 점 진심으로 죄송합니다. 기다리신 것도 아쉬우셨을 텐데 더 속상하셨을 것 같아요.'; if(p.includes('missing')) return '주문 구성에 누락이 있어 불편을 드린 점 죄송합니다. 말씀해 주신 부분은 꼭 확인하겠습니다.'; if(p.includes('packaging')) return '포장 문제로 불편을 드린 점 진심으로 죄송합니다. 같은 일이 없도록 포장 과정을 다시 살피겠습니다.'; if(p.includes('temperature')) return '음식이 식은 상태로 도착했다니 많이 아쉬우셨을 것 같아요. 죄송합니다.'; if(p.includes('quality')) return '음식 상태가 기대에 미치지 못해 실망을 드린 점 죄송합니다. 말씀해 주신 부분은 꼼꼼히 확인하겠습니다.'; if(p.includes('service')) return '응대에서 불편을 드린 점 진심으로 죄송합니다. 더 편안하게 이용하실 수 있도록 살피겠습니다.'; return ''; }
function closing(a,tone){ if(a.revisit || a.positive.includes('return')) return pick(['다음에는 더 자주 생각나실 수 있게 맛있게 준비해둘게요!','또 생각나실 때 반갑게 맞이하겠습니다!','다음 주문도 기분 좋게 드실 수 있도록 잘 준비해둘게요!']); if(tone==='bright') return '다음 한 끼도 맛있게 준비해둘게요!'; if(tone==='calm') return '다음에도 만족스러운 한 끼가 되도록 잘 준비하겠습니다.'; return '다음에도 맛있게 드실 수 있게 준비해둘게요!'; }
function decorate(sentences,a,negative){ if(negative) return sentences.join(' '); const icons=a.playful?emoji.playful:emoji.happy; return sentences.map((s,i)=>`${s} ${i===0?pick(icons):pick(emoji.happy)}`).join(' '); }
function generate(){ const text=$('#reviewText').value.trim(), name=$('#customerName').value.trim(); if(!text){$('#result').value=`${intro(name)} 별점으로 남겨주신 마음 감사합니다 ${pick(emoji.calm)}`;return;} const a=analyze(text), bad=negativeReply(a), parts=[]; parts.push(intro(name)); if(bad){parts.push(bad); if(a.positive.length)parts.push(positiveReply(a,text));} else {parts.push(positiveReply(a,text)); parts.push(closing(a,$('#tone').value));} const limit=$('#replyLength').value==='short'?2:$('#replyLength').value==='medium'?3:4; $('#result').value=decorate(parts.slice(0,limit),a,Boolean(bad)); }
function cleanOcrLine(line){ return line.replace(/[•·]/g,' ').replace(/\s+/g,' ').trim(); }
function isName(line){ return /^[가-힣A-Za-z0-9][가-힣A-Za-z0-9._-]{1,19}$/.test(line) && !ignoreLine.test(line) && !/^(오늘|최근|리뷰|별점|주문)$/.test(line); }
function parseReviewOcr(data){
  const entries=(data.lines||[]).map(line=>({text:cleanOcrLine(line.text||''),box:line.bbox||{x0:0,y0:0,x1:0,y1:0}})).filter(line=>line.text);
  const allText=data.text||entries.map(line=>line.text).join('\n'); const nameHit=allText.match(/([가-힣A-Za-z0-9._-]{2,20})\s*[>〉]/);
  let name=nameHit?nameHit[1]:'', nameLine=name?entries.find(line=>line.text.includes(name)):null;
  if(!nameLine){nameLine=entries.find(line=>isName(line.text)&&entries.some(next=>next.box.y0>line.box.y0&&next.box.y0-line.box.y0<220&&/(리뷰\s*\d+|평균\s*별점|오늘|어제|별점|알뜰배달|한집배달|★)/.test(next.text)));if(nameLine)name=nameLine.text.replace(/[>〉].*/, '').trim();}
  const meta=/리뷰\s*\d+|평균\s*별점|최근\s*\d+번|오늘|어제|지난\s*달|알뜰배달|한집배달|별점|★|☆/;
  const anchor=entries.filter(line=>meta.test(line.text)&&(!nameLine||line.box.y0>=nameLine.box.y0)).sort((a,b)=>b.box.y1-a.box.y1)[0];
  if(!anchor)return {name,review:''};
  const imageHeight=Math.max(...entries.map(line=>line.box.y1),anchor.box.y1); const maxStartGap=Math.max(90,imageHeight*.18);
  const allowed=entries.filter(line=>line.box.y0>anchor.box.y1&&line.box.y0-anchor.box.y1<maxStartGap&&!meta.test(line.text)&&!ignoreLine.test(line.text)&&!/^(김치찜|치킨|피자|국밥|떡볶이|족발|보쌈|\d+(\.\d+)?인)/.test(line.text)).sort((a,b)=>a.box.y0-b.box.y0);
  if(!allowed.length)return {name,review:''};
  const first=allowed[0], height=Math.max(20,first.box.y1-first.box.y0); const review=[];
  for(const line of allowed){if(line.box.y0-first.box.y0>height*4||review.length&&line.box.y0-review[review.length-1].box.y1>height*2.2)break;review.push(line);}
  const text=review.map(line=>line.text).join(' ').replace(/\s+/g,' ').trim().replace(/\s+[0-9Il|,.'`]+$/,'').trim();
  return {name,review:text};
}
async function detectStarRating(file){
  const bitmap=await createImageBitmap(file); const canvas=document.createElement('canvas'); const scale=Math.min(1,900/bitmap.width); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale); const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height); const {data}=ctx.getImageData(0,Math.round(canvas.height*.18),canvas.width,Math.round(canvas.height*.52)); const w=canvas.width,h=Math.round(canvas.height*.52), seen=new Uint8Array(w*h), groups=[]; const yellow=i=>data[i]>175&&data[i+1]>115&&data[i+1]<210&&data[i+2]<125&&data[i]-data[i+2]>85;
  for(let p=0;p<w*h;p++){if(seen[p]||!yellow(p*4))continue;let stack=[p],count=0,minX=w,maxX=0,minY=h,maxY=0;seen[p]=1;while(stack.length){const q=stack.pop(),x=q%w,y=(q/w)|0;count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const n of [q-1,q+1,q-w,q+w])if(n>=0&&n<w*h&&!seen[n]&&yellow(n*4)){seen[n]=1;stack.push(n);}}if(count>35&&maxX-minX>7&&maxY-minY>7&&maxX-minX<70&&maxY-minY<70)groups.push({count,minX,minY});}
  return Math.min(5,groups.filter(g=>g.count>70).length);
}
$('#saveStore').onclick=()=>{stores[activeStore]={name:$('#storeName').value.trim(),note:$('#storeNote').value.trim()};localStorage.setItem('review-helper-stores',JSON.stringify(stores));renderStores();alert('가게 정보를 저장했습니다.');};
$('#generate').onclick=generate;
$('#copy').onclick=async()=>{if(!$('#result').value.trim())return;await navigator.clipboard.writeText($('#result').value);$('#copy').textContent='복사됨 ✓';setTimeout(()=>$('#copy').textContent='복사',1200);};
$('#reviewImage').onchange=e=>{const f=e.target.files[0];if(!f)return;$('#imagePreview').src=URL.createObjectURL(f);$('#imageArea').hidden=false;};
$('#ocrButton').onclick=async()=>{if(!window.Tesseract){$('#ocrStatus').textContent='OCR 모듈을 불러오지 못했어요. 이미지 내용을 직접 입력해 주세요.';return;} try{const file=$('#reviewImage').files[0];$('#ocrStatus').textContent='리뷰 카드에서 닉네임·별점·리뷰 내용만 읽는 중이에요…';const [result,stars]=await Promise.all([Tesseract.recognize(file,'kor+eng'),detectStarRating(file)]);const parsed=parseReviewOcr(result.data);if(parsed.name)$('#customerName').value=parsed.name;$('#reviewText').value=parsed.review||'';if(stars){rating=stars;renderStars();}$('#ocrStatus').textContent=parsed.review?`닉네임·리뷰 내용${stars?`·${stars}점`:''}을 입력했어요. 확인 후 답글을 만들어 주세요.`:'리뷰 본문이 없는 카드예요. 닉네임과 별점만 입력했어요.';}catch{$('#ocrStatus').textContent='인식에 실패했어요. 이미지를 다시 선택하거나 직접 입력해 주세요.';}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installButton').hidden=false;});
$('#installButton').onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;$('#installButton').hidden=true;};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');renderStores();renderStars();
