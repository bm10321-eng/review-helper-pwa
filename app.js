const $ = s => document.querySelector(s);
const defaults = [{name:'',note:''},{name:'',note:''},{name:'',note:''}];
let stores = JSON.parse(localStorage.getItem('review-helper-stores') || 'null') || defaults;
let activeStore = 0, rating = 5, deferredPrompt;
let replyHistory = [];
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
function analyze(text){
  const match=(p)=>{p.lastIndex=0;return p.test(text);};
  return { menus:menuWords.filter(m=>text.includes(m)).slice(0,3), positive:positiveRules.filter(([,p])=>match(p)).map(([id])=>id), negative:negativeRules.filter(([,p])=>match(p)).map(([id])=>id), playful:/ㅋㅋ|ㅎㅎ|크흣|존맛|순삭|미쳤|대박|완전/.test(text), revisit:/다음(에|에도)?.{0,10}(주문|시킬|갈|방문)|또\s*(주문|시킬|갈|먹)|재주문|재방문|정착/.test(text), child:/(아이|애들|아기|아이가|아이들)/.test(text), family:/(가족|남편|아내|엄마|아빠|친구)/.test(text), first:/(첫 주문|처음 주문|첫번째)/.test(text), surprise:/(생각보다|놀랐|깜짝|엄청|진짜)/.test(text), long:text.length>90 };
}
function intro(name){ return `${(name || '고객').trim()}님,`; }
function positiveReply(a,text,tone){
  const p=a.positive, menu=a.menus[0] ? `${a.menus[0]} ` : '';
  const voice={warm:['말씀 덕분에 저희도 절로 미소가 나네요!','기분 좋게 드셨다는 마음이 고스란히 전해져요!'],bright:['이렇게 반가운 후기는 언제나 힘이 납니다!','맛있게 즐겨주셨다니 오늘도 에너지 충전이에요!'],calm:['좋게 이용해 주셨다니 감사드립니다.','만족하셨다니 준비한 보람이 큽니다.']}[tone];
  if(p.includes('return')) return pick(['오랜만에 드셔도 맛있었다고 해주시니 더 반갑고 뿌듯합니다!','다시 생각나서 찾아주셨다는 말이 정말 반갑네요!','재주문해 주시고 맛있게 드셔주셨다니 큰 힘이 됩니다!']);
  if(p.includes('spicy')) return pick(['매운맛을 제대로 즐겨주신 것 같아 뿌듯합니다!','얼큰한 맛이 입맛에 맞으셨다니 정말 다행이에요!']);
  if(p.includes('crisp')) return pick(['바삭한 식감까지 알아봐 주셔서 기분 좋네요!','튀김의 바삭함을 맛있게 즐겨주셨다니 감사합니다!']);
  if(p.includes('soft') && p.includes('sauce')) return pick(['식감과 소스 조합까지 입맛에 맞으셨다니 정말 반갑습니다!','부드러운 식감과 소스를 함께 좋아해 주셔서 뿌듯해요!']);
  if(p.includes('soft')) return pick(['부드러운 식감으로 맛있게 드셨다니 다행이에요!','식감까지 만족하셨다니 감사한 마음입니다!']);
  if(p.includes('sauce')) return pick(['소스가 취향에 잘 맞으셨다니 저희도 뿌듯합니다!','양념까지 맛있게 즐겨주셨다니 감사합니다!']);
  if(p.includes('quantity')) return pick(['든든하게 드셨다니 저희도 기분 좋네요!','푸짐한 한 끼가 되었다니 정말 다행이에요!']);
  if(p.includes('taste')) return pick([`${menu}맛있게 드셔주셨다니 준비한 보람이 큽니다!`,`${menu}맛있다는 말씀에 저희도 힘이 납니다!`]);
  if(p.includes('price')) return pick(['가격까지 좋게 봐주셔서 감사합니다!','가성비 좋게 즐겨주셨다니 기쁩니다!']);
  if(p.includes('delivery')) return pick(['배달도 만족스럽게 받아보셨다니 다행이에요!','기다림 없이 맛있게 받아보셨다니 감사합니다!']);
  if(p.includes('packaging')) return pick(['포장 상태까지 꼼꼼히 봐주셔서 감사합니다!','깔끔하게 받아보셨다니 안심이 됩니다!']);
  if(p.includes('service')) return pick(['친절하게 느껴주셨다니 저희도 정말 기분 좋습니다!','좋은 마음으로 이용해 주셔서 감사합니다!']);
  return text.length<18 ? pick([...voice,'짧지만 따뜻한 한마디에 저희도 웃음이 나네요!']) : pick([...voice,'남겨주신 말씀을 읽으니 저희도 기분이 좋아집니다!']);
}
function specificReply(a,text){
  const menu=a.menus[0]||'';
  if(a.child) return pick(['아이들이 맛있게 먹었다는 말이 제일 반갑네요. 한 끼 챙기신 보람이 있으셨으면 좋겠습니다!','아이들 입맛에도 맞았다니 이건 정말 기분 좋은 소식이에요!']);
  if(a.family) return pick(['함께 드신 분들까지 맛있게 즐기셨다니 더없이 반갑습니다!','같이 드신 분들도 좋아해 주셨다니 저희도 괜히 기분이 좋아지네요.']);
  if(a.first) return pick(['첫 주문이 좋은 기억으로 남으신 것 같아 마음이 놓입니다!','처음 찾아주신 날에 입맛에 맞으셨다니 특히 반갑네요!']);
  if(a.surprise&&a.positive.includes('quantity')) return pick(['예상보다 든든하셨다니 제대로 한 끼가 되었나 봐요ㅎㅎ','양에서 한 번 놀라셨다니, 맛있게 비우셨다면 저희도 뿌듯합니다!']);
  if(a.surprise&&a.positive.includes('taste')) return pick([`${menu?`${menu} 맛이 `:'맛이 '}기대 이상이셨나 봐요. 이 말씀은 정말 힘이 됩니다!`,'생각보다 더 맛있게 드셨다니 저희도 괜히 신납니다!']);
  if(a.playful) return pick(['표현이 너무 생생해서 저희도 웃으며 읽었어요ㅎㅎ','제대로 즐겨주신 느낌이 전해져서 괜히 웃음이 나네요!']);
  return '';
}
function detailReply(a,tone){
  if(a.revisit||a.positive.includes('return')) return pick(['다음에도 생각나실 때마다 반갑게 맞이하겠습니다!','다음 주문도 기분 좋은 한 끼가 되도록 잘 준비할게요!']);
  if(a.menus.length) return pick([`${a.menus[0]}도 늘 한결같이 맛있게 준비하겠습니다!`,`다음에도 ${a.menus[0]} 맛있게 챙겨드릴게요!`]);
  return tone==='bright'?pick(['든든한 한 끼가 되셨다니 저희도 정말 기뻐요!','맛있게 드신 이야기에 오늘도 힘이 납니다!']):pick(['남겨주신 따뜻한 말씀에 감사드립니다.','만족스러운 식사가 되셨다니 기쁘게 생각합니다.']);
}
function negativeReply(a){ const p=a.negative; if(p.includes('delivery')) return pick(['배달이 늦어 기다리게 해드린 점 진심으로 죄송합니다.','기다리신 시간이 길어 불편을 드린 점 사과드립니다.']); if(p.includes('missing')) return pick(['주문 구성에 누락이 있어 불편을 드린 점 죄송합니다.','빠진 구성으로 실망을 드린 점 진심으로 죄송합니다.']); if(p.includes('packaging')) return pick(['포장 문제로 불편을 드린 점 진심으로 죄송합니다.','포장 상태가 기대에 미치지 못해 죄송합니다.']); if(p.includes('temperature')) return pick(['음식이 식은 상태로 도착했다니 많이 아쉬우셨을 것 같아요. 죄송합니다.','따뜻하게 드시지 못하게 해드린 점 죄송합니다.']); if(p.includes('quality')) return pick(['음식 상태가 기대에 미치지 못해 실망을 드린 점 죄송합니다.','맛과 상태로 불쾌함을 드린 점 진심으로 사과드립니다.']); if(p.includes('service')) return pick(['응대에서 불편을 드린 점 진심으로 죄송합니다.','편안하게 이용하지 못하신 점 사과드립니다.']); return ''; }
function negativeFollowup(){return pick(['말씀해 주신 내용은 바로 확인해 같은 일이 없도록 개선하겠습니다.','남겨주신 지적을 가볍게 넘기지 않고 조리와 포장 과정을 다시 점검하겠습니다.','소중한 의견을 바탕으로 더 세심히 살피겠습니다.']);}
function closing(a,tone){ if(a.revisit || a.positive.includes('return')) return pick(['다음에는 더 자주 생각나실 수 있게 맛있게 준비해둘게요!','또 생각나실 때 반갑게 맞이하겠습니다!','다음 주문도 기분 좋게 드실 수 있도록 잘 준비해둘게요!']); if(tone==='bright') return pick(['다음 한 끼도 맛있게 준비해둘게요!','다음에도 신나게 맛있는 한 끼 챙겨드릴게요!']); if(tone==='calm') return pick(['다음에도 만족스러운 한 끼가 되도록 잘 준비하겠습니다.','다음 주문도 정성껏 준비하겠습니다.']); return pick(['다음에도 맛있게 드실 수 있게 준비해둘게요!','다음에도 기분 좋은 한 끼가 되도록 노력하겠습니다!']); }
function decorate(sentences,a,negative){ if(negative) return sentences.join(' '); const icons=a.playful?emoji.playful:emoji.happy; return sentences.map((s,i)=>`${s} ${i===0?pick(icons):pick(emoji.happy)}`).join(' '); }
function generate(){
  const text=$('#reviewText').value.trim(), name=$('#customerName').value.trim(), tone=$('#tone').value;
  if(!text){$('#result').value=`${intro(name)} 별점으로 남겨주신 마음 감사합니다 ${pick(emoji.calm)}`;return;}
  const a=analyze(text), bad=negativeReply(a), length=$('#replyLength').value;
  let result='';
  for(let attempt=0;attempt<8;attempt++){
    const parts=[intro(name)];
    if(bad){
      parts.push(bad);
      if(length!=='short')parts.push(negativeFollowup());
      if(length==='long'&&a.positive.length)parts.push(positiveReply(a,text,tone));
    } else {
      const specific=specificReply(a,text);
      const opening=pick([positiveReply(a,text,tone),specific||positiveReply(a,text,tone)]);
      parts.push(opening);
      if(length!=='short'&&specific&&opening!==specific)parts.push(specific);
      if(length!=='short')parts.push(detailReply(a,tone));
      if(length==='long')parts.push(closing(a,tone));
    }
    result=decorate(parts,a,Boolean(bad));
    if(!replyHistory.includes(result))break;
  }
  replyHistory=[result,...replyHistory].slice(0,30);
  $('#result').value=result;
}
function cleanOcrLine(line){ return line.replace(/[•·]/g,' ').replace(/\s+/g,' ').trim(); }
function isName(line){ return /^[가-힣A-Za-z0-9][가-힣A-Za-z0-9._-]{1,19}$/.test(line) && !ignoreLine.test(line) && !/^(오늘|최근|리뷰|별점|주문)$/.test(line); }
function findNickname(entries,allText=''){
  const direct=allText.match(/([가-힣A-Za-z0-9._-]{2,20})\s*[>〉]/);
  if(direct&&!ignoreLine.test(direct[1]))return direct[1];
  const meta=/리뷰\s*\d+|평균\s*별점|최근\s*\d+번|오늘|어제|지난\s*달|알뜰배달|한집배달|별점|★|☆/;
  const firstMeta=entries.filter(line=>meta.test(line.text)).sort((a,b)=>a.box.y0-b.box.y0)[0];
  if(!firstMeta)return '';
  const metaHeight=Math.max(20,firstMeta.box.y1-firstMeta.box.y0);
  const candidates=entries.filter(line=>isName(line.text)&&line.box.y0<firstMeta.box.y0&&firstMeta.box.y0-line.box.y1<metaHeight*5.5).sort((a,b)=>b.box.y0-a.box.y0);
  return candidates[0]?candidates[0].text.replace(/[>〉].*/, '').trim():'';
}
function parseReviewOcr(data){
  const entries=(data.lines||[]).map(line=>({text:cleanOcrLine(line.text||''),box:line.bbox||{x0:0,y0:0,x1:0,y1:0}})).filter(line=>line.text);
  const allText=data.text||entries.map(line=>line.text).join('\n');
  let name=findNickname(entries,allText), nameLine=name?entries.find(line=>line.text.includes(name)):null;
  const meta=/리뷰\s*\d+|평균\s*별점|최근\s*\d+번|오늘|어제|지난\s*달|알뜰배달|한집배달|별점|★|☆/;
  const anchor=entries.filter(line=>meta.test(line.text)&&(!nameLine||line.box.y0>=nameLine.box.y0)).sort((a,b)=>b.box.y1-a.box.y1)[0];
  if(!anchor)return {name,review:''};
  const imageHeight=Math.max(...entries.map(line=>line.box.y1),anchor.box.y1); const maxStartGap=Math.max(90,imageHeight*.18);
  const candidate=entries.filter(line=>line.box.y0>anchor.box.y1&&!meta.test(line.text)&&!ignoreLine.test(line.text)&&!/^(김치찜|치킨|피자|국밥|떡볶이|족발|보쌈|\d+(\.\d+)?인)/.test(line.text)).sort((a,b)=>a.box.y0-b.box.y0);
  const first=candidate.find(line=>line.box.y0-anchor.box.y1<maxStartGap);
  if(!first)return {name,review:''};
  const height=Math.max(20,first.box.y1-first.box.y0), review=[first];
  for(const line of candidate){
    if(line===first||line.box.y0<first.box.y0)continue;
    const previous=review[review.length-1];
    if(line.box.y0-previous.box.y1>height*2.8)break;
    review.push(line);
  }
  const text=review.map(line=>line.text).join(' ').replace(/\s+/g,' ').trim().replace(/\s+[0-9Il|,.'`]+$/,'').trim();
  return {name,review:text};
}
async function recoverNickname(file,data){
  const entries=(data.lines||[]).map(line=>({text:cleanOcrLine(line.text||''),box:line.bbox||{x0:0,y0:0,x1:0,y1:0}})).filter(line=>line.text);
  const meta=/리뷰\s*\d+|평균\s*별점|최근\s*\d+번|오늘|어제|지난\s*달|알뜰배달|한집배달|별점|★|☆/;
  const firstMeta=entries.filter(line=>meta.test(line.text)).sort((a,b)=>a.box.y0-b.box.y0)[0];
  if(!firstMeta)return '';
  const bitmap=await createImageBitmap(file), ocrWidth=data.width||bitmap.width, ocrHeight=data.height||bitmap.height;
  const sx=bitmap.width/ocrWidth, sy=bitmap.height/ocrHeight, lineHeight=Math.max(25,firstMeta.box.y1-firstMeta.box.y0);
  const sourceY=Math.max(0,Math.round((firstMeta.box.y0-lineHeight*5.2)*sy)), sourceH=Math.min(bitmap.height-sourceY,Math.round(lineHeight*5.5*sy));
  const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*.82); canvas.height=sourceH;
  canvas.getContext('2d').drawImage(bitmap,0,sourceY,canvas.width,sourceH,0,0,canvas.width,sourceH);
  const retry=await Tesseract.recognize(canvas,'kor+eng');
  const retryEntries=(retry.data.lines||[]).map(line=>({text:cleanOcrLine(line.text||''),box:line.bbox||{x0:0,y0:0,x1:0,y1:0}})).filter(line=>line.text);
  return retryEntries.filter(line=>isName(line.text)).sort((a,b)=>a.box.y0-b.box.y0)[0]?.text||'';
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
$('#ocrButton').onclick=async()=>{if(!window.Tesseract){$('#ocrStatus').textContent='OCR 모듈을 불러오지 못했어요. 이미지 내용을 직접 입력해 주세요.';return;} try{const file=$('#reviewImage').files[0];$('#ocrStatus').textContent='리뷰 카드에서 닉네임·별점·리뷰 내용만 읽는 중이에요…';const [result,stars]=await Promise.all([Tesseract.recognize(file,'kor+eng'),detectStarRating(file)]);const parsed=parseReviewOcr(result.data);if(!parsed.name){$('#ocrStatus').textContent='닉네임 영역을 한 번 더 확인하는 중이에요…';parsed.name=await recoverNickname(file,result.data);}if(parsed.name)$('#customerName').value=parsed.name;$('#reviewText').value=parsed.review||'';if(stars){rating=stars;renderStars();}$('#ocrStatus').textContent=parsed.review?`${parsed.name?'닉네임·':''}리뷰 내용${stars?`·${stars}점`:''}을 입력했어요. 확인 후 답글을 만들어 주세요.`:'리뷰 본문이 없는 카드예요. 닉네임과 별점만 입력했어요.';}catch{$('#ocrStatus').textContent='인식에 실패했어요. 이미지를 다시 선택하거나 직접 입력해 주세요.';}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installButton').hidden=false;});
$('#installButton').onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;$('#installButton').hidden=true;};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');renderStores();renderStars();
const $ = s => document.querySelector(s);
const defaults = [{name:'',note:''},{name:'',note:''},{name:'',note:''}];
let stores = JSON.parse(localStorage.getItem('review-helper-stores') || 'null') || defaults;
let activeStore = 0, rating = 5, deferredPrompt;
let replyHistory = [];
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
function positiveReply(a,text,tone){
  const p=a.positive, menu=a.menus[0] ? `${a.menus[0]} ` : '';
  const voice={warm:['말씀 덕분에 저희도 절로 미소가 나네요!','기분 좋게 드셨다는 마음이 고스란히 전해져요!'],bright:['이렇게 반가운 후기는 언제나 힘이 납니다!','맛있게 즐겨주셨다니 오늘도 에너지 충전이에요!'],calm:['좋게 이용해 주셨다니 감사드립니다.','만족하셨다니 준비한 보람이 큽니다.']}[tone];
  if(p.includes('return')) return pick(['오랜만에 드셔도 맛있었다고 해주시니 더 반갑고 뿌듯합니다!','다시 생각나서 찾아주셨다는 말이 정말 반갑네요!','재주문해 주시고 맛있게 드셔주셨다니 큰 힘이 됩니다!']);
  if(p.includes('spicy')) return pick(['매운맛을 제대로 즐겨주신 것 같아 뿌듯합니다!','얼큰한 맛이 입맛에 맞으셨다니 정말 다행이에요!']);
  if(p.includes('crisp')) return pick(['바삭한 식감까지 알아봐 주셔서 기분 좋네요!','튀김의 바삭함을 맛있게 즐겨주셨다니 감사합니다!']);
  if(p.includes('soft') && p.includes('sauce')) return pick(['식감과 소스 조합까지 입맛에 맞으셨다니 정말 반갑습니다!','부드러운 식감과 소스를 함께 좋아해 주셔서 뿌듯해요!']);
  if(p.includes('soft')) return pick(['부드러운 식감으로 맛있게 드셨다니 다행이에요!','식감까지 만족하셨다니 감사한 마음입니다!']);
  if(p.includes('sauce')) return pick(['소스가 취향에 잘 맞으셨다니 저희도 뿌듯합니다!','양념까지 맛있게 즐겨주셨다니 감사합니다!']);
  if(p.includes('quantity')) return pick(['든든하게 드셨다니 저희도 기분 좋네요!','푸짐한 한 끼가 되었다니 정말 다행이에요!']);
  if(p.includes('taste')) return pick([`${menu}맛있게 드셔주셨다니 준비한 보람이 큽니다!`,`${menu}맛있다는 말씀에 저희도 힘이 납니다!`]);
  if(p.includes('price')) return pick(['가격까지 좋게 봐주셔서 감사합니다!','가성비 좋게 즐겨주셨다니 기쁩니다!']);
  if(p.includes('delivery')) return pick(['배달도 만족스럽게 받아보셨다니 다행이에요!','기다림 없이 맛있게 받아보셨다니 감사합니다!']);
  if(p.includes('packaging')) return pick(['포장 상태까지 꼼꼼히 봐주셔서 감사합니다!','깔끔하게 받아보셨다니 안심이 됩니다!']);
  if(p.includes('service')) return pick(['친절하게 느껴주셨다니 저희도 정말 기분 좋습니다!','좋은 마음으로 이용해 주셔서 감사합니다!']);
  return text.length<18 ? pick([...voice,'짧지만 따뜻한 한마디에 저희도 웃음이 나네요!']) : pick([...voice,'남겨주신 말씀을 읽으니 저희도 기분이 좋아집니다!']);
}
function detailReply(a,tone){
  if(a.revisit||a.positive.includes('return')) return pick(['다음에도 생각나실 때마다 반갑게 맞이하겠습니다!','다음 주문도 기분 좋은 한 끼가 되도록 잘 준비할게요!']);
  if(a.menus.length) return pick([`${a.menus[0]}도 늘 한결같이 맛있게 준비하겠습니다!`,`다음에도 ${a.menus[0]} 맛있게 챙겨드릴게요!`]);
  return tone==='bright'?pick(['다음 한 끼도 맛있게 준비해둘게요!','다음에도 맛있는 메뉴로 기다리고 있을게요!']):pick(['다음에도 만족스러운 한 끼가 되도록 정성껏 준비하겠습니다.','다음 주문도 맛있게 드실 수 있도록 잘 준비하겠습니다.']);
}
function negativeReply(a){ const p=a.negative; if(p.includes('delivery')) return pick(['배달이 늦어 기다리게 해드린 점 진심으로 죄송합니다.','기다리신 시간이 길어 불편을 드린 점 사과드립니다.']); if(p.includes('missing')) return pick(['주문 구성에 누락이 있어 불편을 드린 점 죄송합니다.','빠진 구성으로 실망을 드린 점 진심으로 죄송합니다.']); if(p.includes('packaging')) return pick(['포장 문제로 불편을 드린 점 진심으로 죄송합니다.','포장 상태가 기대에 미치지 못해 죄송합니다.']); if(p.includes('temperature')) return pick(['음식이 식은 상태로 도착했다니 많이 아쉬우셨을 것 같아요. 죄송합니다.','따뜻하게 드시지 못하게 해드린 점 죄송합니다.']); if(p.includes('quality')) return pick(['음식 상태가 기대에 미치지 못해 실망을 드린 점 죄송합니다.','맛과 상태로 불쾌함을 드린 점 진심으로 사과드립니다.']); if(p.includes('service')) return pick(['응대에서 불편을 드린 점 진심으로 죄송합니다.','편안하게 이용하지 못하신 점 사과드립니다.']); return ''; }
function negativeFollowup(){return pick(['말씀해 주신 내용은 바로 확인해 같은 일이 없도록 개선하겠습니다.','남겨주신 지적을 가볍게 넘기지 않고 조리와 포장 과정을 다시 점검하겠습니다.','소중한 의견을 바탕으로 더 세심히 살피겠습니다.']);}
function closing(a,tone){ if(a.revisit || a.positive.includes('return')) return pick(['다음에는 더 자주 생각나실 수 있게 맛있게 준비해둘게요!','또 생각나실 때 반갑게 맞이하겠습니다!','다음 주문도 기분 좋게 드실 수 있도록 잘 준비해둘게요!']); if(tone==='bright') return pick(['다음 한 끼도 맛있게 준비해둘게요!','다음에도 신나게 맛있는 한 끼 챙겨드릴게요!']); if(tone==='calm') return pick(['다음에도 만족스러운 한 끼가 되도록 잘 준비하겠습니다.','다음 주문도 정성껏 준비하겠습니다.']); return pick(['다음에도 맛있게 드실 수 있게 준비해둘게요!','다음에도 기분 좋은 한 끼가 되도록 노력하겠습니다!']); }
function decorate(sentences,a,negative){ if(negative) return sentences.join(' '); const icons=a.playful?emoji.playful:emoji.happy; return sentences.map((s,i)=>`${s} ${i===0?pick(icons):pick(emoji.happy)}`).join(' '); }
function generate(){
  const text=$('#reviewText').value.trim(), name=$('#customerName').value.trim(), tone=$('#tone').value;
  if(!text){$('#result').value=`${intro(name)} 별점으로 남겨주신 마음 감사합니다 ${pick(emoji.calm)}`;return;}
  const a=analyze(text), bad=negativeReply(a), length=$('#replyLength').value;
  let result='';
  for(let attempt=0;attempt<8;attempt++){
    const parts=[intro(name)];
    if(bad){parts.push(bad);if(length!=='short')parts.push(negativeFollowup());if(length==='long'&&a.positive.length)parts.push(positiveReply(a,text,tone));}
    else {parts.push(positiveReply(a,text,tone));if(length!=='short')parts.push(detailReply(a,tone));if(length==='long')parts.push(closing(a,tone));}
    result=decorate(parts,a,Boolean(bad));
    if(!replyHistory.includes(result))break;
  }
  replyHistory=[result,...replyHistory].slice(0,30);
  $('#result').value=result;
}
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
  const candidate=entries.filter(line=>line.box.y0>anchor.box.y1&&!meta.test(line.text)&&!ignoreLine.test(line.text)&&!/^(김치찜|치킨|피자|국밥|떡볶이|족발|보쌈|\d+(\.\d+)?인)/.test(line.text)).sort((a,b)=>a.box.y0-b.box.y0);
  const first=candidate.find(line=>line.box.y0-anchor.box.y1<maxStartGap);
  if(!first)return {name,review:''};
  const height=Math.max(20,first.box.y1-first.box.y0), review=[first];
  for(const line of candidate){
    if(line===first||line.box.y0<first.box.y0)continue;
    const previous=review[review.length-1];
    if(line.box.y0-previous.box.y1>height*2.8)break;
    review.push(line);
  }
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
